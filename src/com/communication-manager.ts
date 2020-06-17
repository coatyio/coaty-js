/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { BehaviorSubject, merge, Observable, Subscriber } from "rxjs";
import { distinctUntilChanged, filter, map } from "rxjs/operators";

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
import {
    CommunicationBindingProtocol,
    CommunicationBindingState,
    CommunicationEventLike,
    CommunicationEventType,
    CommunicationState,
} from "./communication-binding";
import { CommunicationEvent, CommunicationEventData, TopicEvent, TopicEventData } from "./communication-event";
import { DeadvertiseEvent, DeadvertiseEventData } from "./deadvertise";
import { DiscoverEvent, DiscoverEventData, ResolveEvent, ResolveEventData } from "./discover-resolve";
import { IoStateEvent } from "./io-state";
import { IoValueEvent } from "./io-value";
import { QueryEvent, QueryEventData, RetrieveEvent, RetrieveEventData } from "./query-retrieve";
import { RawEvent, RawEventData } from "./raw";
import { CompleteEvent, CompleteEventData, UpdateEvent, UpdateEventData } from "./update-complete";

import { MqttBinding } from "./mqtt/mqtt-binding";

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

    private _configOptions: CommunicationOptions;
    private _options: CommunicationOptions;
    private _binding: CommunicationBindingProtocol;
    private _ioNodes: IoNode[];
    private _isDisposed: boolean;

    // Tracks the current communication state.
    private _communicationStateSubject: BehaviorSubject<CommunicationState>;

    // Tracks the current operating state.
    private _operatingStateSubject: BehaviorSubject<OperatingState>;

    // Observables for inbound request events (mapped by event type string).
    private _observedRequests: Map<string, ObservedRequestItem>;

    // Observables for inbound response events (mapped by correlation ID).
    private _observedResponses: Map<Uuid, ObservedResponseItem>;

    // IO state observables for own IO sources and actors (mapped by IO point ID).
    private _observedIoStateItems: Map<Uuid, IoStateItem>;

    // Own IO sources with associating route, actor ids, and updateRate (mapped
    // by IO source ID).
    private _ioSourceItems: Map<Uuid, [string, Uuid[], number]>;

    // Own IO actors with associated source ids (mapped by associating route).
    private _ioActorItems: Map<string, Map<Uuid, Uuid[]>>;

    // IO value observables for own IO actors (mapped by IO actor ID).
    private _observedIoValueItems: Map<Uuid, AnyValueItem>;

    /**
     * @internal - For use in framework only.
     */
    constructor(private _container: Container, options: CommunicationOptions) {
        this._configOptions = options || {};
        this._isDisposed = false;
        this._communicationStateSubject = new BehaviorSubject(CommunicationState.Offline);
        this._operatingStateSubject = new BehaviorSubject(OperatingState.Stopped);
        this._initObservedItems();
        this._initOptions();
    }

    /**
     * Gets the container's Runtime object.
     */
    get runtime() {
        return this._container.runtime;
    }

    /**
     * Gets the communication manager's current effective communication options
     * (read-only).
     *
     * @remarks The effective options are based on the communication options
     * specified in the configuration, augmented by local partial communication
     * options specified in the `start()` method. So, effective options may
     * change whenever this communication manager is restarted.
     */
    get options(): Readonly<CommunicationOptions> {
        return this._options;
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
     * Starts or restarts this communication manager joining the communication
     * infrastructure with effective communication options specified in the
     * configuration augmented by those in the optional `options` parameter.
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
    start(options?: Partial<CommunicationOptions>): Promise<void> {
        if (!options) {
            if (this._binding.state === CommunicationBindingState.Initialized) {
                this._joinBinding();
            }
            return Promise.resolve();
        }
        return this._unjoinBinding(options)
            .then(() => this._joinBinding());
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
        return this.start(options);
    }

    /**
     * Stops dispatching and emitting communication events and unjoins from the
     * communication infrastructure.
     *
     * To continue processing with this communication manager sometime later,
     * invoke `start()`, but not before the returned promise resolves.
     *
     * @returns a promise that is resolved when communication manager has
     * unjoined the communication infrastructure.
     */
    stop(): Promise<void> {
        return this._unjoinBinding();
    }

    /**
     * Observe communication state changes.
     *
     * When subscribed the observable immediately emits the current
     * communication state.
     *
     * @returns an observable emitting communication state changes
     */
    observeCommunicationState(): Observable<CommunicationState> {
        return this._communicationStateSubject.pipe(distinctUntilChanged());
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
        return this._operatingStateSubject.asObservable();
    }

    /**
     * Observe Discover events.
     * 
     * Subscriptions to the returned observable are **automatically
     * unsubscribed** when the communication manager is stopped, in order to
     * release system resources and to avoid memory leaks.
     *
     * @returns an observable emitting inbound Discover events
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
     * @returns an observable emitting inbound Query events
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
     * @returns an observable emitting inbound Update events
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
     * @returns an observable emitting inbound Update events
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
     * in inbound Call event data to determine whether the Call event should be
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
     * @returns an observable emitting inbound Call events whose context filter
     * matches the given context
     * @throws if given operation name is not in a valid format
     */
    observeCall(operation: string, context?: CoatyObject): Observable<CallEvent> {
        if (!CommunicationEvent.isValidEventFilter(operation)) {
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
     * @returns an observable emitting inbound Advertise events
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
     * @returns an observable emitting inbound Advertise events
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
     * @returns an observable emitting inbound Deadvertise events
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
     * @returns an observable emitting inbound Channel events
     * @throws if given channelId is not in a valid format
     */
    observeChannel(channelId: string): Observable<ChannelEvent> {
        if (!CommunicationEvent.isValidEventFilter(channelId)) {
            throw new TypeError(`${channelId} is not a valid channel identifier`);
        }
        return this._observeRequest(CommunicationEventType.Channel, channelId) as Observable<ChannelEvent>;
    }

    /**
     * Observe matching inbound messages on a raw subscription topic.
     *
     * This method returns an observable that emits messages as tuples including
     * the actual publication topic and the payload. Payload is represented as
     * `Uint8Array` (or Buffer` in Node.js, a subclass thereof) and needs to be
     * decoded by the application. Use the `toString` method on a payload to
     * convert the raw data to a UTF8 encoded string.
     *
     * Use this method to interoperate with external systems that publish
     * messages on external topics. Use this method together with `publishRaw()`
     * to transfer arbitrary binary data between Coaty agents.
     *
     * Subscriptions to the returned observable are **automatically
     * unsubscribed** when the communication manager is stopped, in order to
     * release system resources and to avoid memory leaks.
     *
     * @remarks To unobserve a given raw subscription topic, simply unsubscribe
     * any subscriptions on the returned observable, either explicitely or
     * implicitely (by using RX operators such as `take` or `takeUntil`).
     *
     * @remarks Inbound non-raw Coaty events are *not* dispatched to raw
     * observers.
     *
     * @remarks The specified subscription topic must be in a valid,
     * binding-specific format that corresponds with the configured
     * communication binding.
     *
     * @remarks Depending on the communication binding used, pattern-based
     * subscription topics may include all wildcards in the topic string (e.g.
     * MQTT) or may be specified in the subscription options (e.g. WAMP).
     *
     * @param topic binding-specific subscription topic
     * @param options binding-specific subscription options (optional)
     * @returns an observable emitting any matching inbound messages as tuples
     * containing the actual topic and the payload as Uint8Array (or Buffer in
     * Node.js, a subclass thereof)
     */
    observeRaw(topic: string, options?: { [key: string]: any; }): Observable<[string, Uint8Array]> {
        // @todo Coaty 3: change return type to RawEvent and remove pipe.
        return (this._observeRequest(CommunicationEventType.Raw, topic, options) as Observable<RawEvent>)
            .pipe(map(rawEvent => [rawEvent.topic, rawEvent.data.payload as Uint8Array]));
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
     * raw binary (Uint8Array, or Buffer in Node.js) or decoded as JSON objects.
     *
     * Subscriptions to the returned observable are **automatically
     * unsubscribed** when the communication manager is stopped, in order to
     * release system resources and to avoid memory leaks.
     *
     * @returns an observable emitting inbound values for the IO actor
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
        return this._publishEvent(event) as Observable<ResolveEvent>;
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
        return this._publishEvent(event) as Observable<RetrieveEvent>;
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
        const coreCompletes = this._publishEvent(event, coreType);

        // Publish event with object type filter to satisfy object type
        // observers unless the updated object is a core object with a core
        // object type. In this case, object type observers subscribe on the
        // core type followed by a local filter operation to filter out unwanted
        // objects (see `observeUpdate`).
        if (CoreTypes.getObjectTypeFor(coreType) !== objectType) {
            return merge(
                this._publishEvent(event, ":" + objectType),
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
        return this._publishEvent(event, event.operation) as Observable<ReturnEvent>;
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
        this._publishEvent(event, coreType);

        // Publish event with object type filter to satisfy object type
        // observers unless the advertised object is a core object with a core
        // object type. In this case, object type observers subscribe on the
        // core type followed by a local filter operation to filter out unwanted
        // objects (see `observeAdvertise`).
        if (CoreTypes.getObjectTypeFor(coreType) !== objectType) {
            this._publishEvent(event, ":" + objectType);
        }
    }

    /**
     * Notify subscribers that an advertised object has been deadvertised.
     *
     * @param event the Deadvertise event to be published
     */
    publishDeadvertise(event: DeadvertiseEvent): void {
        this._publishEvent(event);
    }

    /**
     * Publish a channel event.
     *
     * @param event the Channel event to be published
     */
    publishChannel(event: ChannelEvent): void {
        this._publishEvent(event, event.channelId);
    }

    /**
     * Publish a raw payload on a given topic. 
     *
     * Use this method to interoperate with external systems that subscribe on this
     * topic. Use this method together with `observeRaw()` to transfer arbitrary
     * binary data between Coaty agents.
     *
     * @remarks The publication topic of the Raw event must be in a valid
     * binding-specific format that corresponds with the configured communication
     * binding. The Raw event is not published if the topic is invalid or has a
     * Coaty-like shape.
     *
     * @param event the Raw event for publishing
     */
    publishRaw(event: RawEvent): void;

    /**
     * @deprecated since 2.1.0. Use `publishRaw(event: RawEvent)` instead.
     *
     * Publish a raw payload on a given topic. Used to interoperate with
     * external clients that subscribe on a matching topic.
     *
     * The topic is an MQTT publication topic, i.e. a non-empty string that must
     * not contain the following characters: `NULL (U+0000)`, `# (U+0023)`, `+
     * (U+002B)`.
     *
     * @param topic the topic on which to publish the given payload
     * @param value a payload string or Uint8Array (or Buffer in Node.js, a
     * subclass thereof) to be published on the given topic
     * @param shouldRetain whether to publish a retained message (default false)
     */
    publishRaw(topic: string, value: string | Uint8Array, shouldRetain?: boolean): void;

    publishRaw(topicOrEvent: string | RawEvent, value?: string | Uint8Array, shouldRetain?: boolean) {
        if (typeof topicOrEvent === "string") {
            topicOrEvent = RawEvent.withTopicAndPayload(topicOrEvent, value, { retain: shouldRetain || false });
        }
        this._binding.publish(this._createEventLike(topicOrEvent, topicOrEvent.topic));
    }

    /**
     * Publish the given IoValue event.
     *
     * No publication is performed if the event's IO source is currently not
     * associated with any IO actor.
     *
     * @param event the IoValue event for publishing
     */
    publishIoValue(event: IoValueEvent);

    /**
     * @deprecated since 2.1.0. Use `publishIoValue(event: IoValueEvent)` instead.
     * 
     * Publish the given IO value sourced from the specified IO source.
     *
     * No publication is performed if the IO source is currently not associated
     * with any IO actor.
     *
     * @param ioSource the IO source for publishing
     * @param value a JSON compatible or binary value to be published
     */
    publishIoValue(ioSource: IoSource, value: any | Uint8Array);

    publishIoValue(ioSourceOrEvent: IoSource | IoValueEvent, value?: any | Uint8Array) {
        if (!(ioSourceOrEvent instanceof IoValueEvent)) {
            ioSourceOrEvent = IoValueEvent.with(ioSourceOrEvent, value);
        }
        const items = this._ioSourceItems.get(ioSourceOrEvent.ioSource.objectId);
        if (items) {
            ioSourceOrEvent.topic = items[0];
            this._binding.publish(this._createEventLike(ioSourceOrEvent, ioSourceOrEvent.topic));
        }
    }

    /**
     * Creates a new IO route for routing IO values of the given IO source to associated IO
     * actors.
     *
     * This method is called by IO routers to associate IO sources with IO actors. An IO
     * source publishes IO values on this route; an associated IO actor observes this route
     * to receive these values.
     *
     * @param ioSource the IO source object
     * @returns an associating topic for routing IO values
     */
    createAssociatingRoute(ioSource: IoSource): string {
        return this._binding.createIoRoute(ioSource.objectId);
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
        if (!CommunicationEvent.isValidEventFilter(event.eventTypeFilter)) {
            console.log(`[CommunicationManager] [err] ioContextName '${event.eventTypeFilter}' in Associate event contains invalid characters`);
            return;
        }
        this._publishEvent(event, event.eventTypeFilter);
    }

    /**
     * Perform clean-up side effects, such as stopping the communication manager and
     * deallocating resources.
     */
    onDispose() {
        if (this._isDisposed) {
            return;
        }

        this._isDisposed = true;
        this._unjoinBinding();
    }

    /* Initializations */

    private _initObservedItems() {
        this._observedRequests = new Map<string, ObservedRequestItem>();
        this._observedResponses = new Map<Uuid, ObservedResponseItem>();
        this._observedIoStateItems = new Map<Uuid, IoStateItem>();
        this._observedIoValueItems = new Map<Uuid, AnyValueItem>();
        this._ioSourceItems = new Map<Uuid, [string, Uuid[], number]>();
        this._ioActorItems = new Map<string, Map<Uuid, Uuid[]>>();
    }

    private _initOptions(options?: Partial<CommunicationOptions>) {
        this._options = { ...this._configOptions, ...(options || {}) };

        // Validate communication namespace.
        const namespace = this._options.namespace || this._options.binding?.options.namespace;
        if (namespace !== undefined && !CommunicationEvent.isValidEventFilter(namespace)) {
            console.log(`[CommunicationManager] [err] namespace '${namespace}' contains invalid characters`);
        }

        // Set up IO Nodes.
        const ioNodesConfig = this.runtime.commonOptions?.ioContextNodes || {};
        this._ioNodes = Object.keys(ioNodesConfig)
            .filter(contextName => {
                if (CommunicationEvent.isValidEventFilter(contextName)) {
                    return true;
                }
                console.log(`[CommunicationManager] [err] ioContextName '${contextName}' in ioContextNodes contains invalid characters`);
                return false;
            })
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

        // Set up binding.
        const bindingWithOptions = this._options.binding || MqttBinding.withOptions({
            namespace: this._options.namespace,
            shouldEnableCrossNamespacing: this._options.shouldEnableCrossNamespacing || false,
            brokerUrl: this._options.brokerUrl,
            tlsOptions: { ...this._options.mqttClientOptions },
        });

        this._binding = new bindingWithOptions.type(bindingWithOptions.options);

        const bindingName = `${this._binding.apiName}${this._binding.apiVersion}`;
        this._binding.on("debug", debug => console.log(`[${bindingName}] [dbg] ${debug}`));
        this._binding.on("info", info => console.log(`[${bindingName}] [inf] ${info}`));
        this._binding.on("error", error => console.log(`[${bindingName}] [err] ${error}`));
        this._binding.on("communicationState", state => this._communicationStateSubject.next(state));
        this._binding.on("inboundEvent", eventLike => this._dispatchEvent(eventLike));
    }

    private _updateOperatingState(newState: OperatingState) {
        if (this._operatingStateSubject.getValue() !== newState) {
            this._operatingStateSubject.next(newState);
        }
    }

    /* Managing binding */

    private _joinBinding() {
        const identity = this._container.identity;
        const joinEvents: AdvertiseEvent[] = [];

        // Advertise identity when joining (cp. _observeDiscoverIdentity).
        joinEvents.push(AdvertiseEvent.withObject(identity));

        // Advertise IO nodes when joining (cp. _observeDiscoverIoNodes).
        this._ioNodes.forEach(ioNode => {
            joinEvents.push(AdvertiseEvent.withObject(ioNode));
        });

        // Deadvertise identity and IO nodes when unjoining.
        const unjoinEvent = DeadvertiseEvent.withObjectIds(...joinEvents.map(e => e.data.object.objectId));

        this._binding.join({
            agentId: identity.objectId,

            // Advertise identity and IO nodes as core types only.
            joinEvents: joinEvents.map(e => this._createEventLike(e, e.data.object.coreType)),

            unjoinEvent: this._createEventLike(unjoinEvent),
        });

        this._observeAssociate();
        this._observeDiscoverIoNodes();
        this._observeDiscoverIdentity();

        this._updateOperatingState(OperatingState.Started);
    }

    private _unjoinBinding(options?: Partial<CommunicationOptions>) {
        // Update operating state before asynchrounously unjoining binding so that
        // onCommunicationManagerStopping calls are properly dispatched to controllers
        // by the container.
        this._updateOperatingState(OperatingState.Stopped);

        // Stop dispatching inbound events to observables.
        this._unobserveObservedItems();

        const binding = this._binding;

        // Prepare a new binding from given options for subsequent publications and
        // subscriptions before the current binding is unjoined. If the
        // communication manager is already disposed keep the old binding in place,
        // as any further publications and subscriptions on it are discarded.
        if (!this._isDisposed) {
            this._initOptions(options);
        }

        return binding.unjoin();
    }

    /* Publishing events */

    private _publishEvent(
        event: CommunicationEvent<CommunicationEventData>,
        eventTypeFilter?: string,
        correlationId?: string): Observable<CommunicationEvent<CommunicationEventData>> {

        // Publish a response message for a two-way event.
        if (correlationId) {
            this._binding.publish(this._createEventLike(event, eventTypeFilter, correlationId));
            return undefined;
        }

        const responseType = event.responseEventType;

        if (responseType !== undefined) {
            // Lazily publish a request event for a two-way event. Subscribe for response
            // event and postpone publishing request event until the first observer
            // subscribes on the observable.
            const corrId = this.runtime.newUuid();
            return this._observeResponse(
                event,
                corrId,
                () => this._binding.publish(this._createEventLike(event, eventTypeFilter, corrId)));
        }

        // Publish one-way request event immediately, returning undefined.
        this._binding.publish(this._createEventLike(event, eventTypeFilter));
        return undefined;
    }

    /**
     * Create an event like for the given outbound event to be published.
     *
     * @remarks No validation type check on event's data is performed as this
     * has already been done on event instantiation.
     */
    private _createEventLike(
        event: CommunicationEvent<CommunicationEventData>,
        eventTypeFilter?: string,
        correlationId?: string): CommunicationEventLike {
        const jsonData = event.data.toJsonObject();
        return {
            eventType: event.eventType,
            eventTypeFilter,
            sourceId: this._container.identity.objectId,
            correlationId,
            // Provide raw data if specified for topic-based events.
            isDataRaw: jsonData === undefined,
            data: jsonData === undefined ? (event.data as TopicEventData).payload : jsonData,
            options: event instanceof TopicEvent ? event.options : undefined,
        };
    }

    /* Observing one-way and two-way events */

    private _observeAdvertise(coreType?: CoreType, objectType?: string): Observable<AdvertiseEvent> {
        if (coreType && !CoreTypes.isCoreType(coreType)) {
            throw new TypeError(`${coreType} is not a CoreType`);
        }

        if (objectType && !CommunicationEvent.isValidEventFilter(objectType)) {
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
            coreType || ":" + objectType) as Observable<AdvertiseEvent>;
    }

    private _observeUpdate(coreType?: CoreType, objectType?: string) {
        if (coreType && !CoreTypes.isCoreType(coreType)) {
            throw new TypeError(`${coreType} is not a CoreType`);
        }

        if (objectType && !CommunicationEvent.isValidEventFilter(objectType)) {
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
            coreType || ":" + objectType) as Observable<UpdateEvent>;
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
                (event.data.isDiscoveringTypes && event.data.isCoreTypeCompatible("IoNode"))))
            .subscribe((event: DiscoverEvent) =>
                this._ioNodes.forEach(n => event.resolve(ResolveEvent.withObject(n))));
    }

    private _observeDiscoverIdentity() {
        this._observeRequest(CommunicationEventType.Discover)
            .pipe(filter((event: DiscoverEvent) =>
                (event.data.isDiscoveringTypes && event.data.isCoreTypeCompatible("Identity")) ||
                (event.data.isDiscoveringObjectId && event.data.objectId === this._container.identity.objectId)))
            .subscribe((event: DiscoverEvent) =>
                event.resolve(ResolveEvent.withObject(this._container.identity)));
    }

    private _observeRequest(
        eventType: CommunicationEventType,
        eventTypeFilter?: string,
        options?: { [key: string]: any }) {
        const requestId = this._getRequestId(eventType, eventTypeFilter);
        let item = this._observedRequests.get(requestId);

        if (!item) {
            const eventLike: CommunicationEventLike = {
                eventType,
                eventTypeFilter,
                options,
                isDataRaw: eventType === CommunicationEventType.Raw,
            };
            const cleanup = () => {
                this._observedRequests.delete(requestId);
                this._binding.unsubscribe(eventLike);
            };
            item = new ObservedRequestItem(eventLike, cleanup);
            this._observedRequests.set(requestId, item);
            this._binding.subscribe(eventLike);
        }

        return item.observable;
    }

    private _observeResponse(
        request: CommunicationEvent<CommunicationEventData>,
        correlationId: string,
        publisher: () => void) {
        const eventLike = { eventType: request.responseEventType, correlationId };
        const cleanup = (itm: ObservedResponseItem) => {
            this._observedResponses.delete(itm.correlationId);
            this._binding.unsubscribe(eventLike);
        };
        const item = new ObservedResponseItem(request, correlationId, publisher, cleanup);
        this._observedResponses.set(correlationId, item);
        this._binding.subscribe(eventLike);
        return item.createObservable();
    }

    private _unobserveObservedItems() {
        // Ensure all observed events and observable subscriptions are unsubscribed
        // and cleaned up.
        this._unobserveIoStateAndValue();
        this._observedRequests.forEach(item => {
            item.dispatchComplete();
        });
        this._observedResponses.forEach(item => {
            item.dispatchComplete();
        });
        this._initObservedItems();
    }

    private _getRequestId(eventType: CommunicationEventType, requestFilter?: string) {
        let name = CommunicationEventType[eventType];
        if (requestFilter) {
            name += requestFilter;
        }
        return name;
    }

    /* Inbound event dispatching */

    private _dispatchEvent(eventLike: CommunicationEventLike) {
        if (eventLike.eventType === CommunicationEventType.IoValue) {
            this._dispatchIoValue(eventLike);
            return;
        }
        if (eventLike.eventType === CommunicationEventType.Complete ||
            eventLike.eventType === CommunicationEventType.Resolve ||
            eventLike.eventType === CommunicationEventType.Retrieve ||
            eventLike.eventType === CommunicationEventType.Return) {

            // Dispatch inbound two-way response message to associated observable.
            const item = this._observedResponses.get(eventLike.correlationId);
            if (item === undefined) {
                // There are no subscribers for this response event, or
                // correlation ID is missing, skip event.
                return;
            }

            if (item.request.eventType === CommunicationEventType.Update &&
                eventLike.eventType !== CommunicationEventType.Complete) {
                console.log(`[CommunicationManager] [err] expected Complete response event for Update`);
                return;
            }
            if (item.request.eventType === CommunicationEventType.Discover &&
                eventLike.eventType !== CommunicationEventType.Resolve) {
                console.log(`[CommunicationManager] [err] expected Resolve response event for Discover`);
                return;
            }
            if (item.request.eventType === CommunicationEventType.Query &&
                eventLike.eventType !== CommunicationEventType.Retrieve) {
                console.log(`[CommunicationManager] [err] expected Retrieve response event for Query`);
                return;
            }
            if (item.request.eventType === CommunicationEventType.Call &&
                eventLike.eventType !== CommunicationEventType.Return) {
                console.log(`[CommunicationManager] [err] expected Return response event for Call`);
                return;
            }

            try {
                const event = this._createEventInstance(eventLike, item.request);

                switch (event.eventType) {
                    case CommunicationEventType.Complete:
                        const completeEvent = event as CompleteEvent;
                        completeEvent.eventRequest.ensureValidResponseParameters(completeEvent.data);
                        break;
                    case CommunicationEventType.Resolve:
                        const resolveEvent = event as ResolveEvent;
                        resolveEvent.eventRequest.ensureValidResponseParameters(resolveEvent.data);
                        break;
                    case CommunicationEventType.Retrieve:
                        const retrieveEvent = event as RetrieveEvent;
                        retrieveEvent.eventRequest.ensureValidResponseParameters(retrieveEvent.data);
                        break;
                    case CommunicationEventType.Return:
                        const returnEvent = event as ReturnEvent;
                        returnEvent.eventRequest.ensureValidResponseParameters(returnEvent.data);
                        break;
                }

                item.dispatchNext(event);
            } catch (error) {
                console.log(`[CommunicationManager] [err] inbound response event data is not valid: ${error}`);
                return;
            }
        } else {
            // Dispatch inbound request message (one-way or two-way) to associated observable.
            // Note that echo messages are also dispatched.
            const item = this._observedRequests.get(this._getRequestId(
                eventLike.eventType,
                eventLike.eventType === CommunicationEventType.Raw ? eventLike.correlationId : eventLike.eventTypeFilter));
            if (item === undefined) {
                // There are no subscribers for this request event, discard it.
                return;
            }

            try {
                const event = this._createEventInstance(eventLike);
                const correlationId = eventLike.correlationId;

                if (event instanceof DiscoverEvent) {
                    event.resolve = (resolveEvent: ResolveEvent) => {
                        event.ensureValidResponseParameters(resolveEvent.data);
                        this._publishEvent(resolveEvent, undefined, correlationId);
                    };
                } else if (event instanceof QueryEvent) {
                    event.retrieve = (retrieveEvent: RetrieveEvent) => {
                        event.ensureValidResponseParameters(retrieveEvent.data);
                        this._publishEvent(retrieveEvent, undefined, correlationId);
                    };
                } else if (event instanceof UpdateEvent) {
                    event.complete = (completeEvent: CompleteEvent) => {
                        event.ensureValidResponseParameters(completeEvent.data);
                        this._publishEvent(completeEvent, undefined, correlationId);
                    };
                } else if (event instanceof CallEvent) {
                    event.returnEvent = (returnEvent: ReturnEvent) => {
                        event.ensureValidResponseParameters(returnEvent.data);
                        this._publishEvent(returnEvent, undefined, correlationId);
                    };
                }

                item.dispatchNext(event);
            } catch (error) {
                console.log(`[CommunicationManager] [err] inbound request event data is not valid: ${error}`);
                return;
            }
        }
    }

    private _dispatchIoValue(eventLike: CommunicationEventLike) {
        // Lookup registered IO actor items for the given IO route and dispatch IO value
        // to the corresponding IO actors. The IO route is external if and only if
        // eventLike.sourceId is undefined.
        const items = this._ioActorItems.get(eventLike.correlationId);
        if (items) {
            items.forEach((sourceIds, actorId) => {
                const ioValueItem = this._observedIoValueItems.get(actorId);
                if (ioValueItem) {
                    ioValueItem.dispatchNext(eventLike.data);
                }
            });
        }
    }

    /**
     * Create a new inbound event instance from the specified inbound event like object
     * (except IoValue events).
     *
     * @remarks Performs a validation type check to ensure that the given event data is valid.
     *
     * @param eventLike an event like object created from an inbound message
     * @returns a new event instance created from the given event like object
     * @throws if event data of the given event like object is not valid
     */
    private _createEventInstance(
        eventLike: CommunicationEventLike,
        requestEvent?: CommunicationEvent<CommunicationEventData>): CommunicationEvent<CommunicationEventData> {
        let instance: CommunicationEvent<CommunicationEventData>;
        switch (eventLike.eventType) {
            case CommunicationEventType.Advertise:
                instance = new AdvertiseEvent(AdvertiseEventData.createFrom(eventLike.data));
                break;
            case CommunicationEventType.Associate:
                instance = new AssociateEvent(eventLike.eventTypeFilter, AssociateEventData.createFrom(eventLike.data));
                break;
            case CommunicationEventType.Deadvertise:
                instance = new DeadvertiseEvent(DeadvertiseEventData.createFrom(eventLike.data));
                break;
            case CommunicationEventType.Channel:
                instance = new ChannelEvent(eventLike.eventTypeFilter, ChannelEventData.createFrom(eventLike.data));
                break;
            case CommunicationEventType.Discover:
                instance = new DiscoverEvent(DiscoverEventData.createFrom(eventLike.data));
                break;
            case CommunicationEventType.Resolve:
                instance = new ResolveEvent(ResolveEventData.createFrom(eventLike.data));
                break;
            case CommunicationEventType.Query:
                instance = new QueryEvent(QueryEventData.createFrom(eventLike.data));
                break;
            case CommunicationEventType.Retrieve:
                instance = new RetrieveEvent(RetrieveEventData.createFrom(eventLike.data));
                break;
            case CommunicationEventType.Update:
                instance = new UpdateEvent(UpdateEventData.createFrom(eventLike.data));
                break;
            case CommunicationEventType.Complete:
                instance = new CompleteEvent(CompleteEventData.createFrom(eventLike.data));
                break;
            case CommunicationEventType.Call:
                instance = new CallEvent(eventLike.eventTypeFilter, CallEventData.createFrom(eventLike.data));
                break;
            case CommunicationEventType.Return:
                instance = new ReturnEvent(ReturnEventData.createFrom(eventLike.data));
                break;
            case CommunicationEventType.Raw:
                instance = new RawEvent(eventLike.eventTypeFilter, RawEventData.createFrom(eventLike.data));
                break;
            default:
                throw new TypeError(`Couldn't create event instance for event type ${eventLike.eventType}`);
        }
        instance.sourceId = eventLike.sourceId;
        instance.eventRequest = requestEvent;
        return instance;
    }

    /* IO Routing */

    private _findIoPointById(objectId: Uuid) {
        for (const ioNode of this._ioNodes) {
            const source = ioNode.ioSources.find(src => src.objectId === objectId);
            if (source) {
                return source;
            }
            const actor = ioNode.ioActors.find(a => a.objectId === objectId);
            if (actor) {
                return actor;
            }
        }
        return undefined;
    }

    private _handleAssociate(event: AssociateEvent) {
        const ioSourceId = event.data.ioSourceId;
        const ioActorId = event.data.ioActorId;
        const ioActor = this._findIoPointById(ioActorId) as IoActor;
        const isIoSourceAssociated = this._findIoPointById(ioSourceId) !== undefined;
        const isIoActorAssociated = ioActor !== undefined;

        if (!isIoSourceAssociated && !isIoActorAssociated) {
            return;
        }

        const ioRoute = event.data.associatingRoute;

        // Update own IO source associations
        if (isIoSourceAssociated) {
            this._updateIoSourceItems(ioSourceId, ioActorId, ioRoute, event.data.updateRate);
        }

        // Update own IO actor associations
        if (isIoActorAssociated) {
            if (ioRoute !== undefined) {
                this._associateIoActorItems(ioSourceId, ioActor, ioRoute, event.data.isExternalRoute);
            } else {
                this._disassociateIoActorItems(ioSourceId, ioActorId);
            }
        }

        // Dispatch IO state events to associated observables
        if (isIoSourceAssociated) {
            const item = this._observedIoStateItems.get(ioSourceId);
            if (item) {
                const items = this._ioSourceItems.get(ioSourceId);
                item.dispatchNext(IoStateEvent.with(
                    items !== undefined && items[1] !== undefined,
                    items ? items[2] : undefined));
            }
        }
        if (isIoActorAssociated) {
            const item = this._observedIoStateItems.get(ioActorId);
            if (item) {
                let actorIds: Map<Uuid, Uuid[]>;
                if (ioRoute !== undefined) {
                    actorIds = this._ioActorItems.get(ioRoute);
                }
                item.dispatchNext(IoStateEvent.with(
                    actorIds !== undefined &&
                    actorIds.has(ioActorId) &&
                    actorIds.get(ioActorId).length > 0));
            }
        }
    }

    private _updateIoSourceItems(ioSourceId: Uuid, ioActorId: Uuid, ioRoute: string, updateRate: number) {
        let items = this._ioSourceItems.get(ioSourceId);
        if (ioRoute !== undefined) {
            if (!items) {
                items = [ioRoute, [ioActorId], updateRate];
                this._ioSourceItems.set(ioSourceId, items);
            } else {
                if (items[0] === ioRoute) {
                    if (items[1].indexOf(ioActorId) === -1) {
                        items[1].push(ioActorId);
                    }
                } else {
                    // Disassociate current IO actors due to a route change.
                    const previousRoute = items[0];
                    items[0] = ioRoute;
                    items[1].forEach(actorId =>
                        this._disassociateIoActorItems(ioSourceId, actorId, previousRoute));
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

    private _associateIoActorItems(ioSourceId: Uuid, ioActor: IoActor, ioRoute: string, isExternalRoute: boolean) {
        const ioActorId = ioActor.objectId;

        // Disassociate any active association for the given IO source and IO actor.
        this._disassociateIoActorItems(ioSourceId, ioActorId, undefined, ioRoute);

        let items = this._ioActorItems.get(ioRoute);
        if (!items) {
            items = new Map<Uuid, Uuid[]>();
            items.set(ioActorId, [ioSourceId]);
            this._ioActorItems.set(ioRoute, items);
            this._binding.subscribe({
                eventType: CommunicationEventType.IoValue,
                eventTypeFilter: ioRoute,
                isDataRaw: ioActor.useRawIoValues,
                isExternalIoRoute: isExternalRoute,
            });
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
        currentIoRoute?: string,
        newIoRoute?: string) {
        const ioRoutesToUnsubscribe: string[] = [];
        const handler = (items: Map<Uuid, Uuid[]>, route: string) => {
            if (newIoRoute === route) {
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
                    ioRoutesToUnsubscribe.push(route);
                }
            }
        };

        if (currentIoRoute) {
            const items = this._ioActorItems.get(currentIoRoute);
            if (items) {
                handler(items, currentIoRoute);
            }
        } else {
            this._ioActorItems.forEach(handler);
        }

        ioRoutesToUnsubscribe.forEach(route => {
            this._ioActorItems.delete(route);
            this._binding.unsubscribe({ eventType: CommunicationEventType.IoValue, eventTypeFilter: route });
        });
    }

    private _unobserveIoStateAndValue() {
        // Dispatch IO state events to all IO state observers.
        this._observedIoStateItems.forEach((item, pointId) => {
            item.dispatchNext(IoStateEvent.with(false, undefined));

            // Ensure subscriptions on IO state observables are unsubscribed automatically.
            item.dispatchComplete();
        });

        // Clean up current IO routes of all IO actors.
        this._ioActorItems.forEach((actorIds, ioRoute) => {
            this._binding.unsubscribe({ eventType: CommunicationEventType.IoValue, eventTypeFilter: ioRoute });
        });

        // Ensure subscriptions on IO value item observables are unsubscribed automatically.
        this._observedIoValueItems.forEach(item => item.dispatchComplete());
    }

    private _observeIoState(ioPointId: Uuid): BehaviorSubject<IoStateEvent> {
        let item = this._observedIoStateItems.get(ioPointId);
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
            this._observedIoStateItems.set(ioPointId, item);
        }
        return item.subject;
    }

    private _observeIoValue(ioActorId: Uuid): Observable<any | Uint8Array> {
        let item = this._observedIoValueItems.get(ioActorId);
        if (!item) {
            item = new AnyValueItem();
            this._observedIoValueItems.set(ioActorId, item);
        }
        return item.observable;
    }

}

abstract class SubscriberItem<T> {
    private _subscribers: Array<Subscriber<T>>;

    constructor() {
        this._subscribers = [];
    }

    dispatchNext(message: T) {
        // Ensure proper removal of subscribers that unsubscribe in callback.
        for (let i = this._subscribers.length - 1; i >= 0; i--) {
            this._subscribers[i].next(message);
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

    protected add(subscriber: Subscriber<T>) {
        this._subscribers.push(subscriber);
    }

    protected remove(subscriber: Subscriber<T>) {
        const subscriberIndex = this._subscribers.indexOf(subscriber);
        if (subscriberIndex !== -1) {
            this._subscribers.splice(subscriberIndex, 1);
        }
    }
}

class ObservedRequestItem extends SubscriberItem<CommunicationEvent<CommunicationEventData>> {
    observable: Observable<CommunicationEvent<CommunicationEventData>>;

    constructor(public eventLike: CommunicationEventLike, private cleanup: () => void) {
        super();
        this.observable = this._createObservable();
    }

    private _createObservable(): Observable<CommunicationEvent<CommunicationEventData>> {
        return Observable.create((subscriber: Subscriber<CommunicationEvent<CommunicationEventData>>) => {
            this.add(subscriber);

            // Called when a subscription is unsubscribed
            return () => {
                this.remove(subscriber);

                if (this.subscriberCount === 0) {
                    // The last observer has unsubscribed, clean up the item
                    this.cleanup && this.cleanup();
                    this.cleanup = undefined;
                }
            };
        });
    }
}

class ObservedResponseItem extends SubscriberItem<CommunicationEvent<CommunicationEventData>> {
    private _cleanup: (item: ObservedResponseItem) => void;
    private _hasLastObserverUnsubscribed: boolean;

    constructor(
        public request: CommunicationEvent<CommunicationEventData>,
        public correlationId: string,
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
