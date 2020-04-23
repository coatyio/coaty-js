/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { Client, connect, IClientPublishOptions } from "mqtt";
import { BehaviorSubject, merge, Observable, Subscriber } from "rxjs";
import { filter } from "rxjs/operators";

import {
    CoatyObject,
    CommunicationOptions,
    Container,
    CoreType,
    CoreTypes,
    IoActor,
    IoNode,
    IoSource,
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
import { RawEvent } from "./raw";
import { CompleteEvent, CompleteEventData, UpdateEvent, UpdateEventData } from "./update-complete";

/**
 * Indicates the connectivity state of a Communication Manager.
 */
export enum CommunicationState {

    /** Disconnected */
    Offline,

    /** Connected */
    Online,
}

/**
 * Indicates the current operating state of a Communication Manager.
 */
export enum OperatingState {

    /** Indicates the communication manager is stopped or initialized. */
    Stopped,

    /** Indicates the communication manager is started. */
    Started,
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
    static readonly PROTOCOL_VERSION = 3;

    /**
     * Defines the default namespace used for communication.
     */
    static readonly DEFAULT_NAMESPACE = "-";

    private _options: CommunicationOptions;
    private _namespace: string;
    private _qos: 0 | 1 | 2;
    private _client: Client;
    private _isClientConnected: boolean;
    private _ioNodes: IoNode[];
    private _isDisposed: boolean;
    private _deadvertiseIds: Uuid[];

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

    // Own IO sources with associating route, actor ids, and updateRate
    // (hashed by IO source ID)
    private _ioSourceItems: Map<Uuid, [string, Uuid[], number]>;

    // Own IO actors with associated source ids (hashed by associating route)
    private _ioActorItems: Map<string, Map<Uuid, Uuid[]>>;

    // Own IO actors with their associated Observable for subscription
    // (hashed by IO actor ID)
    private _ioValueItems: Map<Uuid, AnyValueItem>;

    // Support deferred pub/sub on client (re)connection and on draining events
    private _deferredPublications: Array<{
        topic: string,
        payload: any,
        options: IClientPublishOptions,
        isAdvertiseIdentity: boolean,
        isAdvertiseIoNode: boolean,
    }>;
    private _deferredSubscriptions: string[];

    private _isPublishingDeferred: boolean;

    /**
     * @internal - For use in framework only.
     */
    constructor(private _container: Container, options: CommunicationOptions) {
        this._isClientConnected = false;
        this._initOptions(options);
        this._isDisposed = false;
        this._state = new BehaviorSubject(CommunicationState.Offline);
        this._operatingState = new BehaviorSubject(OperatingState.Stopped);
        this._initClient();
    }

    /**
     * Gets the container's Runtime object.
     */
    get runtime() {
        return this._container.runtime;
    }

    /**
     * Gets the communication manager's current communication options.
     *
     * @remarks These options may change whenever this communication manager is
     * restarted.
     */
    get options(): Readonly<CommunicationOptions> {
        return this._options;
    }

    /**
     * Gets the namespace for communication as specified in the configuration
     * options.
     *
     * Returns the default namespace used, if no namespace has been specified in
     * configuration options.
     */
    get namespace() {
        return this._namespace;
    }

    /**
     * Gets the IO node for the given IO context name, as configured in the
     * configuration common options.
     *
     * Returns undefined if no IO node is configured for the context name.
     */
    getIoNodeByContext(contextName: string): Readonly<IoNode> {
        return this._ioNodes.find(node => node.name === contextName);
    }

    /**
     * Starts or restarts this communication manager with communication options
     * specified in the configuration and in the optional `options` parameter.
     *
     * If no options are given, this operation does nothing if the communication
     * manager is already in `Started` operating state; otherwise, i.e. in
     * `Stopped` state, the communication manager is started with the
     * communication options specified in the container configuration.
     *
     * If partial options are given, the communication manager is stopped if in
     * `Started` operating state. Afterwards, it is started (again) with the
     * given partial options merged with the communication options specified in
     * the container configuration. Partial options override configuration
     * options. This is useful if you want to re-establish communication after
     * changing communication options on the fly.
     *
     * Note that further actions, like publishing or observing events, should
     * only be taken *after* the returned promise resolves.
     *
     * @param options new communication options to be used for a (re)start
     *   (optional)
     * @returns a promise that is resolved when start-up has been completed.
     */
    start(options?: Partial<CommunicationOptions>): Promise<any> {
        if (!options) {
            if (!this._client) {
                this._initOptions();
                this._startClient();
            }
            return Promise.resolve();
        }
        return new Promise<any>(resolve => {
            this._endClient(() => {
                this._initOptions(options);
                this._startClient();
                resolve();
            });
        });
    }

    /**
     * @deprecated since 2.0.1. Use `start(options?)` instead.
     * 
     * Restarts this communication manager using the given options.
     *
     * Useful if you want to re-establish communication after changing
     * communication options on the fly.
     *
     * The given partial options are merged with the communication options
     * specified in the container configuration. Partial options override
     * configuration options.
     *
     * Note that further actions, like publishing or observing events, should
     * only be taken *after* the returned promise resolves.
     *
     * @param options new communication options to be used for a restart
     * (optional)
     * @returns a promise that is resolved when restart has been completed.
     */
    restart(options?: Partial<CommunicationOptions>): Promise<any> {
        return new Promise<any>(resolve => {
            this._endClient(() => {
                this._initOptions(options);
                this._startClient();
                resolve();
            });
        });
    }

    /**
     * Stops dispatching and emitting events and disconnects from the
     * communication infrastructure.
     *
     * To continue processing with this communication manager sometime later,
     * invoke `start()`, but not before the returned promise resolves.
     *
     * @returns a promise that is resolved when communication connection has
     * been closed
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
     * Subscriptions to the returned observable are **automatically
     * unsubscribed** when the communication manager is stopped, in order to
     * release system resources and to avoid memory leaks.
     *
     * @returns an observable emitting incoming Discover events
     */
    observeDiscover(): Observable<DiscoverEvent> {
        return this._observeRequest(CommunicationEventType.Discover) as Observable<DiscoverEvent>;
    }

    /**
     * Observe Query events.
     * 
     * Subscriptions to the returned observable are **automatically
     * unsubscribed** when the communication manager is stopped, in order to
     * release system resources and to avoid memory leaks.
     *
     * @returns an observable emitting incoming Query events
     */
    observeQuery(): Observable<QueryEvent> {
        return this._observeRequest(CommunicationEventType.Query) as Observable<QueryEvent>;
    }

    /**
     * Observe Update events for the given core type.
     * 
     * Subscriptions to the returned observable are **automatically
     * unsubscribed** when the communication manager is stopped, in order to
     * release system resources and to avoid memory leaks.
     *
     * @param coreType core type of objects to be observed.
     * @returns an observable emitting incoming Update events
     */
    observeUpdateWithCoreType(coreType: CoreType): Observable<UpdateEvent> {
        return this._observeUpdate(coreType);
    }

    /**
     * Observe Update events for the given object type.
     * 
     * The given object type must be a non-empty string that does not contain
     * the following characters: `NULL (U+0000)`, `# (U+0023)`, `+ (U+002B)`, `/
     * (U+002F)`.
     * 
     * Subscriptions to the returned observable are **automatically
     * unsubscribed** when the communication manager is stopped, in order to
     * release system resources and to avoid memory leaks.
     *
     * @param objectType object type of objects to be observed
     * @returns an observable emitting incoming Update events
     * @throws if given objectType is not in a valid format
     */
    observeUpdateWithObjectType(objectType: string): Observable<UpdateEvent> {
        return this._observeUpdate(undefined, objectType);
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
     * emitted or skipped by the observable.
     *
     * A Call event is *not* emitted by the observable if:
     * - context filter and context object are *both* specified and they do not
     *   match (checked by using `ObjectMatcher.matchesFilter`), or
     * - context filter is *not* supplied *and* context object *is* specified.
     *
     * In all other cases, the Call event is emitted.
     * 
     * Subscriptions to the returned observable are **automatically
     * unsubscribed** when the communication manager is stopped, in order to
     * release system resources and to avoid memory leaks.
     *
     * @remarks You can also invoke `observeCall` *without* context parameter
     * and realize a custom matching logic with an RxJS `filter` operator.
     *
     * @param operation the name of the operation to be invoked
     * @param context a context object to be matched against the Call event
     * data's context filter (optional)
     * @returns an observable emitting incoming Call events whose context filter
     * matches the given context
     * @throws if given operation name is not in a valid format
     */
    observeCall(operation: string, context?: CoatyObject): Observable<CallEvent> {
        if (!CommunicationTopic.isValidTopicLevel(operation)) {
            throw new TypeError(`${operation} is not a valid operation name`);
        }
        return (this._observeRequest(CommunicationEventType.Call, operation) as Observable<CallEvent>)
            .pipe(filter(event => event.data.matchesFilter(context)));
    }

    /**
     * Observe Advertise events for the given core type.
     *
     * Subscriptions to the returned observable are **automatically
     * unsubscribed** when the communication manager is stopped, in order to
     * release system resources and to avoid memory leaks.
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
     * The given object type must be a non-empty string that does not contain
     * the following characters: `NULL (U+0000)`, `# (U+0023)`, `+ (U+002B)`, `/
     * (U+002F)`.
     * 
     * Subscriptions to the returned observable are **automatically
     * unsubscribed** when the communication manager is stopped, in order to
     * release system resources and to avoid memory leaks.
     *
     * @param objectType object type of objects to be observed.
     * @returns an observable emitting incoming Advertise events
     * @throws if given objectType is not in a valid format
     */
    observeAdvertiseWithObjectType(objectType: string): Observable<AdvertiseEvent> {
        return this._observeAdvertise(undefined, objectType);
    }

    /**
     * Observe Deadvertise events.
     * 
     * Subscriptions to the returned observable are **automatically
     * unsubscribed** when the communication manager is stopped, in order to
     * release system resources and to avoid memory leaks.
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
     * Subscriptions to the returned observable are **automatically
     * unsubscribed** when the communication manager is stopped, in order to
     * release system resources and to avoid memory leaks.
     *
     * @param channelId a channel identifier
     * @returns an observable emitting incoming Channel events
     * @throws if given channelId is not in a valid format
     */
    observeChannel(channelId: string): Observable<ChannelEvent> {
        if (!CommunicationTopic.isValidTopicLevel(channelId)) {
            throw new TypeError(`${channelId} is not a valid channel identifier`);
        }
        return this._observeRequest(CommunicationEventType.Channel, channelId) as Observable<ChannelEvent>;
    }

    /**
     * Observe matching incoming messages on a raw subscription topic.
     *
     * The observable returned by calling `observeRaw` emits messages as tuples
     * including the actual published topic and the payload. Payload is
     * represented as `Uint8Array` (`Buffer` in Node.js) and needs to be parsed
     * by the application. Use the `toString` method on a payload to convert the
     * raw data to an UTF8 encoded string.
     *
     * Use this method to interoperate with external systems that publish
     * messages on external topics. Use this method together with `publishRaw()`
     * to transfer binary data between Coaty agents.
     *
     * Subscriptions to the returned observable are **automatically
     * unsubscribed** when the communication manager is stopped, in order to
     * release system resources and to avoid memory leaks.
     *
     * @remarks Incoming non-raw Coaty events are *not* dispatched to raw
     * observers.
     *
     * @remarks The specified subscription topic must be a valid MQTT
     * subscription topic. It must be non-empty and must not contain the
     * character `NULL (U+0000)`.
     *
     * @param topic the subscription topic
     * @returns an observable emitting any matching incoming messages as tuples
     * containing the actual topic and the payload as Uint8Array (Buffer in
     * Node.js)
     * @throws if given subscription topic is not in a valid format
     */
    observeRaw(topic: string): Observable<[string, Uint8Array]> {
        if (typeof topic !== "string" ||
            topic.length === 0 ||
            topic.indexOf("\u0000") !== -1) {
            throw new TypeError(`${topic} is not a valid subscription topic`);
        }

        return this._observeRequest(CommunicationEventType.Raw, topic) as Observable<any>;
    }

    /**
     * Observe IO state events for the given IO source or actor.
     *
     * When subscribed the subject immediately emits the current association
     * state.
     * 
     * Subscriptions to the returned subject are **automatically
     * unsubscribed** when the communication manager is stopped, in order to
     * release system resources and to avoid memory leaks.
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
     * Depending on the data format specification of the IO actor
     * (`IoActor.useRawIoValues`), values emitted by the observable are either
     * raw binary (UInt8Array, or Buffer in Node.js) or decoded as JSON objects.
     *
     * Subscriptions to the returned observable are **automatically
     * unsubscribed** when the communication manager is stopped, in order to
     * release system resources and to avoid memory leaks.
     *
     * @returns an observable emitting incoming values for the IO actor
     */
    observeIoValue(ioActor: IoActor): Observable<any | Uint8Array> {
        return this._observeIoValue(ioActor.objectId);
    }

    /**
     * Find discoverable objects and receive Resolve events for them.
     *
     * Note that the Discover event is lazily published when the first observer
     * subscribes to the observable.
     *
     * After all initial subscribers have unsubscribed no more response events
     * will be emitted on the observable and an error will be emitted on
     * resubscription.
     *
     * Subscriptions to the observable are **automatically unsubscribed** when
     * the communication manager is stopped, in order to release system
     * resources and to avoid memory leaks.
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
     * After all initial subscribers have unsubscribed no more response events
     * will be emitted on the observable and an error will be emitted on
     * resubscription.
     *
     * Subscriptions to the observable are **automatically unsubscribed** when
     * the communication manager is stopped, in order to release system
     * resources and to avoid memory leaks.
     *
     * @param event the Query event to be published
     * @returns an observable on which associated Retrieve events are emitted
     */
    publishQuery(event: QueryEvent): Observable<RetrieveEvent> {
        return this._publishClient(event) as Observable<RetrieveEvent>;
    }

    /**
     * Request or propose an update of the specified object and receive
     * accomplishments.
     *
     * Note that the Update event is lazily published when the first observer
     * subscribes to the observable.
     *
     * After all initial subscribers have unsubscribed no more response events
     * will be emitted on the observable and an error will be emitted on
     * resubscription.
     *
     * Subscriptions to the observable are **automatically unsubscribed** when
     * the communication manager is stopped, in order to release system
     * resources and to avoid memory leaks.
     *
     * @param event the Update event to be published
     * @returns an observable of associated Complete events
     */
    publishUpdate(event: UpdateEvent): Observable<CompleteEvent> {
        const coreType = event.data.object.coreType;
        const objectType = event.data.object.objectType;

        // Publish event with core type filter to satisfy core type observers.
        const coreCompletes = this._publishClient(event, coreType);

        // Publish event with object type filter to satisfy object type
        // observers unless the updated object is a core object with a core
        // object type. In this case, object type observers subscribe on the
        // core type followed by a local filter operation to filter out unwanted
        // objects (see `observeUpdate`).
        if (CoreTypes.getObjectTypeFor(coreType) !== objectType) {
            return merge(
                this._publishClient(event, CommunicationTopic.EVENT_TYPE_FILTER_SEPARATOR + objectType),
                coreCompletes) as Observable<CompleteEvent>;
        }
        return coreCompletes as Observable<CompleteEvent>;
    }

    /**
     * Publish a Call event to request execution of a remote operation and
     * receive results.
     *
     * Note that the Call event is lazily published when the first observer
     * subscribes to the observable.
     *
     * After all initial subscribers have unsubscribed no more response events
     * will be emitted on the observable and an error will be emitted on
     * resubscription.
     *
     * Subscriptions to the observable are **automatically unsubscribed** when
     * the communication manager is stopped, in order to release system
     * resources and to avoid memory leaks.
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
        // object type. In this case, object type observers subscribe on the
        // core type followed by a local filter operation to filter out unwanted
        // objects (see `observeAdvertise`).
        if (CoreTypes.getObjectTypeFor(coreType) !== objectType) {
            this._publishClient(event, CommunicationTopic.EVENT_TYPE_FILTER_SEPARATOR + objectType);
        }

        // Ensure a Deadvertise event/last will is emitted for an advertised Identity or IoNode.
        if (coreType === "Identity" || coreType === "IoNode") {
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
     * Publish a raw payload on a given topic. Used to interoperate with
     * external clients that subscribe on the given topic.
     *
     * The topic is an MQTT publication topic, i.e. a non-empty string that must
     * not contain the following characters: `NULL (U+0000)`, `# (U+0023)`, `+
     * (U+002B)`.
     *
     * @param event the Raw event to be published.
     * @throws if given topic is not in a valid format
     */
    publishRaw(event: RawEvent): void;

    /**
     * @deprecated since 2.1.0. Use `publishRaw(event: RawEvent)` instead.
     *  
     * Publish a raw payload on a given topic. Used to interoperate with
     * external clients that subscribe on the given topic.
     * 
     * The topic is an MQTT publication topic, i.e. a non-empty string 
     * that must not contain the following characters: `NULL (U+0000)`, 
     * `# (U+0023)`, `+ (U+002B)`.
     *
     * @param topic the topic on which to publish the given payload
     * @param value a payload string or Uint8Array (Buffer in Node.js) to be published on the given topic
     * @param shouldRetain whether to publish a retained message (default false)
     * @throws if given topic is not in a valid format
     */
    publishRaw(topic: string, value: string | Uint8Array, shouldRetain: boolean): void;

    publishRaw(topicOrEvent: string | RawEvent, value?: string | Uint8Array, shouldRetain?: boolean) {
        if (typeof topicOrEvent === "string") {
            topicOrEvent = RawEvent.withTopicAndPayload(topicOrEvent, value, { shouldRetain: shouldRetain || false });
        }
        if (!CommunicationTopic.isValidPublicationTopic(topicOrEvent.topic)) {
            throw new TypeError(`${topicOrEvent.topic} is not a valid publication topic`);
        }
        this._getPublisher(topicOrEvent.topic, topicOrEvent.data.payload, true, topicOrEvent.options.shouldRetain)();
    }

    /**
     * Publish the given IO value sourced from the specified IO source.
     *
     * No publication is performed if the IO source is currently not associated
     * with any IO actor.
     *
     * The IO value can be either JSON compatible or in binary format as a
     * Uint8Array (or Buffer in Node.js, a subclass thereof). The data format of
     * the given IO value **must** conform to the `useRawIoValues` property of
     * the given IO source. That means, if this property is set to true, the
     * given value must be in binary format; if this property is set to false,
     * the value must be a JSON encodable object. If this constraint is
     * violated, an error is thrown.
     *
     * @param ioSource the IO source for publishing
     * @param value a JSON compatible or binary value to be published
     * @throws if the given value data format does not comply with the
     * `IoSource.useRawIoValues` option
     */
    publishIoValue(ioSource: IoSource, value: any | Uint8Array) {
        const isValueRaw = value instanceof Uint8Array;
        if (isValueRaw && !ioSource.useRawIoValues ||
            !isValueRaw && ioSource.useRawIoValues) {
            throw new Error("IO value data format of given IO source is not compatible with given value");
        }
        this._publishIoValue(ioSource.objectId, value, isValueRaw);
    }

    /**
     * Creates a new topic for routing IO values of the given IO source to
     * associated IO actors.
     *
     * This method is called by IO routers to associate IO sources with IO
     * actors. An IO source uses this topic to publish IO values; an associated
     * IO actor subscribes to this topic to receive these values.
     *
     * @param ioSource the IO source object
     * @returns a topic for submitting data from an IO source to IO actors
     */
    createIoValueTopic(ioSource: IoSource): string {
        return CommunicationTopic.createByLevels(
            CommunicationManager.PROTOCOL_VERSION,
            this.namespace,
            CommunicationEventType.IoValue,
            undefined,
            ioSource.objectId,
            this.runtime.newUuid(),
        ).getTopicName();
    }


    /**
     * Called by an IO router to associate or disassociate an IO source with an
     * IO actor.
     *
     * @internal Used by framework internally. Do not call in application code.
     *
     * @param event the Associate event to be published
     */
    publishAssociate(event: AssociateEvent): void {
        this._publishClient(event, event.eventTypeFilter);
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

    private _initOptions(options?: Partial<CommunicationOptions>) {
        if (options) {
            this._options = Object.assign(this._options || {}, options);
        }

        const namespace = this._options.namespace || CommunicationManager.DEFAULT_NAMESPACE;
        if (!CommunicationTopic.isValidTopicLevel(namespace)) {
            throw new TypeError(`CommunicationManager: namespace '${namespace}' contains invalid characters`);
        }
        this._namespace = namespace;

        const ioNodesConfig = this.runtime.commonOptions?.ioContextNodes || {};
        this._ioNodes = Object.keys(ioNodesConfig)
            .map(contextName => {
                const ioNodeConfig = ioNodesConfig[contextName];
                return <IoNode>{
                    name: contextName,
                    coreType: "IoNode",
                    objectType: CoreTypes.OBJECT_TYPE_IO_NODE,
                    objectId: this.runtime.newUuid(),
                    parentObjectId: this._container.identity.objectId,
                    ioSources: ioNodeConfig.ioSources || [],
                    ioActors: ioNodeConfig.ioActors || [],
                    characteristics: ioNodeConfig.characteristics,
                };
            })
            .filter(node => node.ioSources.length > 0 || node.ioActors.length > 0);

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
        this._isPublishingDeferred = false;
        this._deferredPublications = [];
        this._deferredSubscriptions = [];
        this._deadvertiseIds = [];
    }

    private _startClient() {
        this._deadvertiseIds = [];

        this._observeAssociate();
        this._observeDiscoverIoNodes();
        this._observeDiscoverIdentity();

        const lastWill = this._advertiseIdentityAndIoNodes();

        // Determine connection info and options for MQTT client
        const mqttClientOptions = this.options.mqttClientOptions;
        const brokerUrl = this._getBrokerUrl(this.options.brokerUrl, mqttClientOptions);
        const mqttClientOpts: any = {};

        if (mqttClientOptions && typeof mqttClientOptions === "object") {
            Object.assign(mqttClientOpts, mqttClientOptions);
        }

        this._qos = Math.max(0, Math.min(2, mqttClientOpts.qos ?? 0)) as 0 | 1 | 2;

        if (lastWill) {
            mqttClientOpts.will = lastWill;
            mqttClientOpts.will.qos = this._qos;
        }

        mqttClientOpts.clientId = this._brokerClientId;

        // Support for clean/persistent sessions in broker:
        // If you want to receive QOS 1 and 2 messages that were published while your client was offline, 
        // you need to connect with a unique clientId and set 'clean' to false (MQTT.js default is true).
        mqttClientOpts.clean = mqttClientOpts.clean === undefined ? true : mqttClientOpts?.clean;

        // Do not support automatic resubscription/republication of topics on reconnection by MQTT.js v2
        // because communication manager provides its own implementation.
        //
        // If connection is broken, do not queue outgoing QoS zero messages.
        mqttClientOpts.queueQoSZero = false;
        // If connection is broken and reconnects, subscribed topics are not automatically subscribed again,
        // because this is handled by separate logic inside CommunicationManager.
        mqttClientOpts.resubscribe = false;

        const client = connect(brokerUrl, mqttClientOpts);

        // Assign client so that `_onClientConnected` handler can access it.
        this._client = client;

        this._updateOperatingState(OperatingState.Started);

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
        this._deadvertiseIdentityAndIoNodes();

        const client = this._client;

        // Immediately invalidate the current client instance.
        this._isClientConnected = false;
        this._initClient();

        // Update operating state before asynchrounously ending client so that
        // onCommunicationManagerStopping calls are properly dispatched to
        // controllers by container.
        this._updateOperatingState(OperatingState.Stopped);

        // Note: if force is set to true, the client doesn't 
        // disconnect properly from the broker. It closes the socket
        // immediately, so that the broker publishes client's last will.
        client.end(false, () => {
            // Clean up all event listeners on disposed client instance.
            client.removeAllListeners();
            this._client = undefined;
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
            this._client.subscribe(this._deferredSubscriptions, { qos: this._qos });
        }

        // Apply all deferred offline publications and clear them if
        // successfully published.
        this._triggerPublishDeferred();

        // Emitted on successful (re)connection.
        this._updateCommunicationState(CommunicationState.Online);

        // console.log("CommunicationManager: connected");
    }

    private _onClientReconnect() {
        // Emitted when a reconnect starts.

        // Ensure Advertise events for identity/IO nodes are published on
        // reconnection (via deferredPublications).
        this._advertiseIdentityAndIoNodes();

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
                console.log(`CommunicationManager: ignoring incoming event on ${topicName}: ${error}`);
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
                instance = new AssociateEvent(event.eventTypeFilter, AssociateEventData.createFrom(event.data));
                break;
            case CommunicationEventType.Deadvertise:
                instance = new DeadvertiseEvent(DeadvertiseEventData.createFrom(event.data));
                break;
            case CommunicationEventType.Channel:
                instance = new ChannelEvent(event.eventTypeFilter, ChannelEventData.createFrom(event.data));
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
                this.namespace,
                eventType,
                eventTypeFilter,
                eventSourceId,
                correlationId,
            );
            this._getPublisher(responseTopic.getTopicName(), eventData.toJsonObject())();
            return undefined;
        }

        // Publish a one-way message or a request message for a two-way event
        const topic = CommunicationTopic.createByLevels(
            CommunicationManager.PROTOCOL_VERSION,
            this.namespace,
            eventType,
            eventTypeFilter,
            eventSourceId,
            CommunicationTopic.isOneWayEvent(eventType) ? undefined : this.runtime.newUuid(),
        );

        // Ensure deferred advertisements of identity and IO nodes are always
        // published before any other communication events.
        let shouldPublishDeferredFirst = false;
        let isAdvertiseIdentity = false;
        let isAdvertiseIoNode = false;
        if (eventType === CommunicationEventType.Advertise) {
            const object = (eventData as AdvertiseEventData).object;
            if (object.coreType === "Identity") {
                shouldPublishDeferredFirst = true;
                if (object.objectId === this._container.identity.objectId) {
                    isAdvertiseIdentity = true;
                }
            } else if (object.coreType === "IoNode") {
                shouldPublishDeferredFirst = true;
                if (this._ioNodes.some(group => group.objectId === object.objectId)) {
                    isAdvertiseIoNode = true;
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
            isAdvertiseIoNode);
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
        isAdvertiseIoNode = false) {
        return () => {
            const payload = isDataRaw ? data : JSON.stringify(data);
            const pubOptions: IClientPublishOptions = { qos: this._qos, retain: shouldRetain };
            const deferPublication = () => {
                const msg = {
                    topic: topicName,
                    payload,
                    options: pubOptions,
                    isAdvertiseIdentity,
                    isAdvertiseIoNode,
                };
                if (publishDeferredFirst) {
                    this._deferredPublications.unshift(msg);
                } else {
                    this._deferredPublications.push(msg);
                }
            };
            // Always queue publication so as to keep relative ordering of
            // publications even if publication fails for one of them.
            deferPublication();
            this._triggerPublishDeferred();
        };
    }

    private _triggerPublishDeferred() {
        if (this._isPublishingDeferred) {
            return;
        }
        this._isPublishingDeferred = true;
        this._publishDeferred();
    }

    private _publishDeferred() {
        // Try to publish each pending publication draining them in the order
        // they were queued.
        if (!this._client || !this._deferredPublications || this._deferredPublications.length === 0) {
            this._isPublishingDeferred = false;
            return;
        }

        const next = this._deferredPublications[0];

        this._client.publish(next.topic, next.payload, next.options, err => {
            if (err) {
                // If client is disconnected or disconnecting, keep this
                // publication and all other pending ones queued.
                this._isPublishingDeferred = false;
            } else {
                this._deferredPublications.shift();
                this._publishDeferred();
            }
        });
    }

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
                    this.options.shouldEnableCrossNamespacing ? undefined : this.namespace,
                    eventType,
                    eventTypeFilter,
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
            this.options.shouldEnableCrossNamespacing ? undefined : this.namespace,
            eventType,
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
            this._client.subscribe(topicFilter, { qos: this._qos });
        }
        this._deferredSubscriptions.push(topicFilter);
    }

    private _unsubscribeClient(topicFilters: string | string[]) {
        const updateSubs = (topicFilter: string) => {
            const i = this._deferredSubscriptions.findIndex(f => f === topicFilter);
            if (i !== -1) {
                this._deferredSubscriptions.splice(i, 1);
            }
        };
        if (this._isClientConnected) {
            this._client.unsubscribe(topicFilters);
        }
        if (typeof topicFilters === "string") {
            updateSubs(topicFilters);
        } else {
            topicFilters.forEach(f => updateSubs(f));
        }
    }

    private _unobserveObservedItems() {
        if (this._isClientConnected) {
            this._observedRequests.forEach(item => {
                this._client.unsubscribe(item.topicFilter);
                // Ensure Observable subscriptions are unsubscribed automatically.
                item.dispatchComplete();
            });
            this._observedResponses.forEach(item => {
                this._client.unsubscribe(item.topicFilter);
                // Ensure Observable subscriptions are unsubscribed automatically.
                item.dispatchComplete();
            });
        }
        this._observedRequests.clear();
        this._observedResponses.clear();
        this._deferredSubscriptions = [];
    }

    private _advertiseIdentityAndIoNodes() {
        // Advertise IO nodes once (cp. _observeDiscoverIoNodes).
        this._ioNodes.forEach(group => {
            // Republish only once on failed reconnection attempts.
            if (this._deferredPublications && !this._deferredPublications.find(pub => pub.isAdvertiseIoNode)) {
                this.publishAdvertise(AdvertiseEvent.withObject(group));
            }
        });

        // Advertise identity once (cp. _observeDiscoverIdentity).
        // Republish only once on failed reconnection attempts.
        if (this._deferredPublications && !this._deferredPublications.find(pub => pub.isAdvertiseIdentity)) {
            this.publishAdvertise(AdvertiseEvent.withObject(this._container.identity));
        }

        if (this._deadvertiseIds.length === 0) {
            return undefined;
        }

        // Return the last will message composed of Deadvertise events for
        // identity and IO nodes.
        return {
            topic: CommunicationTopic.createByLevels(
                CommunicationManager.PROTOCOL_VERSION,
                this.namespace,
                CommunicationEventType.Deadvertise,
                undefined,
                this._container.identity.objectId,
                this.runtime.newUuid(),
            ).getTopicName(),
            payload: JSON.stringify(
                new DeadvertiseEventData(this._deadvertiseIds).toJsonObject()),
        };
    }

    private _deadvertiseIdentityAndIoNodes() {
        if (this._deadvertiseIds.length > 0) {
            this.publishDeadvertise(DeadvertiseEvent.withObjectIds(...this._deadvertiseIds));
        }
    }

    private _tryDispatchAsIoValueMessage(topic: string, payload: any): boolean {
        let isDispatching = false;
        try {
            const items = this._ioActorItems.get(topic);
            if (items) {
                items.forEach((sourceIds, actorId) => {
                    const ioValueItem = this._ioValueItems.get(actorId);
                    if (ioValueItem) {
                        const actor = this._findIoPointById(actorId) as IoActor;
                        if (actor) {
                            const value = actor.useRawIoValues ? payload : JSON.parse(payload.toString());
                            isDispatching = true;
                            ioValueItem.dispatchNext(value);
                            isDispatching = false;
                        }
                    }
                });
                return true;
            }
            return false;
        } catch (error) {
            if (isDispatching) {
                throw error;
            }

            console.log(`CommunicationManager: failed to handle incoming IO value message for topic ${topic}': ${error}`);

            return true;
        }
    }

    private _tryDispatchAsRawMessage(topic: string, payload: any): boolean {
        if (!CommunicationTopic.isRawTopic(topic)) {
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
                if (CommunicationTopic.matches(topic, item.topicFilter)) {
                    isDispatching = true;
                    // Dispatch raw data and the actual topic (parsing is up to the application)
                    item.dispatchNext(payload, topic);
                    isDispatching = false;
                }
            });
            return isRawDispatch;
        } catch (error) {
            if (isDispatching) {
                throw error;
            }

            console.log(`CommunicationManager: failed to handle incoming raw topic ${topic}': ${error}`);

            return true;
        }
    }

    private _observeAdvertise(coreType?: CoreType, objectType?: string): Observable<AdvertiseEvent> {
        if (coreType && !CoreTypes.isCoreType(coreType)) {
            throw new TypeError(`${coreType} is not a CoreType`);
        }

        if (objectType && !CommunicationTopic.isValidTopicLevel(objectType)) {
            throw new TypeError(`${objectType} is not a valid object type`);
        }

        // Optimization: in case core objects should be observed by their object
        // type, we do not subscribe on the object type filter but on the core
        // type filter instead, filtering out objects that do not satisfy the
        // core object type (see `publishAdvertise`).
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

    private _observeUpdate(coreType?: CoreType, objectType?: string) {
        if (coreType && !CoreTypes.isCoreType(coreType)) {
            throw new TypeError(`${coreType} is not a CoreType`);
        }

        if (objectType && !CommunicationTopic.isValidTopicLevel(objectType)) {
            throw new TypeError(`${objectType} is not a valid object type`);
        }

        // Optimization: in case core objects should be observed by their object
        // type, we do not subscribe on the object type filter but on the core
        // type filter instead, filtering out objects that do not satisfy the
        // core object type (see `publishUpdate`).
        if (objectType) {
            const objectCoreType = CoreTypes.getCoreTypeFor(objectType);
            if (objectCoreType) {
                return (this._observeRequest(
                    CommunicationEventType.Update,
                    objectCoreType) as Observable<UpdateEvent>)
                    .pipe(filter(event => event.data.object.objectType === objectType));
            }
        }

        return this._observeRequest(
            CommunicationEventType.Update,
            coreType || CommunicationTopic.EVENT_TYPE_FILTER_SEPARATOR + objectType) as Observable<UpdateEvent>;
    }

    private _observeAssociate() {
        this._ioNodes.forEach(group =>
            this._observeRequest(CommunicationEventType.Associate, group.name)
                .subscribe(event => this._handleAssociate(event as AssociateEvent)));
    }

    private _observeDiscoverIoNodes() {
        if (this._ioNodes.length === 0) {
            return;
        }

        this._observeRequest(CommunicationEventType.Discover)
            .pipe(filter((event: DiscoverEvent) =>
                (event.data.isDiscoveringTypes &&
                    event.data.isCoreTypeCompatible("IoNode"))))
            .subscribe((event: DiscoverEvent) =>
                this._ioNodes.forEach(g => event.resolve(ResolveEvent.withObject(g))));
    }

    private _observeDiscoverIdentity() {
        this._observeRequest(CommunicationEventType.Discover)
            .pipe(filter((event: DiscoverEvent) =>
                (event.data.isDiscoveringTypes &&
                    event.data.isCoreTypeCompatible("Identity")) ||
                (event.data.isDiscoveringObjectId &&
                    event.data.objectId === this._container.identity.objectId)))
            .subscribe((event: DiscoverEvent) =>
                event.resolve(ResolveEvent.withObject(this._container.identity)));
    }

    private _findIoPointById(objectId: Uuid) {
        for (const group of this._ioNodes) {
            const source = group.ioSources.find(src => src.objectId === objectId);
            if (source) {
                return source;
            }
            const actor = group.ioActors.find(a => a.objectId === objectId);
            if (actor) {
                return actor;
            }
        }
        return undefined;
    }

    private _handleAssociate(event: AssociateEvent) {
        let isDispatching = false;
        try {
            const ioSourceId = event.data.ioSourceId;
            const ioActorId = event.data.ioActorId;
            const isIoSourceAssociated = this._findIoPointById(ioSourceId) !== undefined;
            const isIoActorAssociated = this._findIoPointById(ioActorId) !== undefined;

            if (!isIoSourceAssociated && !isIoActorAssociated) {
                return;
            }

            const associatingRoute = event.data.associatingRoute;

            if (associatingRoute !== undefined &&
                !CommunicationTopic.isValidIoValueTopic(associatingRoute, CommunicationManager.PROTOCOL_VERSION)) {
                // tslint:disable-next-line: max-line-length
                console.log(`CommunicationManager: associating route of incoming ${event.eventType} event is invalid: '${associatingRoute}'`);
                return;
            }

            // Update own IO source associations
            if (isIoSourceAssociated) {
                this._updateIoSourceItems(ioSourceId, ioActorId, associatingRoute, event.data.updateRate);
            }

            // Update own IO actor associations
            if (isIoActorAssociated) {
                if (associatingRoute !== undefined) {
                    this._associateIoActorItems(ioSourceId, ioActorId, associatingRoute);
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
                    if (associatingRoute !== undefined) {
                        actorIds = this._ioActorItems.get(associatingRoute);
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

    private _updateIoSourceItems(ioSourceId: Uuid, ioActorId: Uuid, associatingRoute: string, updateRate: number) {
        let items = this._ioSourceItems.get(ioSourceId);
        if (associatingRoute !== undefined) {
            if (!items) {
                items = [associatingRoute, [ioActorId], updateRate];
                this._ioSourceItems.set(ioSourceId, items);
            } else {
                if (items[0] === associatingRoute) {
                    if (items[1].indexOf(ioActorId) === -1) {
                        items[1].push(ioActorId);
                    }
                } else {
                    // Disassociate current IO actors due to a topic change.
                    const oldRoute = items[0];
                    items[0] = associatingRoute;
                    items[1].forEach(actorId =>
                        this._disassociateIoActorItems(ioSourceId, actorId, oldRoute));
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

    private _associateIoActorItems(ioSourceId: Uuid, ioActorId: Uuid, associatingRoute: string) {
        // Disassociate any association for the given IO source and IO actor.
        this._disassociateIoActorItems(ioSourceId, ioActorId, undefined, associatingRoute);

        let items = this._ioActorItems.get(associatingRoute);
        if (!items) {
            items = new Map<Uuid, Uuid[]>();
            items.set(ioActorId, [ioSourceId]);
            this._ioActorItems.set(associatingRoute, items);

            // Issue subscription just once for each associated route
            // to avoid receiving multiple published IO events later.
            this._subscribeClient(associatingRoute);
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
        associatingRoute?: Uuid) {
        const routesToUnsubscribe: string[] = [];
        const handler = (items: Map<Uuid, Uuid[]>, route: string) => {
            if (associatingRoute === route) {
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
                    routesToUnsubscribe.push(route);
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

        routesToUnsubscribe.forEach(route => this._ioActorItems.delete(route));
        this._unsubscribeClient(routesToUnsubscribe);
    }

    private _cleanupIoState() {
        // Dispatch IO state events to all IO state observers
        this._ioStateItems.forEach((item, pointId) => {
            try {
                item.dispatchNext(IoStateEvent.with(false, undefined));
                // Ensure subscriptions on IO state observable are unsubscribed automatically
                item.dispatchComplete();
            } catch {
                // Ignore errors thrown in callbacks
            }
        });

        // Unsubscribe all association topics subscribed for IO actors
        this._ioActorItems.forEach((actorIds, topic) => {
            if (this._isClientConnected) {
                this._client.unsubscribe(topic);
            }
        });

        // Ensure subscriptions on IO value item observables are unsubscribed automatically
        this._ioValueItems.forEach(item => {
            try {
                item.dispatchComplete();
            } catch {
                // Ignore errors thrown in callbacks
            }
        });
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

    private _observeIoValue(ioActorId: Uuid): Observable<any | Uint8Array> {
        let item = this._ioValueItems.get(ioActorId);
        if (!item) {
            item = new AnyValueItem();
            this._ioValueItems.set(ioActorId, item);
        }
        return item.observable;
    }

    private _publishIoValue(ioSourceId: Uuid, value: any | Uint8Array, isValueRaw: boolean) {
        const items = this._ioSourceItems.get(ioSourceId);
        if (items) {
            this._getPublisher(items[0], value, isValueRaw)();
        }
    }

}

abstract class SubscriberItem<T> {
    private _subscribers: Array<Subscriber<T | [string, T]>>;

    constructor() {
        this._subscribers = [];
    }

    dispatchNext(message: T, topic?: string) {
        // Ensure proper removal of subscribers that unsubscribe in callback.
        for (let i = this._subscribers.length - 1; i >= 0; i--) {
            this._subscribers[i].next(topic ? [topic, message] : message);
        }
    }

    dispatchComplete() {
        // Ensure proper removal of subscribers that unsubscribe in callback.
        for (let i = this._subscribers.length - 1; i >= 0; i--) {
            this._subscribers[i].complete();
        }
    }

    dispatchError(error: any) {
        // Ensure proper removal of subscribers that unsubscribe in callback.
        for (let i = this._subscribers.length - 1; i >= 0; i--) {
            this._subscribers[i].error(error);
        }
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

            // Called when the subscriber is unsubscribed
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
