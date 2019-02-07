/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { Client, connect, IClientPublishOptions } from "mqtt";
import { BehaviorSubject, Observable, Subscriber, Subscription } from "rxjs";
import { filter } from "rxjs/operators";

import { Device } from "../model/device";
import { IoActor, IoSource } from "../model/io-point";
import { CoatyObject, Component, Uuid } from "../model/object";
import { CoreType, CoreTypes } from "../model/types";
import { User } from "../model/user";
import { IComponent } from "../runtime/component";
import { CommunicationOptions } from "../runtime/configuration";
import { Runtime } from "../runtime/runtime";

import {
    AdvertiseEvent,
    AdvertiseEventData,
    AssociateEvent,
    AssociateEventData,
    ChannelEvent,
    ChannelEventData,
    CommunicationEvent,
    CommunicationEventData,
    CommunicationEventType,
    CompleteEvent,
    CompleteEventData,
    DeadvertiseEvent,
    DeadvertiseEventData,
    DiscoverEvent,
    DiscoverEventData,
    IoStateEvent,
    QueryEvent,
    QueryEventData,
    ResolveEvent,
    ResolveEventData,
    RetrieveEvent,
    RetrieveEventData,
    UpdateEvent,
    UpdateEventData,
} from "./communication-events";
import { CommunicationTopic } from "./communication-topic";

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
    Starting,
    Started,
    Stopping,
    Stopped,
}

/**
 * Manages a set of predefined communication events and event patterns to
 * query, distribute, and share Coaty objects across decantralized 
 * application components using publish-subscribe on top of MQTT messaging.
 */
export class CommunicationManager implements IComponent {

    /**
     * Defines the communication protocol version number, an integral number.
     * Increment this version whenever you add new communication events or
     * change the shape of topics/payloads and adjust the compatibility
     * check method isVersionCompatible if needed.
     */
    static readonly PROTOCOL_VERSION: number = 1;

    private _runtime: Runtime;
    private _options: CommunicationOptions;
    private _identity: Component;
    private _client: Client;
    private _isClientConnected: boolean;
    private _associatedUser: User;
    private _associatedDevice: Device;
    private _useReadableTopics: boolean;
    private _isDisposed: boolean;
    private _deadvertiseIds: Uuid[];
    private _associateSubscription: Subscription;
    private _discoverDeviceSubscription: Subscription;

    // Represents the current communication state in an observable
    private _state: BehaviorSubject<CommunicationState>;

    // Represents the current operating state in an observable
    private _operatingState: BehaviorSubject<OperatingState>;

    // Subscriptions on incoming request events
    // (hashed by event type string and event target object ID)
    private _observedRequests: Map<string, Map<Uuid, ObservedRequestItem>>;

    // Subscriptions on incoming response events (hashed by message token)
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
    private _deferredPublications: Array<{ topic: string, payload: string, options: IClientPublishOptions }>;
    private _deferredSubscriptions: string[];

    constructor(runtime: Runtime, options: CommunicationOptions) {
        if (!runtime) {
            throw new TypeError("Argument 'runtime' not defined");
        }
        if (!options) {
            throw new TypeError("Argument 'options' not defined");
        }

        this._isClientConnected = false;
        this._runtime = runtime;
        this._initOptions(options);
        this._isDisposed = false;
        this._state = new BehaviorSubject(CommunicationState.Offline);
        this._operatingState = new BehaviorSubject(OperatingState.Initial);

        this._initClient();
    }

    /**
     * Gets the Runtime object associated with this communication manager.
     */
    get runtime() {
        return this._runtime;
    }

    /**
     * Gets the CommunicationOptions associated with this communication manager.
     */
    get options() {
        return this._options;
    }

    /**
     * Gets the identity meta object for this communication manager.
     */
    get identity(): Component {
        if (!this._identity) {
            this._identity = this._createIdentity();
        }
        return this._identity;
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
     * Observe communication state changes by the hot observable returned.
     * When subscribed the observable immediately emits the current
     * communication state.
     */
    observeCommunicationState(): Observable<CommunicationState> {
        return this._state.asObservable();
    }

    /**
     * Observe operating state changes by the hot observable returned.
     * When subscribed the observable immediately emits the current
     * operating state.
     */
    observeOperatingState(): Observable<OperatingState> {
        return this._operatingState.asObservable();
    }

    /**
     * Observe Discover events for the given target emitted by the hot
     * observable returned.
     *
     * Discover events that originate from the given event target, i.e.
     * that have been published by specifying the given event target as
     * event source, will not be emitted by the observable returned.
     *
     * @param eventTarget target for which Discover events should be emitted
     * @returns a hot observable emitting incoming Discover events
     */
    observeDiscover(eventTarget: CoatyObject): Observable<DiscoverEvent> {
        return this._observeRequest(eventTarget.objectId, CommunicationEventType.Discover) as Observable<DiscoverEvent>;
    }

    /**
     * Observe Query events for the given target emitted by the hot
     * observable returned.
     *
     * Query events that originate from the given event target, i.e.
     * that have been published by specifying the given event target as
     * event source, will not be emitted by the observable returned.
     *
     * @param eventTarget target for which Query events should be emitted
     * @returns a hot observable emitting incoming Query events
     */
    observeQuery(eventTarget: CoatyObject): Observable<QueryEvent> {
        return this._observeRequest(eventTarget.objectId, CommunicationEventType.Query) as Observable<QueryEvent>;
    }

    /**
     * Observe Update events for the given target emitted by the hot
     * observable returned.
     *
     * Update events that originate from the given event target, i.e.
     * that have been published by specifying the given event target as
     * event source, will not be emitted by the observable returned.
     *
     * @param eventTarget target for which Update events should be emitted
     * @returns a hot observable emitting incoming Update events
     */
    observeUpdate(eventTarget: CoatyObject): Observable<UpdateEvent> {
        return this._observeRequest(eventTarget.objectId, CommunicationEventType.Update) as Observable<UpdateEvent>;
    }

    /**
     * @deprecated since version 1.5.0. Please use either observeAdvertiseWithCoreType
     * or observeAdvertiseWithObjectType instead.
     * 
     * Observe Advertise events for the given target and the given
     * core or object type emitted by the hot observable returned.
     * 
     * Specify either a core type or an object type to restrict events 
     * accordingly. The method throws an error if both types or none
     * are specified.
     *
     * Advertise events that originate from the given event target, i.e.
     * that have been published by specifying the given event target as
     * event source, will not be emitted by the observable returned.
     *
     * @param eventTarget target for which Advertise events should be emitted
     * @param coreType core type of objects to be observed, or `undefined` (optional)
     * @param objectType object type of objects to be observed, or `undefined` (optional)
     * @returns a hot observable emitting incoming Advertise events
     */
    observeAdvertise(eventTarget: CoatyObject, coreType?: CoreType, objectType?: string): Observable<AdvertiseEvent> {
        if (coreType && objectType) {
            throw new TypeError(`Either coreType or objectType must be specified, but not both`);
        }
        if (!coreType && !objectType) {
            throw new TypeError(`Either coreType or objectType must be specified`);
        }
        if (coreType && !CoreTypes.isCoreType(coreType)) {
            throw new TypeError(`${coreType} is not a CoreType`);
        }

        // Optimization: in case core objects should be observed by core object type (an exotic case)
        // we do not subscribe on the object type filter but on the core type filter instead,
        // filtering out objects that do not satisfy the core object type.
        // (see publishAdvertise method).
        if (objectType) {
            const objectCoreType = CoreTypes.getCoreTypeFor(objectType);
            if (objectCoreType) {
                return (this._observeRequest(
                    eventTarget.objectId,
                    CommunicationEventType.Advertise,
                    objectCoreType) as Observable<AdvertiseEvent>)
                    .pipe(filter((event: AdvertiseEvent) => event.eventData.object.objectType === objectType));
            }
        }

        return this._observeRequest(
            eventTarget.objectId,
            CommunicationEventType.Advertise,
            coreType || CommunicationTopic.EVENT_TYPE_FILTER_SEPARATOR + objectType) as Observable<AdvertiseEvent>;
    }

    /**
     * Observe Advertise events for the given target and the given
     * core type emitted by the hot observable returned.
     *
     * Advertise events that originate from the given event target, i.e.
     * that have been published by specifying the given event target as
     * event source, will not be emitted by the observable returned.
     *
     * @param eventTarget target for which Advertise events should be emitted
     * @param coreType core type of objects to be observed.
     * @returns a hot observable emitting incoming Advertise events
     */
    observeAdvertiseWithCoreType(eventTarget: CoatyObject, coreType: CoreType): Observable<AdvertiseEvent> {
        return this.observeAdvertise(eventTarget, coreType);
    }

    /**
     * Observe Advertise events for the given target and the given
     * object type emitted by the hot observable returned.
     *
     * Advertise events that originate from the given event target, i.e.
     * that have been published by specifying the given event target as
     * event source, will not be emitted by the observable returned.
     *
     * @param eventTarget target for which Advertise events should be emitted
     * @param objectType object type of objects to be observed.
     * @returns a hot observable emitting incoming Advertise events
     */
    observeAdvertiseWithObjectType(eventTarget: CoatyObject, objectType: string): Observable<AdvertiseEvent> {
        return this.observeAdvertise(eventTarget, undefined, objectType);
    }

    /**
     * Observe Deadvertise events for the given target emitted by the hot
     * observable returned.
     *
     * Deadvertise events that originate from the given event target, i.e.
     * that have been published by specifying the given event target as
     * event source, will not be emitted by the observable returned.
     *
     * @param eventTarget target for which Deadvertise events should be emitted
     * @returns a hot observable emitting incoming Deadvertise events
     */
    observeDeadvertise(eventTarget: CoatyObject): Observable<DeadvertiseEvent> {
        return this._observeRequest(eventTarget.objectId, CommunicationEventType.Deadvertise) as Observable<DeadvertiseEvent>;
    }

    /**
     * Observe Channel events for the given target and the given
     * channel identifier emitted by the hot observable returned.
     * 
     * The channel identifier must be a non-empty string that does not contain
     * the following characters: `NULL (U+0000)`, `# (U+0023)`, `+ (U+002B)`, 
     * `/ (U+002F)`.
     *
     * Channel events that originate from the given event target, i.e.
     * that have been published by specifying the given event target as
     * event source, will not be emitted by the observable returned.
     *
     * @param eventTarget target for which Channel events should be emitted
     * @param channelId a channel identifier
     * @returns a hot observable emitting incoming Channel events
     */
    observeChannel(eventTarget: CoatyObject, channelId: string): Observable<ChannelEvent> {
        if (!ChannelEvent.isChannelIdValid(channelId)) {
            throw new TypeError(`${channelId} is not a valid channel identifier`);
        }
        return this._observeRequest(eventTarget.objectId, CommunicationEventType.Channel, channelId) as Observable<ChannelEvent>;
    }

    /**
     * Observe incoming messages on raw MQTT subscription topics. The observable returned by
     * calling `observeRaw` emits messages as tuples including the actual published topic and
     * the payload. Payload is represented as `Uint8Array` (`Buffer` in Node.js) and needs to
     * be parsed by the application. Use the `toString` method on a payload to convert the raw
     * data to an UTF8 encoded string.
     * 
     * Used to interoperate with external MQTT clients that publish messages on raw
     * (usually non-Coaty) topics.
     *
     * Note that the returned observable is *shared* among all raw topic observers. This
     * basically means that the observable will emit messages for *all* observed
     * raw subscription topics, not only for the one specified in a single method call.
     * Thus, you should always pipe the observable through an RxJS `filter` operator to
     * filter out the messages associated with the given subscription topic.
     * 
     * ```ts
     * import { filter } from "rxjs/operators";
     *
     * this.communicationManager
     *    .observeRaw(this.identity, "$SYS/#")
     *    .pipe(filter(([topic,]) => topic.startsWith("$SYS/")))
     *    .subscribe(([topic, payload]) => {
     *        console.log(`Received topic ${topic} with payload ${payload.toString()}`);
     *    });
     * ```
     * 
     * @remarks
     * Observing raw subscription topics does *not* suppress observation of non-raw communication
     * event types by the communication manager: If at least one raw topic is observed, the
     * communication manager first dispatches *any* incoming message to *all* raw message observers.
     * Then, event dispatching continues as usual by handling all non-raw communication event
     * types which are observed.
     * 
     * The specified subscription topic must be a valid MQTT subscription topic. It must not contain the 
     * character `NULL (U+0000)`.
     *
     * @param eventTarget target for which values should be emitted
     * @param topicFilter the subscription topic
     * @returns a hot observable emitting any incoming messages as tuples containing the actual topic
     * and the payload as Uint8Array (Buffer in Node.js)
     */
    observeRaw(eventTarget: CoatyObject, topicFilter: string): Observable<[string, Uint8Array]> {
        if (typeof topicFilter !== "string" ||
            topicFilter.length === 0 ||
            topicFilter.indexOf("\u0000") !== -1) {
            throw new TypeError(`${topicFilter} is not a valid subscription topic`);
        }

        return this._observeRequest(eventTarget.objectId, CommunicationEventType.Raw, topicFilter) as Observable<any>;
    }

    /**
     * Observe IO state events for the given IO source or IO actor
     * emitted by the behavior subject returned. When subscribed the
     * subject immediately emits the current association state.
     *
     * @param eventTarget target for which IO values should be emitted
     * @returns a subject emitting IO state events for the given target
     */
    observeIoState(eventTarget: IoSource | IoActor): BehaviorSubject<IoStateEvent> {
        return this._observeIoState(eventTarget.objectId);
    }

    /**
     * Observe IO values for the given IO actor emitted by the hot observable
     * returned.
     *
     * @param eventTarget IO actor for which IO values should be emitted
     * @returns a hot observable emitting incoming values for an IO actor
     */
    observeIoValue(eventTarget: IoActor): Observable<any> {
        return this._observeIoValue(eventTarget.objectId);
    }

    /**
     * Find discoverable objects and receive Resolve events for them
     * emitted by the hot observable returned.
     *
     * Note that the Discover event is lazily published when the
     * first observer subscribes to the observable.
     *
     * Since the observable never emits a completed or error event,
     * a subscriber should unsubscribe when the observable is no longer needed
     * to release system resources and to avoid memory leaks. After all initial 
     * subscribers have unsubscribed no more response events will be emitted 
     * on the observable and an error will be thrown on resubscription.
     *
     * @param event the Discover event to be published
     * @returns a hot observable on which associated Resolve events are emitted
     */
    publishDiscover(event: DiscoverEvent): Observable<ResolveEvent> {
        return this._publishClient(event) as Observable<ResolveEvent>;
    }

    /**
     * Find queryable objects and receive Retrieve events for them
     * emitted by the hot observable returned.
     *
     * Note that the Query event is lazily published when the
     * first observer subscribes to the observable.
     *
     * Since the observable never emits a completed or error event,
     * a subscriber should unsubscribe when the observable is no longer needed
     * to release system resources and to avoid memory leaks. After all initial 
     * subscribers have unsubscribed no more response events will be emitted 
     * on the observable and an error will be thrown on resubscription.
     *
     * @param event the Query event to be published
     * @returns a hot observable on which associated Retrieve events are emitted
     */
    publishQuery(event: QueryEvent): Observable<RetrieveEvent> {
        return this._publishClient(event) as Observable<RetrieveEvent>;
    }

    /**
     * Request or propose partial or full update of the specified object 
     * and receive accomplishments emitted by the hot observable returned.
     *
     * Note that the Update event is lazily published when the
     * first observer subscribes to the observable.
     *
     * Since the observable never emits a completed or error event,
     * a subscriber should unsubscribe when the observable is no longer needed
     * to release system resources and to avoid memory leaks. After all initial 
     * subscribers have unsubscribed no more response events will be emitted 
     * on the observable and an error will be thrown on resubscription.
     *
     * @param event the Update event to be published
     * @returns a hot observable of associated Complete events
     */
    publishUpdate(event: UpdateEvent): Observable<CompleteEvent> {
        return this._publishClient(event) as Observable<CompleteEvent>;
    }

    /**
     * Advertise an object.
     *
     * @param event the Advertise event to be published
     */
    publishAdvertise(event: AdvertiseEvent): void {
        const coreType = event.eventData.object.coreType;
        const objectType = event.eventData.object.objectType;

        // Publish event with core type filter to satisfy core type observers.
        this._publishClient(event, coreType);

        // Optimization: Publish event with object type filter to satisfy object type observers
        // unless the advertised object is a core object with a core object type.
        // In this (exotic) case, core object type observers subscribe on the core type
        // followed by a local filter operation to filter out unwanted objects
        // (see observeAdvertise method).
        if (CoreTypes.getObjectTypeFor(coreType) !== objectType) {
            this._publishClient(event, CommunicationTopic.EVENT_TYPE_FILTER_SEPARATOR + objectType);
        }

        // Ensure a Deadvertise event/last will is emitted for an advertised Component or Device.
        if (event.eventData.object.coreType === "Component" ||
            event.eventData.object.coreType === "Device") {
            this._deadvertiseIds.find(id => id === event.eventData.object.objectId) ||
                this._deadvertiseIds.push(event.eventData.object.objectId);
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
     * The value is silently discarded if the IO source is currently
     * not associated with any IO actor.
     */
    publishIoValue(ioSource: IoSource, value: any) {
        this._publishIoValue(ioSource.objectId, value);
    }

    /**
     * Used by an IO router to create a new topic used to associate an
     * IO source with an IO actor.
     *
     * The IO source uses this topic to publish IO values; the IO actor
     * subscribes to this topic to receive the published values.
     *
     * The topic name created is based on the event type `IoValue`.
     * It specifies the associated user and the given IO source ID in the
     * corresponding topic levels. It is guaranteed to not contain wildcard
     * tokens on any topic level.
     * 
     * @param ioSource the IO source object
     */
    createIoValueTopic(ioSource: IoSource): string {
        return CommunicationTopic.createByLevels(
            this._associatedUser,
            ioSource,
            CommunicationEventType.IoValue,
            undefined,
            this.runtime.newUuid(),
            CommunicationManager.PROTOCOL_VERSION,
            this._useReadableTopics).getTopicName();
    }

    /**
     * Check whether the given protocol version is compatible with
     * CommunicationManager.PROTOCOL_VERSION.
     * @param version a communication protocol version
     */
    public isVersionCompatible(protocolVersion: number) {
        return protocolVersion >= CommunicationManager.PROTOCOL_VERSION;
    }

    /**
     * Unsubscribe and disconnect from the messaging broker.
     */
    onDispose() {
        if (this._isDisposed) {
            return;
        }

        this._isDisposed = true;
        this._endClient();
    }

    private _initOptions(options?: CommunicationOptions) {
        options && (this._options = options);

        // Capture state of associated user and device in case it might change 
        // while the communication manager is being online.
        this._associatedUser = CoreTypes.clone<User>(this.runtime.options.associatedUser);
        this._associatedDevice = CoreTypes.clone<Device>(this.runtime.options.associatedDevice);

        this._useReadableTopics = !!this.options.useReadableTopics;
    }

    private _createIdentity(): Component {
        const defaultIdentity: Component = {
            objectType: CoreTypes.OBJECT_TYPE_COMPONENT,
            coreType: "Component",
            objectId: this.runtime.newUuid(),
            name: "CommunicationManager",
        };

        return Object.assign(defaultIdentity, this.options.identity || {});
    }

    private _updateState(newState: CommunicationState) {
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
        this._observedRequests = new Map<string, Map<Uuid, ObservedRequestItem>>();
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
        this._updateOperatingState(OperatingState.Starting);

        this._observeAssociate();
        this._observeDiscoverDevice();

        const lastWill = this._advertiseIdentityOrDevice();

        // Determine connection info for broker
        const brokerUrl = this._getBrokerUrl(this.options.brokerUrl, this.options.brokerOptions);
        const brokerOpts: any = {};

        if (this.options.brokerOptions && typeof this.options.brokerOptions === "object") {
            Object.assign(brokerOpts, this.options.brokerOptions);
        }

        if (lastWill) {
            brokerOpts.will = lastWill;
        }

        brokerOpts.clientId = this._brokerClientId;

        // Support for clean/persistent sessions in broker:
        // If you want to receive QOS 1 and 2 messages that were published while your client was offline, 
        // you need to connect with an unique clientId and set 'clean' to false (MQTT.js default is true).
        brokerOpts.clean = brokerOpts.clean === undefined ? false : brokerOpts.clean;

        // Do not support automatic resubscription/republication of topics on reconnection by MQTT.js v2
        // because communication manager provides its own implementation.
        //
        // If connection is broken, do not queue outgoing QoS zero messages.
        brokerOpts.queueQoSZero = false;
        // If connection is broken and reconnects, subscribed topics are not automatically subscribed again.
        brokerOpts.resubscribe = false;

        const client = connect(brokerUrl, brokerOpts);

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
        if (options && options.servers && options.servers.length > 0) {
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

        this._updateOperatingState(OperatingState.Stopping);

        this._unobserveObservedItems();
        this._unobserveAssociate();
        this._unobserveDiscoverDevice();

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
        const id = this.identity.objectId;
        if (this.options.useProtocolCompliantClientId === undefined ||
            this.options.useProtocolCompliantClientId === false) {
            return `COATY${id}`;
        }
        return `COATY${id.replace("-", "").substr(0, this._useReadableTopics ? 8 : 19)}`;
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

        // Apply all deferred offline publications and clear them.
        if (this._deferredPublications) {
            this._deferredPublications.forEach(pub =>
                this._client.publish(pub.topic, pub.payload, pub.options));
            this._deferredPublications = [];
        }

        // Emitted on successful (re)connection.
        this._updateState(CommunicationState.Online);

        // console.log("CommunicationManager: connected");
    }

    private _onClientReconnect() {
        // Emitted when a reconnect starts.

        // console.log("CommunicationManager: reconnecting...");
    }

    private _onClientDisconnected() {
        // Emitted after a disconnection requested by calling end().
        this._updateState(CommunicationState.Offline);

        // console.log("CommunicationManager: disconnected");
    }

    private _onClientOffline() {
        // Emitted when the client goes offline, i.e. when the 
        // connection to the server is closed (for whatever reason) and 
        // the client reconnects.
        this._updateState(CommunicationState.Offline);

        // console.log("CommunicationManager: offline");
    }

    private _onClientError(error) {
        // Emitted when the client cannot connect (i.e.connack rc != 0) 
        // or when a parsing error occurs.
        this._updateState(CommunicationState.Offline);

        console.log(`CommunicationManager: error on connect: ${error}`);
    }

    private _onClientMessage(topicName: string, payload: any) {
        let isDispatching = false;
        let isDispatchedAsRaw = false;
        try {

            isDispatching = true;
            if (this._tryDispatchAsRawMessage(topicName, payload)) {
                isDispatchedAsRaw = true;
            }
            if (this._tryDispatchAsIoValueMessage(topicName, payload)) {
                return;
            }
            isDispatching = false;

            const topic = CommunicationTopic.createByName(topicName);
            const msgPayload = payload.toString();

            // Check compatibility of protocol version
            if (!this.isVersionCompatible(topic.version)) {
                /* tslint:disable-next-line:max-line-length */
                console.log(`CommunicationManager: message not compatible with current protocol version: expected ${CommunicationManager.PROTOCOL_VERSION} or greater, got ${topic.version}`);
                return;
            }

            // Check whether incoming message is a response message
            if (topic.eventType === CommunicationEventType.Complete ||
                topic.eventType === CommunicationEventType.Resolve ||
                topic.eventType === CommunicationEventType.Retrieve) {
                // Dispatch incoming response message to associated observable.
                const item = this._observedResponses.get(topic.messageToken);
                if (item === undefined) {
                    // There are no more subscribers for this response event, skip it.
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

                const message = this._createEventInstance({
                    eventType: topic.eventType,
                    eventSource: CommunicationTopic.uuidFromLevel(
                        topic.sourceObjectId),
                    eventData: JSON.parse(msgPayload),
                    eventUserId: CommunicationTopic.uuidFromLevel(
                        topic.associatedUserId),
                    eventRequest: item.request,
                });

                if (message.eventType === CommunicationEventType.Complete) {
                    const completeEvent = message as CompleteEvent;
                    completeEvent.eventRequest.ensureValidResponseParameters(completeEvent.eventData);
                }
                if (message.eventType === CommunicationEventType.Resolve) {
                    const resolveEvent = message as ResolveEvent;
                    resolveEvent.eventRequest.ensureValidResponseParameters(resolveEvent.eventData);
                }
                if (message.eventType === CommunicationEventType.Retrieve) {
                    const retrieveEvent = message as RetrieveEvent;
                    retrieveEvent.eventRequest.ensureValidResponseParameters(retrieveEvent.eventData);
                }

                isDispatching = true;
                item.dispatchNext(message);
                isDispatching = false;
            } else {
                // Dispatch incoming request message to associated observables
                // using individual deep copies of the event data.
                // Ensure that echo messages are not dispatched.
                const targetItems = this._observedRequests.get(topic.eventTypeName);
                if (targetItems) {
                    targetItems.forEach((item, targetId) => {
                        const sourceId = CommunicationTopic.uuidFromLevel(topic.sourceObjectId);

                        // To suppress echo messages dispatch event to all associated 
                        // observables except to those that published the 
                        // incoming message originally.
                        if (sourceId === targetId) {
                            return;
                        }

                        const message = this._createEventInstance({
                            eventType: topic.eventType,
                            eventSource: sourceId,
                            eventData: JSON.parse(msgPayload),
                            eventUserId: CommunicationTopic.uuidFromLevel(topic.associatedUserId),
                            channelId: topic.eventTypeFilter,
                        });

                        if (message instanceof DiscoverEvent) {
                            message.resolve = (event: ResolveEvent) => {
                                message.ensureValidResponseParameters(event.eventData);
                                this._publishClient(event, undefined, topic.messageToken);
                            };
                        }
                        if (message instanceof QueryEvent) {
                            message.retrieve = (event: RetrieveEvent) => {
                                message.ensureValidResponseParameters(event.eventData);
                                this._publishClient(event, undefined, topic.messageToken);
                            };
                        }
                        if (message instanceof UpdateEvent) {
                            message.complete = (event: CompleteEvent) => {
                                message.ensureValidResponseParameters(event.eventData);
                                this._publishClient(event, undefined, topic.messageToken);
                            };
                        }

                        isDispatching = true;
                        item.dispatchNext(message);
                        isDispatching = false;
                    });
                }
            }
        } catch (error) {
            if (isDispatching) {
                console.log(`CommunicationManager: emitted event throws in application code: ${error}`);
                throw error;
            }

            if (!isDispatchedAsRaw) {
                /* tslint:disable-next-line:max-line-length */
                console.log(`CommunicationManager: failed to handle incoming message topic ${topicName}': ${error}`);
            }
        }
    }

    /**
     * Create a new instance of the specified event object.
     * Performs a safety type check to ensure that the given event data is valid.
     *
     * @param event an event object parsed by JSON or created by the application.
     */
    private _createEventInstance(event: any): CommunicationEvent<CommunicationEventData> {
        let instance: CommunicationEvent<CommunicationEventData>;
        switch (event.eventType) {
            case CommunicationEventType.Advertise:
                instance = new AdvertiseEvent(
                    event.eventSource,
                    AdvertiseEventData.createFrom(event.eventData));
                break;
            case CommunicationEventType.Associate:
                instance = new AssociateEvent(
                    event.eventSource,
                    AssociateEventData.createFrom(event.eventData));
                break;
            case CommunicationEventType.Deadvertise:
                instance = new DeadvertiseEvent(
                    event.eventSource,
                    DeadvertiseEventData.createFrom(event.eventData));
                break;
            case CommunicationEventType.Channel:
                instance = new ChannelEvent(
                    event.eventSource,
                    event.channelId,
                    ChannelEventData.createFrom(event.eventData));
                break;
            case CommunicationEventType.Discover:
                instance = new DiscoverEvent(
                    event.eventSource,
                    DiscoverEventData.createFrom(event.eventData));
                break;
            case CommunicationEventType.Resolve:
                instance = new ResolveEvent(
                    event.eventSource,
                    ResolveEventData.createFrom(event.eventData));
                break;
            case CommunicationEventType.Query:
                instance = new QueryEvent(
                    event.eventSource,
                    QueryEventData.createFrom(event.eventData));
                break;
            case CommunicationEventType.Retrieve:
                instance = new RetrieveEvent(
                    event.eventSource,
                    RetrieveEventData.createFrom(event.eventData));
                break;
            case CommunicationEventType.Update:
                instance = new UpdateEvent(
                    event.eventSource,
                    UpdateEventData.createFrom(event.eventData));
                break;
            case CommunicationEventType.Complete:
                instance = new CompleteEvent(
                    event.eventSource,
                    CompleteEventData.createFrom(event.eventData));
                break;
            default:
                throw new TypeError(`Couldn't create event instance for event type ${event.eventType}`);
        }
        instance.eventUserId = event.eventUserId;
        if (event.eventRequest) {
            instance.eventRequest = event.eventRequest;
        }
        return instance;
    }

    private _publishClient(
        event: CommunicationEvent<CommunicationEventData>,
        eventTypeFilter?: string,
        forMessageToken?: string): Observable<CommunicationEvent<CommunicationEventData>> {

        // Safety check for valid event structure
        event = this._createEventInstance(event);

        const { eventType, eventSource, eventSourceId, eventData } = event;

        // Publish a response message for a request
        if (forMessageToken) {
            const responseTopic = CommunicationTopic.createByLevels(
                this._associatedUser,
                eventSource || eventSourceId,
                eventType,
                undefined,
                forMessageToken,
                CommunicationManager.PROTOCOL_VERSION,
                this._useReadableTopics,
                true,
            );
            this._getPublisher(responseTopic.getTopicName(), eventData.toJsonObject())();
            return undefined;
        }

        // Publish a request message
        const topic = CommunicationTopic.createByLevels(
            this._associatedUser,
            eventSource || eventSourceId,
            eventType,
            eventTypeFilter,
            this.runtime.newUuid(),
            CommunicationManager.PROTOCOL_VERSION,
            this._useReadableTopics,
            false,
        );

        event.eventUserId = this._associatedUser ? this._associatedUser.objectId : undefined;

        // Ensure deferred advertisements of identity and associated device are always 
        // published before any other communication events.
        let shouldPublishDeferredFirst = false;
        if (eventType === CommunicationEventType.Advertise &&
            ((eventData as AdvertiseEventData).object.coreType === "Component" ||
                (eventData as AdvertiseEventData).object.coreType === "Device")) {
            shouldPublishDeferredFirst = true;
        }

        const publisher = this._getPublisher(topic.getTopicName(), eventData.toJsonObject(), false, false, shouldPublishDeferredFirst);
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
            default:
                break;
        }

        if (responseType) {
            // Create subscriptions for response event and postpone publishing 
            // request event until the first observer subscribes.
            return this._observeResponse(
                eventSourceId,
                responseType,
                topic.messageToken,
                event,
                publisher,
                (item: ObservedResponseItem) => {
                    this._observedResponses.delete(item.messageToken);
                    this._unsubscribeClient(item.topicFilter);
                });
        }

        // Publish request events immediately, returning undefined.
        publisher();
        return undefined;
    }

    private _getPublisher(topicName: string, data: any, isDataRaw = false, shouldRetain = false, publishDeferredFirst = false) {
        return () => {
            const payload = isDataRaw ? data : JSON.stringify(data);
            const pubOptions: IClientPublishOptions = { qos: 0, retain: shouldRetain };
            if (this._isClientConnected) {
                this._client.publish(topicName, payload, pubOptions);
            } else {
                const msg = {
                    topic: topicName,
                    payload: payload,
                    options: pubOptions,
                };
                if (publishDeferredFirst) {
                    this._deferredPublications.unshift(msg);
                } else {
                    this._deferredPublications.push(msg);
                }
            }
        };
    }

    private _observeRequest(
        eventTargetId: Uuid,
        eventType: CommunicationEventType,
        eventTypeFilter?: string) {
        const eventTypeName = CommunicationTopic.getEventTypeName(eventType, eventTypeFilter);
        let isAlreadySubscribed = true;
        let targetItems = this._observedRequests.get(eventTypeName);

        if (!targetItems) {
            isAlreadySubscribed = false;
            targetItems = new Map<Uuid, ObservedRequestItem>();
            this._observedRequests.set(eventTypeName, targetItems);
        }

        let item = targetItems.get(eventTargetId);

        if (!item) {
            const topicFilter = (eventType === CommunicationEventType.Raw) ?
                eventTypeFilter :
                CommunicationTopic.getTopicFilter(
                    eventTypeName,
                    (eventType === CommunicationEventType.Associate) ?
                        this._associatedUser :
                        undefined,
                    undefined);
            item = new ObservedRequestItem(topicFilter);
            targetItems.set(eventTargetId, item);
            if (!isAlreadySubscribed) {
                // Each item for a specific event type filter shares the same subscription.
                // Do not subscribe the same topic filter for a specific 
                // event type filter multiple times to avoid receiving multiple
                // events on this topic. 
                this._subscribeClient(topicFilter);
            }
        }

        return item.observable;
    }

    private _observeResponse(
        eventTargetId: Uuid,
        eventType: CommunicationEventType,
        messageToken: string,
        request: CommunicationEvent<CommunicationEventData>,
        publisher: () => void,
        cleanup: (item: ObservedResponseItem) => void) {
        const eventTypeName = CommunicationTopic.getEventTypeName(eventType);
        const topicFilter = CommunicationTopic.getTopicFilter(eventTypeName, undefined, messageToken);
        const item = new ObservedResponseItem(topicFilter, messageToken, request, publisher, cleanup);

        this._observedResponses.set(item.messageToken, item);
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
            this._observedRequests.forEach(items => {
                let isFirst = true;
                items.forEach(item => {
                    if (isFirst) {
                        isFirst = false;
                        this._client.unsubscribe(item.topicFilter);
                    }
                });
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
        // Advertise associated device if existing
        // (cp. _observeDiscoverDevice)
        if ((this.options.shouldAdvertiseDevice === undefined ||
            this.options.shouldAdvertiseDevice === true) &&
            this._associatedDevice) {
            this.publishAdvertise(AdvertiseEvent.withObject(this.identity, this._associatedDevice));
        }

        // Advertise identity
        if (this.options.shouldAdvertiseIdentity === undefined ||
            this.options.shouldAdvertiseIdentity === true) {
            this.publishAdvertise(AdvertiseEvent.withObject(this.identity, this.identity));
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
                this._associatedUser,
                this.identity,
                CommunicationEventType.Deadvertise,
                undefined,
                this.runtime.newUuid(),
                CommunicationManager.PROTOCOL_VERSION,
                this._useReadableTopics,
            ).getTopicName(),
            payload: JSON.stringify(
                new DeadvertiseEventData(...this._deadvertiseIds).toJsonObject()),
        };
    }

    private _deadvertiseIdentityOrDevice() {
        if (this._deadvertiseIds.length > 0) {
            this.publishDeadvertise(DeadvertiseEvent.withObjectIds(this.identity, ...this._deadvertiseIds));
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

            /* tslint:disable-next-line:max-line-length */
            console.log(`CommunicationManager: failed to handle incoming IO value topic ${topicName}': ${error}`);

            return true;
        }
    }

    private _tryDispatchAsRawMessage(topicName: string, payload: any): boolean {
        let isDispatching = false;
        try {
            let isRawDispatch = false;
            // Dispatch raw message on all registered observables of event type "Raw:<any subscription topic>"
            this._observedRequests.forEach((targetItems, eventTypeName) => {
                if (!eventTypeName.startsWith(CommunicationEventType[CommunicationEventType.Raw] +
                    CommunicationTopic.EVENT_TYPE_FILTER_SEPARATOR)) {
                    return;
                }
                targetItems.forEach(item => {
                    isRawDispatch = true;
                    isDispatching = true;
                    // Dispatch raw data and the actual topic (parsing is up to the application)
                    item.dispatchNext(payload, topicName);
                    isDispatching = false;
                });
            });
            return isRawDispatch;
        } catch (error) {
            if (isDispatching) {
                throw error;
            }

            /* tslint:disable-next-line:max-line-length */
            console.log(`CommunicationManager: failed to handle incoming Raw topic ${topicName}': ${error}`);

            return true;
        }
    }

    private _observeAssociate() {
        if (!this._associatedUser || !this._associatedDevice) {
            return;
        }

        this._associateSubscription =
            this._observeRequest(this.identity.objectId, CommunicationEventType.Associate)
                // No need to filter event on associated user ID since the 
                // topic subscription already restricts on this ID
                .subscribe(event => this._handleAssociate(event as AssociateEvent));
    }

    private _unobserveAssociate() {
        if (this._associateSubscription) {
            this._associateSubscription.unsubscribe();
            this._associateSubscription = undefined;
        }
    }

    private _observeDiscoverDevice() {
        if (!(this.options.shouldAdvertiseDevice === undefined ||
            this.options.shouldAdvertiseDevice === true) ||
            !this._associatedDevice) {
            return;
        }

        this._discoverDeviceSubscription =
            this._observeRequest(this.identity.objectId, CommunicationEventType.Discover)
                .pipe(filter((event: DiscoverEvent) =>
                    event.eventData.isDiscoveringTypes &&
                    event.eventData.isCoreTypeCompatible("Device")))
                .subscribe((event: DiscoverEvent) =>
                    event.resolve(ResolveEvent.withObject(this.identity, this._associatedDevice)));
    }

    private _unobserveDiscoverDevice() {
        if (this._discoverDeviceSubscription) {
            this._discoverDeviceSubscription.unsubscribe();
            this._discoverDeviceSubscription = undefined;
        }
    }

    private _handleAssociate(event: AssociateEvent) {
        let isDispatching = false;
        try {
            const ioSourceId = event.eventData.ioSource.objectId;
            const ioActorId = event.eventData.ioActor.objectId;
            const isIoSourceAssociated = this._associatedDevice.ioCapabilities
                && this._associatedDevice.ioCapabilities
                    .some(ioPoint => ioPoint.objectId === ioSourceId);
            const isIoActorAssociated = this._associatedDevice.ioCapabilities
                && this._associatedDevice.ioCapabilities
                    .some(ioPoint => ioPoint.objectId === ioActorId);

            if (!isIoSourceAssociated && !isIoActorAssociated) {
                return;
            }

            const associatedTopic = event.eventData.associatedTopic;

            if (associatedTopic !== undefined &&
                !CommunicationTopic.isValidIoValueTopic(associatedTopic, this.isVersionCompatible)) {
                /* tslint:disable-next-line:max-line-length */
                console.log(`CommunicationManager: associated topic of incoming ${CommunicationEventType[event.eventType]} event is invalid: '${associatedTopic}'`);
                return;
            }

            // Update own IO source associations
            if (isIoSourceAssociated) {
                this._updateIoSourceItems(ioSourceId, ioActorId, associatedTopic, event.eventData.updateRate);
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

            /* tslint:disable-next-line:max-line-length */
            console.log(`CommunicationManager: failed to handle incoming ${CommunicationEventType[event.eventType]} event: ${error}`);
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
                    // Disassociate all IO actors due to a topic change.
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

            /* tslint:disable-next-line:max-line-length */
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
        public messageToken: string,
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
