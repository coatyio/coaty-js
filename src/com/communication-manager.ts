/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { Client, connect, IClientPublishOptions } from "mqtt";
import { BehaviorSubject, Observable, Subscriber, Subscription } from "rxjs";
import { filter } from "rxjs/operators";

import {
    CoatyObject,
    CommunicationOptions,
    Container,
    CoreType,
    CoreTypes,
    Device,
    IoActor,
    IoSource,
    User,
    Uuid,
} from "..";
import { IDisposable } from "../runtime/disposable";

import { AdvertiseEvent, AdvertiseEventData } from "./advertise";
import { AssociateEvent, AssociateEventData } from "./associate";
import { CallEvent, CallEventData, ReturnEvent, ReturnEventData } from "./call-return";
import { ChannelEvent, ChannelEventData } from "./channel";
import { CommunicationEvent, CommunicationEventData, CommunicationEventType } from "./communication-event";
import { CommunicationTopic } from "./communication-topic";
import { DeadvertiseEvent, DeadvertiseEventData } from "./deadvertise";
import { DiscoverEvent, DiscoverEventData, ResolveEvent, ResolveEventData } from "./discover-resolve";
import { IoStateEvent } from "./io-state";
import { QueryEvent, QueryEventData, RetrieveEvent, RetrieveEventData } from "./query-retrieve";
import { CompleteEvent, CompleteEventData, UpdateEvent, UpdateEventData } from "./update-complete";

/**
 * Defines all communication states of the Communication Manager.
 */
export enum CommunicationState {
    Offline,
    Online,
}

/**
 * Defines all operating states of the Communication Manager.
 */
export enum OperatingState {
    Initial,
    Started,
    Stopped,
}

/**
 * Provides a set of predefined communication events to transfer Coaty objects
 * between distributed Coaty agents based on publish-subscribe messaging.
 */
export class CommunicationManager implements IDisposable {

    /**
     * Defines the communication protocol version number, a positive integer.
     * Increment this version whenever you add new communication events or make
     * breaking changes to the communication protocol.
     */
    static readonly PROTOCOL_VERSION: number = 3;

    private _options: CommunicationOptions;
    private _client: Client;
    private _isClientConnected: boolean;
    private _associatedUser: User;
    private _associatedDevice: Device;
    private _isDisposed: boolean;
    private _deadvertiseIds: Uuid[];
    private _associateSubscription: Subscription;
    private _discoverDeviceSubscription: Subscription;
    private _discoverIdentitySubscription: Subscription;

    // Represents the current communication state in an observable
    private _state: BehaviorSubject<CommunicationState>;

    // Represents the current operating state in an observable
    private _operatingState: BehaviorSubject<OperatingState>;

    // Subscriptions on incoming request events (hashed by event type string)
    private _observedRequests: Map<string, ObservedRequestItem>;

    // Subscriptions on incoming response events (hashed by correlation ID)
    private _observedResponses: Map<Uuid, ObservedResponseItem>;

    // IO points that are observing IO state events
    // (hashed by IO point ID)
    private _ioStateItems: Map<Uuid, IoStateItem>;

    // Own IO sources with their associated topic, actors, and updateRate
    // (hashed by IO source ID)
    private _ioSourceItems: Map<Uuid, [string, Uuid[], number]>;

    // Own IO actors with associated sources (hashed by topic)
    private _ioActorItems: Map<string, Map<Uuid, Uuid[]>>;

    // Own IO actors with their associated Observable for subscription
    // (hashed by IO actor ID)
    private _ioValueItems: Map<Uuid, AnyValueItem>;

    // Support deferred pub/sub on client (re)connection
    private _deferredPublications: Array<{
        topic: string,
        payload: any,
        options: IClientPublishOptions,
        isAdvertiseIdentity: boolean,
        isAdvertiseDevice: boolean,
    }>;
    private _deferredSubscriptions: string[];

    /**
     * @internal - For use in framework only.
     */
    constructor(private _container: Container, options: CommunicationOptions) {
        this._isClientConnected = false;
        this._initOptions(options);
        this._isDisposed = false;
        this._state = new BehaviorSubject(CommunicationState.Offline);
        this._operatingState = new BehaviorSubject(OperatingState.Initial);
        this._initClient();
    }

    /**
     * Gets the container's Runtime object.
     */
    get runtime() {
        return this._container.runtime;
    }

    /**
     * Gets the the communication manager's options as specified in the
     * configuration options.
     */
    get options() {
        return this._options;
    }

    /**
     * Starts this communication manager with the communication options
     * specified in the configuration. This is a noop if the communication
     * manager has already been started.
     */
    start() {
        if (!this._client) {
            this._initOptions();
            this._startClient();
        }
    }

    /**
     * Restarts this communication manager with the specified options.
     * To be used to switch connection from the backend broker to a
     * hub broker or after the runtime user/device association has changed.
     *
     * @param options the new communication options to be used for a restart
     */
    restart(options?: CommunicationOptions) {
        this._endClient(() => {
            this._initOptions(options);
            this._startClient();
        });
    }

    /**
     * Stops dispatching and emitting events by disconnecting from the message
     * broker. The returned promise is resolved when the communication manager
     * has disconnected.
     */
    stop(): Promise<any> {
        return new Promise<any>(resolve => {
            this._endClient(() => resolve());
        });
    }

    /**
     * Observe communication state changes.
     *
     * When subscribed the observable immediately emits the current
     * communication state.
     *
     * @returns an observable emitting communication states
     */
    observeCommunicationState(): Observable<CommunicationState> {
        return this._state.asObservable();
    }

    /**
     * Observe operating state changes.
     *
     * When subscribed the observable immediately emits the current operating
     * state.
     * 
     * @returns an observable emitting operating states
     */
    observeOperatingState(): Observable<OperatingState> {
        return this._operatingState.asObservable();
    }

    /**
     * Observe Discover events.
     *
     * @returns an observable emitting incoming Discover events
     */
    observeDiscover(): Observable<DiscoverEvent> {
        return this._observeRequest(CommunicationEventType.Discover) as Observable<DiscoverEvent>;
    }

    /**
     * Observe Query events.
     *
     * @returns an observable emitting incoming Query events
     */
    observeQuery(): Observable<QueryEvent> {
        return this._observeRequest(CommunicationEventType.Query) as Observable<QueryEvent>;
    }

    /**
     * Observe Update events.
     *
     * @returns an observable emitting incoming Update events
     */
    observeUpdate(): Observable<UpdateEvent> {
        return this._observeRequest(CommunicationEventType.Update) as Observable<UpdateEvent>;
    }

    /**
     * Observe Call events for the given operation and context object.
     *
     * The operation must be a non-empty string that does not contain the
     * following characters: `NULL (U+0000)`, `# (U+0023)`, `+ (U+002B)`, `/
     * (U+002F)`.
     *
     * The given context object is matched against the context filter specified
     * in incoming Call event data to determine whether the Call event should be
     * emitted or skipped by the observable. A Call event is skipped if and only
     * if a context filter and a context object are *both* specified and they do
     * not match (checked by using `ObjectMatcher.matchesFilter`). In all other
     * cases, the Call event is emitted.
     *
     * @param operation the name of the operation to be invoked
     * @param context a context object to be matched against the Call event
     * data's context filter (optional)
     * @returns an observable emitting incoming Call events whose context filter
     * matches the given context
     */
    observeCall(operation: string, context?: CoatyObject): Observable<CallEvent> {
        if (!CommunicationTopic.isValidEventTypeFilter(operation)) {
            throw new TypeError(`${operation} is not a valid operation name`);
        }
        return (this._observeRequest(CommunicationEventType.Call, operation) as Observable<CallEvent>)
            .pipe(filter(event => event.data.matchesFilter(context)));
    }

    /**
     * Observe Advertise events for the given core type.
     *
     * @param coreType core type of objects to be observed.
     * @returns an observable emitting incoming Advertise events
     */
    observeAdvertiseWithCoreType(coreType: CoreType): Observable<AdvertiseEvent> {
        return this._observeAdvertise(coreType);
    }

    /**
     * Observe Advertise events for the given object type.
     *
     * @param objectType object type of objects to be observed.
     * @returns an observable emitting incoming Advertise events
     */
    observeAdvertiseWithObjectType(objectType: string): Observable<AdvertiseEvent> {
        return this._observeAdvertise(undefined, objectType);
    }

    /**
     * Observe Deadvertise events.
     *
     * @param eventTarget target for which Deadvertise events should be emitted
     * @returns an observable emitting incoming Deadvertise events
     */
    observeDeadvertise(): Observable<DeadvertiseEvent> {
        return this._observeRequest(CommunicationEventType.Deadvertise) as Observable<DeadvertiseEvent>;
    }

    /**
     * Observe Channel events for the given channel identifier.
     *
     * The channel identifier must be a non-empty string that does not contain
     * the following characters: `NULL (U+0000)`, `# (U+0023)`, `+ (U+002B)`, `/
     * (U+002F)`.
     *
     * @param channelId a channel identifier
     * @returns an observable emitting incoming Channel events
     */
    observeChannel(channelId: string): Observable<ChannelEvent> {
        if (!CommunicationTopic.isValidEventTypeFilter(channelId)) {
            throw new TypeError(`${channelId} is not a valid channel identifier`);
        }
        return this._observeRequest(CommunicationEventType.Channel, channelId) as Observable<ChannelEvent>;
    }

    /**
     * Observe incoming messages on raw MQTT subscription topics.
     *
     * The observable returned by calling `observeRaw` emits messages as tuples
     * including the actual published topic and the payload. Payload is
     * represented as `Uint8Array` (`Buffer` in Node.js) and needs to be parsed
     * by the application. Use the `toString` method on a payload to convert the
     * raw data to an UTF8 encoded string.
     *
     * Used to interoperate with external MQTT clients that publish messages on
     * raw (usually non-Coaty) topics.
     *
     * Note that the returned observable is *shared* among all raw topic
     * observers. This basically means that the observable will emit messages
     * for *all* observed raw subscription topics, not only for the one
     * specified in a single method call. Thus, you should always pipe the
     * observable through an RxJS `filter` operator to filter out the messages
     * associated with the given subscription topic.
     *
     * ```ts
     * import { filter } from "rxjs/operators";
     *
     * this.communicationManager
     *    .observeRaw("$SYS/#")
     *    .pipe(filter(([topic,]) => topic.startsWith("$SYS/")))
     *    .subscribe(([topic, payload]) => {
     *        console.log(`Received topic ${topic} with payload ${payload.toString()}`);
     *    });
     * ```
     *
     * @remarks
     * Observing raw subscription topics does *not* suppress observation of
     * non-raw communication event types by the communication manager: If at
     * least one raw topic is observed, the communication manager first
     * dispatches *any* incoming message to *all* raw message observers. Then,
     * event dispatching continues as usual by handling all non-raw
     * communication event types which are observed.
     *
     * The specified subscription topic must be a valid MQTT subscription topic.
     * It must not contain the character `NULL (U+0000)`.
     *
     * @param topicFilter the subscription topic
     * @returns an observable emitting any incoming messages as tuples
     * containing the actual topic and the payload as Uint8Array (Buffer in
     * Node.js)
     */
    observeRaw(topicFilter: string): Observable<[string, Uint8Array]> {
        if (typeof topicFilter !== "string" ||
            topicFilter.length === 0 ||
            topicFilter.indexOf("\u0000") !== -1) {
            throw new TypeError(`${topicFilter} is not a valid subscription topic`);
        }

        return this._observeRequest(CommunicationEventType.Raw, topicFilter) as Observable<any>;
    }

    /**
     * Observe IO state events for the given IO source or actor. 
     *
     * When subscribed the subject immediately emits the current association
     * state.
     *
     * @returns a subject emitting IO state events for the given IO source or
     * actor
     */
    observeIoState(ioPoint: IoSource | IoActor): BehaviorSubject<IoStateEvent> {
        return this._observeIoState(ioPoint.objectId);
    }

    /**
     * Observe IO values for the given IO actor.
     *
     * @returns an observable emitting incoming values for the IO actor
     */
    observeIoValue(ioActor: IoActor): Observable<any> {
        return this._observeIoValue(ioActor.objectId);
    }

    /**
     * Find discoverable objects and receive Resolve events for them.
     *
     * Note that the Discover event is lazily published when the first observer
     * subscribes to the observable.
     *
     * Since the observable never emits a completed or error event, a subscriber
     * should unsubscribe when the observable is no longer needed to release
     * system resources and to avoid memory leaks. After all initial subscribers
     * have unsubscribed no more response events will be emitted on the
     * observable and an error will be thrown on resubscription.
     *
     * @param event the Discover event to be published
     * @returns an observable on which associated Resolve events are emitted
     */
    publishDiscover(event: DiscoverEvent): Observable<ResolveEvent> {
        return this._publishClient(event) as Observable<ResolveEvent>;
    }

    /**
     * Find queryable objects and receive Retrieve events for them.
     *
     * Note that the Query event is lazily published when the first observer
     * subscribes to the observable.
     *
     * Since the observable never emits a completed or error event, a subscriber
     * should unsubscribe when the observable is no longer needed to release
     * system resources and to avoid memory leaks. After all initial subscribers
     * have unsubscribed no more response events will be emitted on the
     * observable and an error will be thrown on resubscription.
     *
     * @param event the Query event to be published
     * @returns an observable on which associated Retrieve events are emitted
     */
    publishQuery(event: QueryEvent): Observable<RetrieveEvent> {
        return this._publishClient(event) as Observable<RetrieveEvent>;
    }

    /**
     * Request or propose partial or full update of the specified object and
     * receive accomplishments.
     *
     * Note that the Update event is lazily published when the first observer
     * subscribes to the observable.
     *
     * Since the observable never emits a completed or error event, a subscriber
     * should unsubscribe when the observable is no longer needed to release
     * system resources and to avoid memory leaks. After all initial subscribers
     * have unsubscribed no more response events will be emitted on the
     * observable and an error will be thrown on resubscription.
     *
     * @param event the Update event to be published
     * @returns an observable of associated Complete events
     */
    publishUpdate(event: UpdateEvent): Observable<CompleteEvent> {
        return this._publishClient(event) as Observable<CompleteEvent>;
    }

    /**
     * Publish a Call event to request execution of a remote operation and
     * receive results.
     *
     * Note that the Call event is lazily published when the first observer
     * subscribes to the observable.
     *
     * Since the observable never emits a completed or error event, a subscriber
     * should unsubscribe when the observable is no longer needed to release
     * system resources and to avoid memory leaks. After all initial subscribers
     * have unsubscribed no more response events will be emitted on the
     * observable and an error will be thrown on resubscription.
     *
     * @param event the Call event to be published
     * @returns an observable of associated Return events
     */
    publishCall(event: CallEvent): Observable<ReturnEvent> {
        return this._publishClient(event, event.operation) as Observable<ReturnEvent>;
    }

    /**
     * Advertise an object.
     *
     * @param event the Advertise event to be published
     */
    publishAdvertise(event: AdvertiseEvent): void {
        const coreType = event.data.object.coreType;
        const objectType = event.data.object.objectType;

        // Publish event with core type filter to satisfy core type observers.
        this._publishClient(event, coreType);

        // Publish event with object type filter to satisfy object type
        // observers unless the advertised object is a core object with a core
        // object type. In this case, core object type observers subscribe on
        // the core type followed by a local filter operation to filter out
        // unwanted objects (see `observeAdvertise`).
        if (CoreTypes.getObjectTypeFor(coreType) !== objectType) {
            this._publishClient(event, CommunicationTopic.EVENT_TYPE_FILTER_SEPARATOR + objectType);
        }

        // Ensure a Deadvertise event/last will is emitted for an advertised Identity or Device.
        if (coreType === "Identity" || coreType === "Device") {
            this._deadvertiseIds.find(id => id === event.data.object.objectId) ||
                this._deadvertiseIds.push(event.data.object.objectId);
        }
    }

    /**
     * Notify subscribers that an advertised object has been deadvertised.
     *
     * @param event the Deadvertise event to be published
     */
    publishDeadvertise(event: DeadvertiseEvent): void {
        this._publishClient(event);
    }

    /**
     * Publish a channel event.
     *
     * @param event the Channel event to be published
     */
    publishChannel(event: ChannelEvent): void {
        this._publishClient(event, event.channelId);
    }

    /**
     * Publish a value on the given topic. Used to interoperate 
     * with external MQTT clients that subscribe on the given topic.
     * 
     * The topic is an MQTT publication topic, i.e. a non-empty string 
     * that must not contain the following characters: `NULL (U+0000)`, 
     * `# (U+0023)`, `+ (U+002B)`.
     *
     * @param topic the topic on which to publish the given payload
     * @param value a payload string or Uint8Array (Buffer in Node.js) to be published on the given topic
     * @param shouldRetain whether to publish a retained message (default false)
     */
    publishRaw(topic: string, value: string | Uint8Array, shouldRetain = false) {
        if (typeof topic !== "string" ||
            topic.length === 0 ||
            topic.indexOf("\u0000") !== -1 ||
            topic.indexOf("#") !== -1 ||
            topic.indexOf("+") !== -1) {
            throw new TypeError(`${topic} is not a valid publication topic`);
        }
        this._getPublisher(topic, value, true, shouldRetain)();
    }

    /**
     * Used by an IO router to associate or disassociate an IO source
     * with an IO actor.
     *
     * @param event the Associate event to be published
     */
    publishAssociate(event: AssociateEvent): void {
        this._publishClient(event);
    }

    /**
     * Send the given IO value sourced from the specified IO source.
     *
     * The value is silently discarded if the IO source is currently not
     * associated with any IO actor.
     */
    publishIoValue(ioSource: IoSource, value: any) {
        this._publishIoValue(ioSource.objectId, value);
    }

    /**
     * Called by an IO router to create a new topic for routing IO values of a
     * given IO source to IO actors.
     *
     * The IO source uses this topic to publish IO values; an IO actor
     * subscribes to this topic to receive the published values.
     *
     * The topic name created is based on the event type `IoValue`. It specifies
     * the associated user and the given IO source ID in the corresponding topic
     * levels. It is guaranteed to not contain wildcard tokens on any topic
     * level.
     *
     * @param ioSource the IO source object
     */
    createIoValueTopic(ioSource: IoSource): string {
        return CommunicationTopic.createByLevels(
            CommunicationManager.PROTOCOL_VERSION,
            CommunicationEventType.IoValue,
            undefined,
            ioSource.objectId,
            this._associatedUser?.objectId,
            this.runtime.newUuid(),
        ).getTopicName();
    }

    /**
     * Perform clean-up side effects, such as unsubscribing, and disconnect from
     * the messaging transport.
     */
    onDispose() {
        if (this._isDisposed) {
            return;
        }

        this._isDisposed = true;
        this._endClient();
    }

    /* Private stuff */

    private _initOptions(options?: CommunicationOptions) {
        options && (this._options = options);

        // Capture state of associated user and device in case it might change 
        // while the communication manager is being online.
        this._associatedUser = CoreTypes.clone<User>(this.runtime.commonOptions?.associatedUser);
        this._associatedDevice = CoreTypes.clone<Device>(this.runtime.commonOptions?.associatedDevice);
    }

    private _updateCommunicationState(newState: CommunicationState) {
        if (this._state.getValue() !== newState) {
            this._state.next(newState);
        }
    }

    private _updateOperatingState(newState: OperatingState) {
        if (this._operatingState.getValue() !== newState) {
            this._operatingState.next(newState);
        }
    }

    private _initClient() {
        this._observedRequests = new Map<string, ObservedRequestItem>();
        this._observedResponses = new Map<Uuid, ObservedResponseItem>();
        this._ioStateItems = new Map<Uuid, IoStateItem>();
        this._ioValueItems = new Map<Uuid, AnyValueItem>();
        this._ioSourceItems = new Map<Uuid, [string, Uuid[], number]>();
        this._ioActorItems = new Map<string, Map<Uuid, Uuid[]>>();
        this._deferredPublications = [];
        this._deferredSubscriptions = [];
        this._deadvertiseIds = [];
    }

    private _startClient() {
        this._deadvertiseIds = [];

        this._observeAssociate();
        this._observeDiscoverDevice();
        this._observeDiscoverIdentity();

        const lastWill = this._advertiseIdentityOrDevice();

        // Determine connection info and options for MQTT client
        const mqttClientOptions = this.options.mqttClientOptions;
        const brokerUrl = this._getBrokerUrl(this.options.brokerUrl, mqttClientOptions);
        const mqttClientOpts: any = {};

        if (mqttClientOptions && typeof mqttClientOptions === "object") {
            Object.assign(mqttClientOpts, mqttClientOptions);
        }

        if (lastWill) {
            mqttClientOpts.will = lastWill;
        }

        mqttClientOpts.clientId = this._brokerClientId;

        // Support for clean/persistent sessions in broker:
        // If you want to receive QOS 1 and 2 messages that were published while your client was offline, 
        // you need to connect with a unique clientId and set 'clean' to false (MQTT.js default is true).
        mqttClientOpts.clean = mqttClientOpts.clean === undefined ? false : mqttClientOpts.clean;

        // Do not support automatic resubscription/republication of topics on reconnection by MQTT.js v2
        // because communication manager provides its own implementation.
        //
        // If connection is broken, do not queue outgoing QoS zero messages.
        mqttClientOpts.queueQoSZero = false;
        // If connection is broken and reconnects, subscribed topics are not automatically subscribed again,
        // because this is handled by separate logic inside CommunicationManager.
        mqttClientOpts.resubscribe = false;

        const client = connect(brokerUrl, mqttClientOpts);

        client.on("connect", (connack) => {
            // Emitted on successful (re)connection.
            this._isClientConnected = true;
            this._onClientConnected(connack);
        });
        client.on("reconnect", () => {
            // Emitted when a reconnect starts.
            this._isClientConnected = false;
            this._onClientReconnect();
        });
        client.on("close", () => {
            // Emitted after a disconnection requested by calling end().
            this._isClientConnected = false;
            this._onClientDisconnected();
        });
        client.on("offline", () => {
            // Emitted when the client goes offline, i.e. when the 
            // connection to the server is closed (for whatever reason)
            // and before the client reconnects.
            this._isClientConnected = false;
            this._onClientOffline();
        });
        client.on("error", (error) => {
            // Emitted when the client cannot connect (i.e.connack rc != 0) 
            // or when a parsing error occurs.
            this._isClientConnected = false;
            this._onClientError(error);
        });
        client.on("message", (topic, payload, packet) => {
            // Emitted when the client receives a publish packet.
            this._onClientMessage(topic, payload);
        });

        this._client = client;

        this._updateOperatingState(OperatingState.Started);
    }

    private _getBrokerUrl(url: string, options: any) {
        if (options?.servers && options.servers.length > 0) {
            /* tslint:disable-next-line:no-null-keyword */
            return null;
        }
        if (options) {
            // Specifying an empty servers array throws an error in MQTT client.
            delete options.servers;
        }
        return (url || undefined);
    }

    private _endClient(callback?: () => void) {
        if (!this._client) {
            callback && callback();
            return;
        }

        this._cleanupIoState();

        this._unobserveObservedItems();
        this._unobserveAssociate();
        this._unobserveDiscoverDevice();
        this._unobserveDiscoverIdentity();

        this._deadvertiseIdentityOrDevice();

        const client = this._client;

        // Immediately invalidate the current client instance
        this._isClientConnected = false;
        this._initClient();
        this._client = undefined;

        // Note: if force is set to true, the client doesn't 
        // disconnect properly from the broker. It closes the socket
        // immediately, so that the broker publishes client's last will.
        client.end(false, () => {
            this._updateOperatingState(OperatingState.Stopped);
            callback && callback();
        });
    }

    private get _brokerClientId() {
        /** Assign own client id because the MQTT.JS default value
         * is based on a weak random calculation:
         * 'mqttjs_' + Math.random().toString(16).substr(2, 8)
         * 
         * MQTT Spec 3.1:
         * The Server MUST allow ClientIds which are between 1 and 23 UTF-8 encoded 
         * bytes in length, and that contain only the characters
         * "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".
         * The Server MAY allow ClientId’s that contain more than 23 encoded bytes.
         * The Server MAY allow ClientId’s that contain characters not included in the list given above. 
         */
        const id = this._container.identity.objectId;
        if (this.options.useProtocolCompliantClientId === undefined ||
            this.options.useProtocolCompliantClientId === false) {
            return `Coaty${id}`;
        }
        return `Coaty${id.replace("-", "").substr(0, 18)}`;
    }

    private _onClientConnected(connack) {

        /* Support deferred publications and subscriptions when client connects
         * or reconnects.
         * Note: MQTT.js also support a deferred open scenario for pub/sub in
         * version 1.7.x. However, it doesn't work for reconnection subscribes.
         * A reconnect with clean: true will lose all subscriptions in the broker.
         * This will be fixed in MQTT.js v2. Since we have implemented our own
         * deferred connection scenario we explicitely opt out in v2.
         */

        // Apply all deferred subscriptions and keep them for later reconnects.
        if (this._deferredSubscriptions) {
            this._deferredSubscriptions.forEach(sub => this._client.subscribe(sub));
        }

        // Apply all deferred offline publications and clear them if
        // successfully published.
        if (this._deferredPublications) {
            const deferred = [...this._deferredPublications];
            this._deferredPublications = [];
            deferred.forEach((pub, index) =>
                this._client.publish(pub.topic, pub.payload, pub.options, err => {
                    // If client is disconnected or disconnecting, keep this
                    // publication cached.
                    if (err) {
                        this._deferredPublications.push(pub);
                    }
                }));
        }

        // Emitted on successful (re)connection.
        this._updateCommunicationState(CommunicationState.Online);

        // console.log("CommunicationManager: connected");
    }

    private _onClientReconnect() {
        // Emitted when a reconnect starts.

        // Ensure Advertise events for identity/device are published on
        // reconnection (via deferredPublications).
        this._advertiseIdentityOrDevice();

        // console.log("CommunicationManager: reconnecting...");
    }

    private _onClientDisconnected() {
        // Emitted after a disconnection requested by calling end().
        this._updateCommunicationState(CommunicationState.Offline);

        // console.log("CommunicationManager: disconnected");
    }

    private _onClientOffline() {
        // Emitted when the client goes offline, i.e. when the 
        // connection to the server is closed (for whatever reason) and 
        // the client reconnects.
        this._updateCommunicationState(CommunicationState.Offline);

        // console.log("CommunicationManager: offline");
    }

    private _onClientError(error) {
        // Emitted when the client cannot connect (i.e.connack rc != 0) 
        // or when a parsing error occurs.
        this._updateCommunicationState(CommunicationState.Offline);

        console.log(`CommunicationManager: error on connect: ${error}`);
    }

    private _onClientMessage(topicName: string, payload: any) {
        let isDispatchedAsRaw = false;
        let isDispatching = false;
        try {
            isDispatching = true;
            // Even if a raw message has been successfully dispatched, further
            // processing is needed by checking external IO value topics.
            if (this._tryDispatchAsRawMessage(topicName, payload)) {
                isDispatchedAsRaw = true;
            }
            if (this._tryDispatchAsIoValueMessage(topicName, payload)) {
                return;
            }
            if (isDispatchedAsRaw) {
                return;
            }
            isDispatching = false;

            const topic = CommunicationTopic.createByName(topicName);
            const msgPayload = payload.toString();

            // Check whether incoming message is a response message
            if (topic.eventType === CommunicationEventType.Complete ||
                topic.eventType === CommunicationEventType.Resolve ||
                topic.eventType === CommunicationEventType.Retrieve ||
                topic.eventType === CommunicationEventType.Return) {

                // Check if 
                // Dispatch incoming response message to associated observable.
                const item = this._observedResponses.get(topic.correlationId);
                if (item === undefined) {
                    // There are no subscribers for this response event, or
                    // correlation ID is missing, skip event.
                    return;
                }
                if (item.request.eventType === CommunicationEventType.Update &&
                    topic.eventType !== CommunicationEventType.Complete) {
                    console.log(`CommunicationManager: expected Complete response message for Update, got: ${topicName}`);
                    return;
                }
                if (item.request.eventType === CommunicationEventType.Discover &&
                    topic.eventType !== CommunicationEventType.Resolve) {
                    console.log(`CommunicationManager: expected Resolve response message for Discover, got: ${topicName}`);
                    return;
                }
                if (item.request.eventType === CommunicationEventType.Query &&
                    topic.eventType !== CommunicationEventType.Retrieve) {
                    console.log(`CommunicationManager: expected Retrieve response message for Query, got: ${topicName}`);
                    return;
                }
                if (item.request.eventType === CommunicationEventType.Call &&
                    topic.eventType !== CommunicationEventType.Return) {
                    console.log(`CommunicationManager: expected Return response message for Call, got: ${topicName}`);
                    return;
                }

                const message = this._createEventInstance({
                    eventType: topic.eventType,
                    sourceId: topic.sourceId,
                    eventUserId: topic.associationId,
                    data: JSON.parse(msgPayload),
                    eventRequest: item.request,
                });

                if (message.eventType === CommunicationEventType.Complete) {
                    const completeEvent = message as CompleteEvent;
                    completeEvent.eventRequest.ensureValidResponseParameters(completeEvent.data);
                }
                if (message.eventType === CommunicationEventType.Resolve) {
                    const resolveEvent = message as ResolveEvent;
                    resolveEvent.eventRequest.ensureValidResponseParameters(resolveEvent.data);
                }
                if (message.eventType === CommunicationEventType.Retrieve) {
                    const retrieveEvent = message as RetrieveEvent;
                    retrieveEvent.eventRequest.ensureValidResponseParameters(retrieveEvent.data);
                }
                if (message.eventType === CommunicationEventType.Return) {
                    const returnEvent = message as ReturnEvent;
                    returnEvent.eventRequest.ensureValidResponseParameters(returnEvent.data);
                }

                isDispatching = true;
                item.dispatchNext(message);
                isDispatching = false;
            } else {
                // Dispatch incoming request message to associated observable
                // using individual deep copies of the event data. Note that
                // echo messages are also dispatched.
                const item = this._observedRequests.get(topic.eventTypeName);
                if (item === undefined) {
                    // There are no subscribers for this request event, skip it.
                    return;
                }
                const message = this._createEventInstance({
                    eventType: topic.eventType,
                    sourceId: topic.sourceId,
                    eventUserId: topic.associationId,
                    data: JSON.parse(msgPayload),
                    eventTypeFilter: topic.eventTypeFilter,
                });

                if (message instanceof DiscoverEvent) {
                    message.resolve = (event: ResolveEvent) => {
                        message.ensureValidResponseParameters(event.data);
                        this._publishClient(event, undefined, topic.correlationId);
                    };
                }
                if (message instanceof QueryEvent) {
                    message.retrieve = (event: RetrieveEvent) => {
                        message.ensureValidResponseParameters(event.data);
                        this._publishClient(event, undefined, topic.correlationId);
                    };
                }
                if (message instanceof UpdateEvent) {
                    message.complete = (event: CompleteEvent) => {
                        message.ensureValidResponseParameters(event.data);
                        this._publishClient(event, undefined, topic.correlationId);
                    };
                }
                if (message instanceof CallEvent) {
                    message.returnEvent = (event: ReturnEvent) => {
                        message.ensureValidResponseParameters(event.data);
                        this._publishClient(event, undefined, topic.correlationId);
                    };
                }

                isDispatching = true;
                item.dispatchNext(message);
                isDispatching = false;
            }
        } catch (error) {
            if (isDispatching) {
                console.log(`CommunicationManager: emitted event throws in application code: ${error}`);
                throw error;
            }

            // Silently ignore undispatched raw messages do not conform to the
            // shape of real Coaty messages.
            if (!isDispatchedAsRaw) {
                console.log(`CommunicationManager: failed to handle incoming message topic ${topicName}': ${error}`);
            }
        }
    }

    /**
     * Create a new instance of the specified event object. Performs a
     * validation type check to ensure that the given event data is valid.
     *
     * @param event an event object deserialized by JSON (on inbound event) or
     * created by the application (on outbound event).
     */
    private _createEventInstance(event: any): CommunicationEvent<CommunicationEventData> {
        let instance: CommunicationEvent<CommunicationEventData>;
        switch (event.eventType) {
            case CommunicationEventType.Advertise:
                instance = new AdvertiseEvent(AdvertiseEventData.createFrom(event.data));
                break;
            case CommunicationEventType.Associate:
                instance = new AssociateEvent(AssociateEventData.createFrom(event.data));
                break;
            case CommunicationEventType.Deadvertise:
                instance = new DeadvertiseEvent(DeadvertiseEventData.createFrom(event.data));
                break;
            case CommunicationEventType.Channel:
                instance = new ChannelEvent(
                    event.eventTypeFilter,
                    ChannelEventData.createFrom(event.data));
                break;
            case CommunicationEventType.Discover:
                instance = new DiscoverEvent(DiscoverEventData.createFrom(event.data));
                break;
            case CommunicationEventType.Resolve:
                instance = new ResolveEvent(ResolveEventData.createFrom(event.data));
                break;
            case CommunicationEventType.Query:
                instance = new QueryEvent(QueryEventData.createFrom(event.data));
                break;
            case CommunicationEventType.Retrieve:
                instance = new RetrieveEvent(RetrieveEventData.createFrom(event.data));
                break;
            case CommunicationEventType.Update:
                instance = new UpdateEvent(UpdateEventData.createFrom(event.data));
                break;
            case CommunicationEventType.Complete:
                instance = new CompleteEvent(CompleteEventData.createFrom(event.data));
                break;
            case CommunicationEventType.Call:
                instance = new CallEvent(
                    event.eventTypeFilter,
                    CallEventData.createFrom(event.data));
                break;
            case CommunicationEventType.Return:
                instance = new ReturnEvent(ReturnEventData.createFrom(event.data));
                break;
            default:
                throw new TypeError(`Couldn't create event instance for event type ${event.eventType}`);
        }
        // For inbound event, sourceId is given; for outbound event sourceId is the agent identity.
        instance.sourceId = event.sourceId || this._container.identity.objectId;
        instance.eventUserId = event.eventUserId;
        if (event.eventRequest) {
            instance.eventRequest = event.eventRequest;
        }
        return instance;
    }

    private _publishClient(
        event: CommunicationEvent<CommunicationEventData>,
        eventTypeFilter?: string,
        correlationId?: string): Observable<CommunicationEvent<CommunicationEventData>> {

        // Safety check for valid event structure
        event = this._createEventInstance(event);

        const { eventType, sourceId: eventSourceId, data: eventData } = event;

        // Publish a response message for a two-way event
        if (correlationId) {
            const responseTopic = CommunicationTopic.createByLevels(
                CommunicationManager.PROTOCOL_VERSION,
                eventType,
                eventTypeFilter,
                eventSourceId,
                this._associatedUser?.objectId,
                correlationId,
            );
            this._getPublisher(responseTopic.getTopicName(), eventData.toJsonObject())();
            return undefined;
        }

        // Publish a one-way message or a request message for a two-way event
        const topic = CommunicationTopic.createByLevels(
            CommunicationManager.PROTOCOL_VERSION,
            eventType,
            eventTypeFilter,
            eventSourceId,
            this._associatedUser?.objectId,
            CommunicationTopic.isOneWayEvent(eventType) ? undefined : this.runtime.newUuid(),
        );

        event.eventUserId = this._associatedUser ? this._associatedUser.objectId : undefined;

        // Ensure deferred advertisements of identity and associated device are always 
        // published before any other communication events.
        let shouldPublishDeferredFirst = false;
        let isAdvertiseIdentity = false;
        let isAdvertiseDevice = false;
        if (eventType === CommunicationEventType.Advertise) {
            const object = (eventData as AdvertiseEventData).object;
            if (object.coreType === "Identity") {
                shouldPublishDeferredFirst = true;
                if (object.objectId === this._container.identity.objectId) {
                    isAdvertiseIdentity = true;
                }
            } else if (object.coreType === "Device") {
                shouldPublishDeferredFirst = true;
                if (this._associatedDevice && object.objectId === this._associatedDevice.objectId) {
                    isAdvertiseDevice = true;
                }
            }
        }

        const publisher = this._getPublisher(
            topic.getTopicName(),
            eventData.toJsonObject(),
            false,
            false,
            shouldPublishDeferredFirst,
            isAdvertiseIdentity,
            isAdvertiseDevice);
        let responseType: CommunicationEventType;

        switch (eventType) {
            case CommunicationEventType.Discover:
                responseType = CommunicationEventType.Resolve;
                break;
            case CommunicationEventType.Query:
                responseType = CommunicationEventType.Retrieve;
                break;
            case CommunicationEventType.Update:
                responseType = CommunicationEventType.Complete;
                break;
            case CommunicationEventType.Call:
                responseType = CommunicationEventType.Return;
                break;
            default:
                break;
        }

        if (responseType) {
            // Create subscriptions for response event and postpone publishing 
            // request event until the first observer subscribes.
            return this._observeResponse(
                responseType,
                topic.correlationId,
                event,
                publisher,
                (item: ObservedResponseItem) => {
                    this._observedResponses.delete(item.correlationId);
                    this._unsubscribeClient(item.topicFilter);
                });
        }

        // Publish request events immediately, returning undefined.
        publisher();
        return undefined;
    }

    private _getPublisher(
        topicName: string,
        data: any,
        isDataRaw = false,
        shouldRetain = false,
        publishDeferredFirst = false,
        isAdvertiseIdentity = false,
        isAdvertiseDevice = false) {
        return () => {
            const payload = isDataRaw ? data : JSON.stringify(data);
            const pubOptions: IClientPublishOptions = { qos: 0, retain: shouldRetain };
            const deferPublication = () => {
                const msg = {
                    topic: topicName,
                    payload,
                    options: pubOptions,
                    isAdvertiseIdentity,
                    isAdvertiseDevice,
                };
                if (publishDeferredFirst) {
                    this._deferredPublications.unshift(msg);
                } else {
                    this._deferredPublications.push(msg);
                }
            };
            if (this._client) {
                this._client.publish(topicName, payload, pubOptions, err => {
                    // If publication fails because client is disconnecting or
                    // disconnected, add message to publication cache to be
                    // published later on reconnect.
                    if (err) {
                        deferPublication();
                    }
                });
            } else {
                deferPublication();
            }
        };
    }

    // TODO REdesign IO routing: pass ioGroupId as argument, for Associate events only  (invoke once for each ioGroupId)
    private _observeRequest(
        eventType: CommunicationEventType,
        eventTypeFilter?: string) {
        const eventTypeName = CommunicationTopic.getEventTypeName(eventType, eventTypeFilter);
        let item = this._observedRequests.get(eventTypeName);

        if (!item) {
            const topicFilter = (eventType === CommunicationEventType.Raw) ?
                eventTypeFilter :
                CommunicationTopic.getTopicFilter(
                    CommunicationManager.PROTOCOL_VERSION,
                    eventType,
                    eventTypeFilter,
                    (eventType === CommunicationEventType.Associate) ?
                        this._associatedUser?.objectId :
                        undefined,
                    undefined);
            item = new ObservedRequestItem(topicFilter);
            this._observedRequests.set(eventTypeName, item);
            this._subscribeClient(topicFilter);
        }

        return item.observable;
    }

    private _observeResponse(
        eventType: CommunicationEventType,
        correlationId: string,
        request: CommunicationEvent<CommunicationEventData>,
        publisher: () => void,
        cleanup: (item: ObservedResponseItem) => void) {
        const topicFilter = CommunicationTopic.getTopicFilter(
            CommunicationManager.PROTOCOL_VERSION,
            eventType,
            undefined,
            undefined,
            correlationId,
        );
        const item = new ObservedResponseItem(topicFilter, correlationId, request, publisher, cleanup);

        this._observedResponses.set(item.correlationId, item);
        this._subscribeClient(item.topicFilter);

        return item.createObservable();
    }

    private _subscribeClient(topicFilter: string) {
        if (this._isClientConnected) {
            this._client.subscribe(topicFilter);
        }
        this._deferredSubscriptions.push(topicFilter);
    }

    private _unsubscribeClient(topicFilter: string) {
        if (this._isClientConnected) {
            this._client.unsubscribe(topicFilter);
        }
        const i = this._deferredSubscriptions.findIndex(f => f === topicFilter);
        if (i > -1) {
            this._deferredSubscriptions.splice(i, 1);
        }
    }

    private _unobserveObservedItems() {
        if (this._isClientConnected) {
            this._observedRequests.forEach(item => {
                this._client.unsubscribe(item.topicFilter);
            });
            this._observedResponses.forEach(item => {
                this._client.unsubscribe(item.topicFilter);
            });
        }
        this._observedRequests.clear();
        this._observedResponses.clear();
        this._deferredSubscriptions = [];
    }

    private _advertiseIdentityOrDevice() {
        // Advertise associated device once if existing.
        // (cp. _observeDiscoverDevice)
        if ((this.options.shouldAdvertiseDevice === undefined ||
            this.options.shouldAdvertiseDevice === true) &&
            this._associatedDevice) {
            // Republish only once on failed reconnection attempts.
            if (this._deferredPublications && !this._deferredPublications.find(pub => pub.isAdvertiseDevice)) {
                this.publishAdvertise(AdvertiseEvent.withObject(this._associatedDevice));
            }
        }

        // Advertise identity once. 
        // (cp. _observeDiscoverIdentity)
        // Republish only once on failed reconnection attempts.
        if (this._deferredPublications && !this._deferredPublications.find(pub => pub.isAdvertiseIdentity)) {
            this.publishAdvertise(AdvertiseEvent.withObject(this._container.identity));
        }

        if (this._deadvertiseIds.length === 0) {
            return undefined;
        }

        // Return the last will message composed of Deadvertise events 
        // for identity and/or device.
        //
        // Note that the associated user/device must not and thus cannot be
        // changed while the communication manager is connected. Otherwise,
        // the AssociatedUserId topic level and the device ID payload 
        // cached in the last will at the broker would no longer be correct.
        return {
            topic: CommunicationTopic.createByLevels(
                CommunicationManager.PROTOCOL_VERSION,
                CommunicationEventType.Deadvertise,
                undefined,
                this._container.identity.objectId,
                this._associatedUser?.objectId,
                this.runtime.newUuid(),
            ).getTopicName(),
            payload: JSON.stringify(
                new DeadvertiseEventData(this._deadvertiseIds).toJsonObject()),
        };
    }

    private _deadvertiseIdentityOrDevice() {
        if (this._deadvertiseIds.length > 0) {
            this.publishDeadvertise(DeadvertiseEvent.withObjectIds(...this._deadvertiseIds));
        }
    }

    private _tryDispatchAsIoValueMessage(topicName: string, payload: any): boolean {
        let isDispatching = false;
        try {
            const items = this._ioActorItems.get(topicName);
            if (items) {
                items.forEach((sourceIds, actorId) => {
                    const ioValueItem = this._ioValueItems.get(actorId);
                    if (ioValueItem) {
                        const actor: IoActor = this._associatedDevice.ioCapabilities
                            .find(ioPoint => ioPoint.objectId === actorId) as IoActor;
                        const value = actor.useRawIoValues ? payload : JSON.parse(payload.toString());
                        isDispatching = true;
                        ioValueItem.dispatchNext(value);
                        isDispatching = false;
                    }
                });
                return true;
            }
            return false;
        } catch (error) {
            if (isDispatching) {
                throw error;
            }

            console.log(`CommunicationManager: failed to handle incoming IO value topic ${topicName}': ${error}`);

            return true;
        }
    }

    private _tryDispatchAsRawMessage(topicName: string, payload: any): boolean {
        if (!CommunicationTopic.isRawTopic(topicName)) {
            return false;
        }
        let isDispatching = false;
        try {
            const rawType = CommunicationEventType[CommunicationEventType.Raw];
            let isRawDispatch = false;
            // Dispatch raw message on all registered observables of event type "Raw:<any subscription topic>"
            this._observedRequests.forEach((item, eventTypeName) => {
                if (!eventTypeName.startsWith(rawType)) {
                    return;
                }
                isRawDispatch = true;
                isDispatching = true;
                // Dispatch raw data and the actual topic (parsing is up to the application)
                item.dispatchNext(payload, topicName);
                isDispatching = false;
            });
            return isRawDispatch;
        } catch (error) {
            if (isDispatching) {
                throw error;
            }

            console.log(`CommunicationManager: failed to handle incoming Raw topic ${topicName}': ${error}`);

            return true;
        }
    }

    private _observeAdvertise(coreType?: CoreType, objectType?: string): Observable<AdvertiseEvent> {
        if (coreType && !CoreTypes.isCoreType(coreType)) {
            throw new TypeError(`${coreType} is not a CoreType`);
        }

        // Optimization: in case core objects should be observed by core object type (an exotic case)
        // we do not subscribe on the object type filter but on the core type filter instead,
        // filtering out objects that do not satisfy the core object type.
        // (see `publishAdvertise`).
        if (objectType) {
            const objectCoreType = CoreTypes.getCoreTypeFor(objectType);
            if (objectCoreType) {
                return (this._observeRequest(
                    CommunicationEventType.Advertise,
                    objectCoreType) as Observable<AdvertiseEvent>)
                    .pipe(filter(event => event.data.object.objectType === objectType));
            }
        }

        return this._observeRequest(
            CommunicationEventType.Advertise,
            coreType || CommunicationTopic.EVENT_TYPE_FILTER_SEPARATOR + objectType) as Observable<AdvertiseEvent>;
    }

    private _observeAssociate() {
        if (!this._associatedUser || !this._associatedDevice) {
            return;
        }

        this._associateSubscription =
            this._observeRequest(CommunicationEventType.Associate)
                // No need to filter event on associated user ID since the 
                // topic subscription already restricts on this ID
                .subscribe(event => this._handleAssociate(event as AssociateEvent));
    }

    private _unobserveAssociate() {
        this._associateSubscription?.unsubscribe();
        this._associateSubscription = undefined;
    }

    private _observeDiscoverDevice() {
        if (!(this.options.shouldAdvertiseDevice === undefined ||
            this.options.shouldAdvertiseDevice === true) ||
            !this._associatedDevice) {
            return;
        }

        this._discoverDeviceSubscription =
            this._observeRequest(CommunicationEventType.Discover)
                .pipe(filter((event: DiscoverEvent) =>
                    (event.data.isDiscoveringTypes &&
                        event.data.isCoreTypeCompatible("Device")) ||
                    (event.data.isDiscoveringObjectId &&
                        event.data.objectId === this._associatedDevice.objectId)))
                .subscribe((event: DiscoverEvent) =>
                    event.resolve(ResolveEvent.withObject(this._associatedDevice)));
    }

    private _unobserveDiscoverDevice() {
        this._discoverDeviceSubscription?.unsubscribe();
        this._discoverDeviceSubscription = undefined;
    }

    private _observeDiscoverIdentity() {
        this._discoverIdentitySubscription =
            this._observeRequest(CommunicationEventType.Discover)
                .pipe(filter((event: DiscoverEvent) =>
                    (event.data.isDiscoveringTypes &&
                        event.data.isCoreTypeCompatible("Identity")) ||
                    (event.data.isDiscoveringObjectId &&
                        event.data.objectId === this._container.identity.objectId)))
                .subscribe((event: DiscoverEvent) =>
                    event.resolve(ResolveEvent.withObject(this._container.identity)));
    }

    private _unobserveDiscoverIdentity() {
        this._discoverIdentitySubscription?.unsubscribe();
        this._discoverIdentitySubscription = undefined;
    }

    private _handleAssociate(event: AssociateEvent) {
        let isDispatching = false;
        try {
            const ioSourceId = event.data.ioSource.objectId;
            const ioActorId = event.data.ioActor.objectId;
            const isIoSourceAssociated = this._associatedDevice.ioCapabilities
                && this._associatedDevice.ioCapabilities
                    .some(ioPoint => ioPoint.objectId === ioSourceId);
            const isIoActorAssociated = this._associatedDevice.ioCapabilities
                && this._associatedDevice.ioCapabilities
                    .some(ioPoint => ioPoint.objectId === ioActorId);

            if (!isIoSourceAssociated && !isIoActorAssociated) {
                return;
            }

            const associatedTopic = event.data.associatedTopic;

            if (associatedTopic !== undefined &&
                !CommunicationTopic.isValidIoValueTopic(associatedTopic, CommunicationManager.PROTOCOL_VERSION)) {
                console.log(`CommunicationManager: associated topic of incoming ${event.eventType} event is invalid: '${associatedTopic}'`);
                return;
            }

            // Update own IO source associations
            if (isIoSourceAssociated) {
                this._updateIoSourceItems(ioSourceId, ioActorId, associatedTopic, event.data.updateRate);
            }

            // Update own IO actor associations
            if (isIoActorAssociated) {
                if (associatedTopic !== undefined) {
                    this._associateIoActorItems(ioSourceId, ioActorId, associatedTopic);
                } else {
                    this._disassociateIoActorItems(ioSourceId, ioActorId);
                }
            }

            // Dispatch IO state events to associated observables
            if (isIoSourceAssociated) {
                const item = this._ioStateItems.get(ioSourceId);
                if (item) {
                    const items = this._ioSourceItems.get(ioSourceId);
                    isDispatching = true;
                    item.dispatchNext(IoStateEvent.with(
                        items !== undefined && items[1] !== undefined,
                        items ? items[2] : undefined));
                    isDispatching = false;
                }
            }
            if (isIoActorAssociated) {
                const item = this._ioStateItems.get(ioActorId);
                if (item) {
                    let actorIds: Map<Uuid, Uuid[]>;
                    if (associatedTopic !== undefined) {
                        actorIds = this._ioActorItems.get(associatedTopic);
                    }
                    isDispatching = true;
                    item.dispatchNext(IoStateEvent.with(
                        actorIds !== undefined &&
                        actorIds.has(ioActorId) &&
                        actorIds.get(ioActorId).length > 0));
                    isDispatching = false;
                }
            }
        } catch (error) {
            if (isDispatching) {
                throw error;
            }
            console.log(`CommunicationManager: failed to handle incoming ${event.eventType} event: ${error}`);
        }
    }

    private _updateIoSourceItems(ioSourceId: Uuid, ioActorId: Uuid, associatedTopic: string, updateRate: number) {
        let items = this._ioSourceItems.get(ioSourceId);
        if (associatedTopic !== undefined) {
            if (!items) {
                items = [associatedTopic, [ioActorId], updateRate];
                this._ioSourceItems.set(ioSourceId, items);
            } else {
                if (items[0] === associatedTopic) {
                    if (items[1].indexOf(ioActorId) === -1) {
                        items[1].push(ioActorId);
                    }
                } else {
                    // Disassociate current IO actors due to a topic change.
                    const oldTopic = items[0];
                    items[0] = associatedTopic;
                    items[1].forEach(actorId =>
                        this._disassociateIoActorItems(ioSourceId, actorId, oldTopic));
                    items[1] = [ioActorId];
                }
                items[2] = updateRate;
            }
        } else {
            if (items) {
                const i = items[1].indexOf(ioActorId);
                if (i !== -1) {
                    items[1].splice(i, 1);
                }
                items[2] = updateRate;
                if (items[1].length === 0) {
                    this._ioSourceItems.delete(ioSourceId);
                }
            }
        }
    }

    private _associateIoActorItems(ioSourceId: Uuid, ioActorId: Uuid, associatedTopic: string) {
        // Disassociate any association for the given IO source and IO actor.
        this._disassociateIoActorItems(ioSourceId, ioActorId, undefined, associatedTopic);

        let items = this._ioActorItems.get(associatedTopic);
        if (!items) {
            items = new Map<Uuid, Uuid[]>();
            items.set(ioActorId, [ioSourceId]);
            this._ioActorItems.set(associatedTopic, items);

            // Issue subscription just once for each associated topic
            // to avoid receiving multiple published IO events later.
            this._subscribeClient(associatedTopic);
        } else {
            const sourceIds = items.get(ioActorId);
            if (!sourceIds) {
                items.set(ioActorId, [ioSourceId]);
            } else {
                if (sourceIds.indexOf(ioSourceId) === -1) {
                    sourceIds.push(ioSourceId);
                }
            }
        }
    }

    private _disassociateIoActorItems(
        ioSourceId: Uuid,
        ioActorId: Uuid,
        forTopic?: string,
        associatingTopic?: Uuid) {
        const topicsToUnsubscribe: string[] = [];
        const handler = (items: Map<Uuid, Uuid[]>, topic: string) => {
            if (associatingTopic === topic) {
                return;
            }
            const sourceIds = items.get(ioActorId);
            if (sourceIds) {
                const i = sourceIds.indexOf(ioSourceId);
                if (i !== -1) {
                    sourceIds.splice(i, 1);
                }
                if (sourceIds.length === 0) {
                    items.delete(ioActorId);
                }
                if (items.size === 0) {
                    topicsToUnsubscribe.push(topic);
                }
            }
        };

        if (forTopic) {
            const items = this._ioActorItems.get(forTopic);
            if (items) {
                handler(items, forTopic);
            }
        } else {
            this._ioActorItems.forEach(handler);
        }

        topicsToUnsubscribe.forEach(topic => {
            this._ioActorItems.delete(topic);
            this._unsubscribeClient(topic);
        });
    }

    private _cleanupIoState() {
        let isDispatching = false;
        try {
            // Dispatch IO state events to all IO state observers
            this._ioStateItems.forEach((item, pointId) => {
                isDispatching = true;
                item.dispatchNext(IoStateEvent.with(false, undefined));
                isDispatching = false;
            });

            // Unsubscribe all association topics subscribed for IO actors
            this._ioActorItems.forEach((actorIds, topic) => {
                if (this._isClientConnected) {
                    this._client.unsubscribe(topic);
                }
            });
        } catch (error) {
            if (isDispatching) {
                throw error;
            }

            console.log(`CommunicationManager: failed to cleanup IO state: ${error}`);
        }
    }

    private _observeIoState(ioPointId: Uuid): BehaviorSubject<IoStateEvent> {
        let item = this._ioStateItems.get(ioPointId);
        if (!item) {
            // Compute initial IO state for the subject
            let hasAssociations = false;
            let updateRate: number;
            const srcItems = this._ioSourceItems.get(ioPointId);
            if (srcItems) {
                hasAssociations = true;
                updateRate = srcItems[2];
            } else {
                this._ioActorItems.forEach(sourceItems => {
                    const sourceIds = sourceItems.get(ioPointId);
                    if (sourceIds) {
                        hasAssociations = true;
                        // Update rate is never delivered to IO actors
                        updateRate = undefined;
                    }
                });
            }
            item = new IoStateItem(IoStateEvent.with(hasAssociations, updateRate));
            this._ioStateItems.set(ioPointId, item);
        }
        return item.subject;
    }

    private _observeIoValue(ioActorId: Uuid): Observable<any> {
        let item = this._ioValueItems.get(ioActorId);
        if (!item) {
            item = new AnyValueItem();
            this._ioValueItems.set(ioActorId, item);
        }
        return item.observable;
    }

    private _publishIoValue(ioSourceId: Uuid, value: any) {
        const items = this._ioSourceItems.get(ioSourceId);
        if (items) {
            this._getPublisher(items[0], value)();
        }
    }

}

abstract class SubscriberItem<T> {
    private _subscribers: Array<Subscriber<T | [string, T]>>;

    constructor() {
        this._subscribers = [];
    }

    dispatchNext(message: T, topic?: string) {
        [...this._subscribers].forEach(s => s.next(topic ? [topic, message] : message));
    }

    dispatchComplete() {
        [...this._subscribers].forEach(s => s.complete());
    }

    dispatchError(error: any) {
        [...this._subscribers].forEach(s => s.error(error));
    }

    get subscriberCount() {
        return this._subscribers.length;
    }

    protected add(subscriber: Subscriber<T | [string, T]>) {
        this._subscribers.push(subscriber);
    }

    protected remove(subscriber: Subscriber<T | [string, T]>) {
        const subscriberIndex = this._subscribers.indexOf(subscriber);
        if (subscriberIndex !== -1) {
            this._subscribers.splice(subscriberIndex, 1);
        }
    }
}

class ObservedRequestItem extends SubscriberItem<CommunicationEvent<CommunicationEventData>> {
    observable: Observable<CommunicationEvent<CommunicationEventData>>;

    constructor(public topicFilter: string) {
        super();
        this.observable = this._createObservable();
    }

    private _createObservable(): Observable<CommunicationEvent<CommunicationEventData>> {
        return Observable.create((subscriber: Subscriber<CommunicationEvent<CommunicationEventData>>) => {
            this.add(subscriber);

            // Called when a subscription is unsubscribed
            return () => this.remove(subscriber);
        });
    }
}

class ObservedResponseItem extends SubscriberItem<CommunicationEvent<CommunicationEventData>> {
    private _cleanup: (item: ObservedResponseItem) => void;
    private _hasLastObserverUnsubscribed: boolean;

    constructor(
        public topicFilter: string,
        public correlationId: string,
        public request: CommunicationEvent<CommunicationEventData>,
        public publisher: () => void,
        cleanup: (item: ObservedResponseItem) => void) {
        super();
        this._hasLastObserverUnsubscribed = false;
        this._cleanup = (item: ObservedResponseItem) => {
            cleanup(item);
            this._cleanup = undefined;
            this.publisher = undefined;
            this.request = undefined;
        };
    }

    createObservable(): Observable<CommunicationEvent<CommunicationEventData>> {
        return Observable.create((subscriber: Subscriber<CommunicationEvent<CommunicationEventData>>) => {
            if (this._hasLastObserverUnsubscribed) {
                // After all initial subscribers have unsubscribed resubscription is no longer possible.
                throw new Error("in CommunicationManager: resubscribing to a response event is not supported");
            }

            this.add(subscriber);

            if (this.subscriberCount === 1) {
                // Publish the request as soon as the first observer has subscribed
                this.publisher && this.publisher();
            }

            // Called when a subscription is unsubscribed
            return () => {
                this.remove(subscriber);

                if (this.subscriberCount === 0) {
                    // The last observer has unsubscribed, clean up the item
                    this._hasLastObserverUnsubscribed = true;
                    this._cleanup && this._cleanup(this);
                }
            };
        });
    }
}

class IoStateItem extends SubscriberItem<IoStateEvent> {
    subject: BehaviorSubject<IoStateEvent>;

    constructor(initialValue: IoStateEvent) {
        super();
        this.subject = new BehaviorSubject<IoStateEvent>(initialValue);
    }

    dispatchNext(message: IoStateEvent) {
        this.subject.next(message);
    }

    dispatchComplete() {
        this.subject.complete();
    }

    dispatchError(error: any) {
        this.subject.error(error);
    }
}

class AnyValueItem extends SubscriberItem<any> {
    observable: Observable<any>;

    constructor() {
        super();
        this.observable = this._createObservable();
    }

    private _createObservable(): Observable<any> {
        return Observable.create((subscriber: Subscriber<any>) => {
            this.add(subscriber);

            // Called when a subscription is unsubscribed
            return () => this.remove(subscriber);
        });
    }
}
