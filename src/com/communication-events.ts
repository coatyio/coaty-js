/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { IoActor, IoSource } from "../model/io-point";
import { CoatyObject, Component, Uuid } from "../model/object";
import { ObjectFilter, ObjectFilterCondition, ObjectFilterOperator, ObjectFilterProperties } from "../model/object-filter";
import { ObjectJoinCondition } from "../model/object-join";
import { ObjectMatcher } from "../model/object-matcher";
import { CoreType, CoreTypes } from "../model/types";

/**
 * Predefined event types used by Coaty communication event patterns to
 *  discover, distribute, and share data.
 */
export enum CommunicationEventType {
    Raw,
    Advertise,
    Deadvertise,
    Channel,
    Discover,
    Resolve,
    Query,
    Retrieve,
    Update,
    Complete,
    Associate,
    IoValue,
}

/**
 * Base generic communication event class
 */
export abstract class CommunicationEvent<T extends CommunicationEventData> {

    eventType: CommunicationEventType;
    eventRequest: CommunicationEvent<CommunicationEventData> = undefined;

    private _eventSource: Component;
    private _eventSourceId: Uuid;
    private _eventData: T;
    private _eventUserId: Uuid | string;

    /**
     * @deprecated since version 1.5.0. Please use static constructors
     * of the matching CommunicationEvent.
     * 
     * Create an event instance for the given event type.
     *
     * @param eventSource source component associated with this event
     * @param eventData data associated with this event
     */
    constructor(eventSource: Component, eventData: T) {
        const source: any = eventSource;

        // This is to support passing a UUID as event source 
        // (for internal use such as validation checks).
        if ((typeof source === "string") && source.length > 0) {
            this._eventSource = undefined;
            this._eventSourceId = source;
        } else if (CoreTypes.isObject(source, "Component")) {
            this._eventSource = eventSource;
            this._eventSourceId = eventSource.objectId;
        } else {
            throw new TypeError("in CommunicationEvent<T>: argument 'eventSource' is not a Component");
        }

        this._eventData = eventData;
    }

    /**
     * Gets the event source component associated with this event.
     * Returns undefined if the source component is not available
     * but only its ID (via `eventSourceId`). This is always the
     * case on the receiving, i.e. observing side, since the
     * message topic only transmits the source ID but not the source
     * object itself.
     */
    get eventSource() {
        return this._eventSource;
    }

    /**
     * Gets the event source object ID associated with this event.
     */
    get eventSourceId() {
        return this._eventSourceId;
    }

    /**
     * Gets the event data associated with this event.
     */
    get eventData() {
        return this._eventData;
    }

    /**
     * Gets the user ID associated with this event.
     * Returns undefined if this is not a user-associated event.
     */
    get eventUserId() {
        return this._eventUserId;
    }

    /**
     * @private
     *
     * Sets the user ID associated with this event.
     * For framework-internal use only. Do not use in application code.
     */
    set eventUserId(userId: Uuid | string) {
        this._eventUserId = userId;
    }

}

/**
 * Discover event.
 */
export class DiscoverEvent extends CommunicationEvent<DiscoverEventData> {

    get eventType() {
        return CommunicationEventType.Discover;
    }

    /**
     * Respond to an observed Discover event by returning the given event.
     *
     * @param event a Resolve event
     */
    resolve: (event: ResolveEvent) => void;

    /**
     * Create a DiscoverEvent instance for discovering objects with the given external Id.
     * 
     * @param eventSource the event source component
     * @param externalId the external ID to discover
     */
    static withExternalId(eventSource: Component, externalId: string) {
        return new DiscoverEvent(eventSource, new DiscoverEventData(externalId));
    }

    /**
     * Create a DiscoverEvent instance for discovering objects with the given external Id and core types.
     * 
     * @param eventSource the event source component
     * @param externalId the external ID to discover
     * @param coreTypes an array of core types to discover
     */
    static withExternalIdAndCoreTypes(eventSource: Component, externalId: string, coreTypes: CoreType[]) {
        return new DiscoverEvent(eventSource, new DiscoverEventData(externalId, undefined, undefined, coreTypes));
    }

    /**
     * Create a DiscoverEvent instance for discovering objects with the given external Id and object types.
     * 
     * @param eventSource the event source component
     * @param externalId the external ID to discover
     * @param objectTypes an array of object types to discover
     */
    static withExternalIdAndObjectTypes(eventSource: Component, externalId: string, objectTypes: string[]) {
        return new DiscoverEvent(eventSource, new DiscoverEventData(externalId, undefined, objectTypes, undefined));
    }

    /**
     * Create a DiscoverEvent instance for discovering objects with the given object Id.
     * 
     * @param eventSource the event source component
     * @param objectId the object ID to discover
     */
    static withObjectId(eventSource: Component, objectId: Uuid) {
        return new DiscoverEvent(eventSource, new DiscoverEventData(undefined, objectId));
    }

    /**
     * Create a DiscoverEvent instance for discovering objects with the given external Id and object Id.
     * 
     * @param eventSource the event source component
     * @param externalId the external ID to discover
     * @param objectId the object ID to discover
     */
    static withExternalAndObjectId(eventSource: Component, externalId: string, objectId: Uuid) {
        return new DiscoverEvent(eventSource, new DiscoverEventData(externalId, objectId));
    }

    /**
     * Create a DiscoverEvent instance for discovering objects with the given core types.
     * 
     * @param eventSource the event source component
     * @param coreTypes the core types to discover
     */
    static withCoreTypes(eventSource: Component, coreTypes: CoreType[]) {
        return new DiscoverEvent(eventSource, new DiscoverEventData(undefined, undefined, undefined, coreTypes));
    }

    /**
     * Create a DiscoverEvent instance for discovering objects with the given object types.
     * 
     * @param eventSource the event source component
     * @param objectTypes the object types to discover
     */
    static withObjectTypes(eventSource: Component, objectTypes: string[]) {
        return new DiscoverEvent(eventSource, new DiscoverEventData(undefined, undefined, objectTypes, undefined));
    }

    /**
     * @Internal
     * Throws an error if the given Resolve event data does not correspond to 
     * the event data of this Discover event.
     * @param eventData event data for Resolve response event
     */
    ensureValidResponseParameters(eventData: ResolveEventData) {
        if (this.eventData.coreTypes !== undefined && eventData.object) {
            if (!this.eventData.coreTypes.some(t => t === eventData.object.coreType)) {
                throw new TypeError("resolved coreType not contained in Discover coreTypes");
            }
        }

        if (this.eventData.objectTypes !== undefined && eventData.object) {
            if (!this.eventData.objectTypes.some(t => t === eventData.object.objectType)) {
                throw new TypeError("resolved objectType not contained in Discover objectTypes");
            }
        }

        if (this.eventData.objectId && eventData.object) {
            if (this.eventData.objectId !== eventData.object.objectId) {
                throw new TypeError("resolved object's UUID doesn't match Discover objectId");
            }
        }

        if (this.eventData.externalId && eventData.object) {
            if (this.eventData.externalId !== eventData.object.externalId) {
                throw new TypeError("resolved object's external ID doesn't match Discover externalId");
            }
        }
    }
}

/**
 * Resolve event with associated request event.
 */
export class ResolveEvent extends CommunicationEvent<ResolveEventData> {

    get eventType() {
        return CommunicationEventType.Resolve;
    }

    /**
     * Associated request event
     */
    eventRequest: DiscoverEvent;

    /**
     * Create a ResolveEvent instance for resolving the given object.
     *
     * @param eventSource the event source component
     * @param object the object to be resolved
     * @param relatedObjects related objects to be resolved (optional)
     * @param privateData private data object (optional)
     */
    static withObject(eventSource: Component, object: CoatyObject, relatedObjects?: CoatyObject[], privateData?: any) {
        return new ResolveEvent(eventSource, new ResolveEventData(object, relatedObjects, privateData));
    }

    /**
     * Create a ResolveEvent instance for resolving the given related objects.
     * 
     * @static
     * @param eventSource the event source component
     * @param relatedObjects related objects to be resolved
     * @param privateData private data object (optional)
     */
    static withRelatedObjects(eventSource: Component, relatedObjects: CoatyObject[], privateData?: any) {
        return new ResolveEvent(eventSource, new ResolveEventData(undefined, relatedObjects, privateData));
    }
}

/**
 * Query event.
 */
export class QueryEvent extends CommunicationEvent<QueryEventData> {

    get eventType() {
        return CommunicationEventType.Query;
    }

    /**
     * Respond to an observed Query event by returning the given event.
     *
     * @param event a Retrieve event
     */
    retrieve: (event: RetrieveEvent) => void;

    /**
     * Create a QueryEvent instance for querying the given object types, filter, and join conditions.
     * The object filter and join conditions are optional.
     *
     * @param eventSource the event source component
     * @param objectTypes restrict results by object types (logical OR).
     * @param objectFilter restrict results by object filter (optional).
     * @param objectJoinConditions join related objects into results (optional).
     */
    static withObjectTypes(
        eventSource: Component,
        objectTypes: string[],
        objectFilter?: ObjectFilter,
        objectJoinConditions?: ObjectJoinCondition | ObjectJoinCondition[]) {
        return new QueryEvent(eventSource, new QueryEventData(objectTypes, undefined, objectFilter, objectJoinConditions));
    }

    /**
     * Create a QueryEvent instance for querying the given core types, filter, and join conditions.
     * The object filter and join conditions are optional.
     *
     * @param eventSource the event source component
     * @param coreTypes restrict results by core types (logical OR).
     * @param objectFilter restrict results by object filter (optional).
     * @param objectJoinConditions join related objects into results (optional).
     */
    static withCoreTypes(
        eventSource: Component,
        coreTypes: CoreType[],
        objectFilter?: ObjectFilter,
        objectJoinConditions?: ObjectJoinCondition | ObjectJoinCondition[]) {
        return new QueryEvent(eventSource, new QueryEventData(undefined, coreTypes, objectFilter, objectJoinConditions));
    }

    /**
     * @Internal
     * Throws an error if the given Retrieve event data does not correspond to 
     * the event data of this Query event.
     * @param eventData event data for Retrieve response event
     */
    ensureValidResponseParameters(eventData: RetrieveEventData) {
        for (const obj of eventData.objects) {
            if (this.eventData.coreTypes !== undefined) {
                if (!this.eventData.coreTypes.some(t => t === obj.coreType)) {
                    throw new TypeError("retrieved coreType not contained in Query coreTypes");
                }
            }
            if (this.eventData.objectTypes !== undefined) {
                if (!this.eventData.objectTypes.some(t => t === obj.objectType)) {
                    throw new TypeError("retrieved objectType not contained in Query objectTypes");
                }
            }
        }
    }
}

/**
 * Retrieve event with associated request event.
 */
export class RetrieveEvent extends CommunicationEvent<RetrieveEventData> {

    get eventType() {
        return CommunicationEventType.Retrieve;
    }

    /**
     * Associated request event
     */
    eventRequest: QueryEvent;

    /**
     * Create a RetrieveEvent instance for the given objects.
     * 
     * @param eventSource the event source component
     * @param objects the objects to be retrieved
     * @param privateData  private data object (optional)
     */
    static withObjects(eventSource: Component, objects: CoatyObject[], privateData?: any) {
        return new RetrieveEvent(eventSource, new RetrieveEventData(objects, privateData));
    }
}

/**
 * Update event.
 */
export class UpdateEvent extends CommunicationEvent<UpdateEventData> {

    get eventType() {
        return CommunicationEventType.Update;
    }

    /**
     * Respond to an observed Update event by sending the given Complete event.
     *
     * @param event a Complete event
     */
    complete: (event: CompleteEvent) => void;

    /**
     * Create an UpdateEvent instance for the given partial update.
     * 
     * @param eventSource the event source component
     * @param objectId the UUID of the object to be updated (partial update)
     * @param changedValues Object hash for properties that have changed or should be changed (partial update)
     * @param object the object to be updated (for full updates)
     */
    static withPartial(eventSource: Component, objectId: Uuid, changedValues: { [property: string]: any; }) {
        return new UpdateEvent(eventSource, new UpdateEventData(objectId, changedValues));
    }

    /**
     * Create an UpdateEvent instance for the given full update.
     * 
     * @param eventSource the event source component
     * @param object the full object to be updated
     */
    static withFull(eventSource: Component, object: CoatyObject) {
        return new UpdateEvent(eventSource, new UpdateEventData(undefined, undefined, object));
    }

    /**
     * @Internal
     * Throws an error if the given Complete event data does not correspond to 
     * the event data of this Update event.
     * @param eventData event data for Complete response event
     */
    ensureValidResponseParameters(eventData: CompleteEventData) {
        if (this.eventData.isPartialUpdate &&
            this.eventData.objectId !== eventData.object.objectId) {
            throw new TypeError("object ID of Complete event doesn't match object ID of Update event");
        }

        if (this.eventData.isFullUpdate &&
            this.eventData.object.objectId !== eventData.object.objectId) {
            throw new TypeError("object ID of Complete event doesn't match object ID of Update event");
        }
    }
}

/**
 * Complete event with associated request event.
 */
export class CompleteEvent extends CommunicationEvent<CompleteEventData> {

    get eventType() {
        return CommunicationEventType.Complete;
    }

    /**
     * Associated request event
     */
    eventRequest: UpdateEvent;

    /**
     * Create a CompleteEvent instance for updating the given object.
     * 
     * @param eventSource the event source component
     * @param object the updated object
     * @param privateData application-specific options (optional)
     */
    static withObject(eventSource: Component, object: CoatyObject, privateData?: any) {
        return new CompleteEvent(eventSource, new CompleteEventData(object, privateData));
    }
}

/**
 * Advertise event.
 */
export class AdvertiseEvent extends CommunicationEvent<AdvertiseEventData> {

    /**
     * Create an AdvertiseEvent instance for advertising the given object.
     * 
     * @param eventSource the event source component
     * @param object the object to be advertised
     * @param privateData application-specific options (optional)
     */
    static withObject(eventSource: Component, object: CoatyObject, privateData?: any) {
        return new AdvertiseEvent(eventSource, new AdvertiseEventData(object, privateData));
    }

    get eventType() {
        return CommunicationEventType.Advertise;
    }
}

/**
 * Deadvertise event.
 */
export class DeadvertiseEvent extends CommunicationEvent<DeadvertiseEventData> {

    /**
     * Create a DeadvertiseEvent instance for deadvertising the given object IDs.
     * 
     * @param eventSource the event source component
     * @param objectIds object IDs to be deadvertised
     */
    static withObjectIds(eventSource: Component, ...objectIds: string[]) {
        return new DeadvertiseEvent(eventSource, new DeadvertiseEventData(...objectIds));
    }

    get eventType() {
        return CommunicationEventType.Deadvertise;
    }
}

/**
 * Channel event.
 */
export class ChannelEvent extends CommunicationEvent<ChannelEventData> {

    get eventType() {
        return CommunicationEventType.Channel;
    }

    get channelId() {
        return this._channelId;
    }

    private _channelId: string;

    /**
     * Create a Channel event instance.
     * 
     * The channel identifier must be a non-empty string that does not contain
     * the following characters: `NULL (U+0000)`, `# (U+0023)`, `+ (U+002B)`,
     * `/ (U+002F)`.
     * 
     * @param eventSource source component associated with this Channel event
     * @param channelId the channel identifier of this Channel event
     * @param eventData data associated with this Channel event
     */
    constructor(
        eventSource: Component,
        channelId: string,
        eventData: ChannelEventData) {
        super(eventSource, eventData);

        if (!ChannelEvent.isChannelIdValid(channelId)) {
            throw new TypeError("in ChannelEvent: argument 'channelId' is not a valid channel identifier");
        }

        this._channelId = channelId;
    }

    static isChannelIdValid(channelId: string) {
        return typeof channelId === "string" && channelId.length > 0 &&
            channelId.indexOf("\u0000") === -1 && channelId.indexOf("#") === -1 &&
            channelId.indexOf("+") === -1 && channelId.indexOf("/") === -1;
    }

    /**
     * Create a ChannelEvent instance for delivering the given object.
     * 
     * @param eventSource the event source component
     * @param object the object to be channelized
     * @param privateData application-specific options (optional)
     */
    static withObject(eventSource: Component, channelId: string, object: CoatyObject, privateData?: any) {
        return new ChannelEvent(eventSource, channelId, new ChannelEventData(object, undefined, privateData));
    }

    /**
     * Create a ChannelEvent instance for delivering the given objects.
     * 
     * @param eventSource the event source component
     * @param objects the objects to be channelized
     * @param privateData application-specific options (optional)
     */
    static withObjects(eventSource: Component, channelId: string, objects: CoatyObject[], privateData?: any) {
        return new ChannelEvent(eventSource, channelId, new ChannelEventData(undefined, objects, privateData));
    }
}

/**
 * Associate event.
 */
export class AssociateEvent extends CommunicationEvent<AssociateEventData> {

    /**
     * Create an AssociateEvent instance for associating the given IO source/actor.
     * 
     * @param eventSource the event source component
     * @param ioSource the IO source object to associate/disassociate
     * @param ioActor the IO actor object to associate/disassociate
     * @param associatedTopic the topic used by IO source and IO actor, or undefined for disassocation
     * @param updateRate the recommended update rate (in millis) for publishing IO source values (optional)
     */
    static with(
        eventSource: Component,
        ioSource: IoSource,
        ioActor: IoActor,
        associatedTopic: string,
        updateRate?: number) {
        return new AssociateEvent(eventSource, new AssociateEventData(ioSource, ioActor, associatedTopic, updateRate));
    }

    get eventType() {
        return CommunicationEventType.Associate;
    }
}

/**
 * IoState event. This event is only used and emitted
 * by the observable returned by `CommunicationManager.observeIoState`.
 */
export class IoStateEvent {

    get eventData() {
        return this._eventData;
    }

    private _eventData: IoStateEventData;

    constructor(eventData: IoStateEventData) {
        this._eventData = eventData;
    }

    /**
     * Create an IoStateEvent instance for describing an IO state.
     * 
     * @param hasAssociations determines whether the related IO source/actor has associations
     * @param updateRate the recommended update rate (in millis) for publishing IO source values (optional)
     */
    static with(hasAssociations: boolean, updateRate?: number) {
        return new IoStateEvent(new IoStateEventData(hasAssociations, updateRate));
    }
}

/**
 * The base class for communication event data
 */
export abstract class CommunicationEventData {

    /**
     * Returns an object with event data properties to be serialized by JSON
     */
    abstract toJsonObject(): { [key: string]: any };
}

/**
 * Defines event data format for discovering objects based on external and
 * object IDs or object types.
 */
export class DiscoverEventData extends CommunicationEventData {

    /**
     * The external ID of the object(s) to be discovered.
     * Can be used exclusively or in combination with objectId property.
     * If used exclusively it can be combined with objectTypes or coreTypes properties.
     */
    get externalId() {
        return this._externalId;
    }

    /**
     * The internal UUID of the object to be discovered.
     * Can be used exclusively or in combination with externalId property.
     * Must not be used in combination with objectTypes or coreTypes properties.
     */
    get objectId() {
        return this._objectId;
    }

    /**
     * Restrict objects by object types (logical OR).
     * Not to be used with objectId property.
     * Should not be used in combination with coreTypes.
     */
    get objectTypes() {
        return this._objectTypes;
    }

    /**
     * Restrict objects by core types (logical OR).
     * Not to be used with objectId property.
     * Should not be used in combination with objectTypes.
     */
    get coreTypes() {
        return this._coreTypes;
    }

    /**
     * Determines whether this event data discovers an object based on an external ID.
     */
    get isDiscoveringExternalId() {
        return this._externalId !== undefined && this._objectId === undefined;
    }

    /**
     * Determines whether this event data discovers an object based on an object ID.
     */
    get isDiscoveringObjectId() {
        return this._externalId === undefined && this._objectId !== undefined;
    }

    /**
     * Determines whether this event data discovers an object based on both
     * external ID and object ID.
     */
    get isDiscoveringExternalAndObjectId() {
        return this._externalId !== undefined && this._objectId !== undefined;
    }

    /**
     * Determines whether this event data discovers an object based
     * on types only.
     */
    get isDiscoveringTypes() {
        return this._externalId === undefined && this._objectId === undefined;
    }

    private _externalId: string;
    private _objectId: Uuid;
    private _objectTypes: string[];
    private _coreTypes: CoreType[];

    /**
     * Create a DiscoverEventData instance for the given IDs or types.
     * 
     * The following combinations of parameters are valid (use undefined for unused parameters):
     * - externalId can be used exclusively or in combination with objectId property.
     *   Only if used exclusively it can be combined with objectTypes or coreTypes properties.
     * - objectId can be used exclusively or in combination with externalId property.
     *   Must not be used in combination with objectTypes or coreTypes properties.
     * - objectTypes must not be used with objectId property.
     *   Should not be used in combination with coreTypes.
     * - coreTypes must not be used with objectId property.
     *   Should not be used in combination with objectTypes.
     *
     * @param externalId The external ID of the object(s) to be discovered or undefined.
     * @param objectId The internal UUID of the object to be discovered or undefined.
     * @param objectTypes Restrict objects by object types (logical OR).
     * @param coreTypes Restrict objects by core types (logical OR).
     */
    constructor(
        externalId?: string,
        objectId?: Uuid,
        objectTypes?: string[],
        coreTypes?: CoreType[]) {
        super();

        this._externalId = externalId;
        this._objectId = objectId;
        this._objectTypes = objectTypes;
        this._coreTypes = coreTypes;

        if (!this._hasValidParameters()) {
            throw new TypeError("in DiscoverEventData: arguments not valid");
        }
    }

    static createFrom(eventData: any): DiscoverEventData {
        return new DiscoverEventData(
            eventData.externalId,
            eventData.objectId,
            eventData.objectTypes,
            eventData.coreTypes);
    }

    /**
     * Determines whether the given CoreType is compatible with this event data.
     * Returns true, if the specified core type is contained in the coreTypes property;
     * false otherwise.
     * @param coreType name of the core type to check
     */
    isCoreTypeCompatible(coreType: CoreType) {
        return this.coreTypes && this.coreTypes.some(t => t === coreType);
    }

    /**
     * Determines whether the given ObjectType is compatible with this event data.
     * Returns true, if the specified type is contained in the objectTypes property;
     * false otherwise.
     * @param objectType name of the object type to check
     */
    isObjectTypeCompatible(objectType: string) {
        return this.objectTypes && this.objectTypes.some(t => t === objectType);
    }

    /**
     * Determines whether the given object matches the requirements of this event data.
     * Matches all specified fields (objectId, externalId, coreType and objectType).
     * Returns false for undefined objects.
     * @param object CoatyObject to match with the event data specifications.
     */
    matchesObject(object: CoatyObject): boolean {
        if (!object) {
            return false;
        }

        return (this._objectId === undefined || object.objectId === this._objectId)
            && (this._externalId === undefined || object.externalId === this._externalId)
            && (this._coreTypes === undefined || this.coreTypes.some(t => t === object.coreType))
            && (this._objectTypes === undefined || this.objectTypes.some(t => t === object.objectType));
    }

    toJsonObject() {
        return {
            externalId: this._externalId,
            objectId: this._objectId,
            objectTypes: this._objectTypes,
            coreTypes: this._coreTypes,
        };
    }

    private _hasValidParameters(): boolean {
        return (
            (typeof this._objectId === "string" &&
                this._externalId === undefined &&
                this._objectTypes === undefined &&
                this._coreTypes === undefined) ||
            (typeof this._externalId === "string" &&
                this._objectId === undefined &&
                (this._objectTypes === undefined ||
                    CoreTypes.isStringArray(this._objectTypes)) &&
                (this._coreTypes === undefined ||
                    CoreTypes.isCoreTypeArray(this._coreTypes))) ||
            (typeof this._objectId === "string" &&
                typeof this._externalId === "string" &&
                this._objectTypes === undefined &&
                this._coreTypes === undefined) ||
            (this._objectId === undefined &&
                this._externalId === undefined &&
                ((this._objectTypes === undefined &&
                    CoreTypes.isCoreTypeArray(this._coreTypes)) ||
                    (this._coreTypes === undefined &&
                        CoreTypes.isStringArray(this._objectTypes)))));
    }

}

/**
 * Defines event data format for resolving objects.
 */
export class ResolveEventData extends CommunicationEventData {

    /**
     * The object to be resolved (may be undefined if relatedObjects property
     * is defined).
     */
    get object() {
        return this._object;
    }

    /**
     * Related objects, i.e. child objects to be resolved (may be undefined
     * if object property is defined).
     */
    get relatedObjects() {
        return this._relatedObjects;
    }

    /**
     * Application-specific options as an object hash (optional).
     */
    get privateData() {
        return this._privateData;
    }

    private _object: CoatyObject;
    private _relatedObjects: CoatyObject[];
    private _privateData: { [key: string]: any; };

    /**
     * Create an instance of ResolveEventData.
     * At least one of the parameters `object` or `relatedObjects` is
     * required. The `privateData` parameter is optional.
     *
     * @param object The object to be resolved.
     * @param relatedObjects Related objects, i.e. child objects to be resolved.
     * @param privateData Application-specific options (optional).
     */
    constructor(
        object?: CoatyObject,
        relatedObjects?: CoatyObject[],
        privateData?: any) {
        super();

        this._object = object;
        this._relatedObjects = relatedObjects;
        this._privateData = privateData;

        if (!this._hasValidParameters()) {
            throw new TypeError("in ResolveEventData: arguments not valid");
        }
    }

    static createFrom(eventData: any): ResolveEventData {
        return new ResolveEventData(
            eventData.object,
            eventData.relatedObjects,
            eventData.privateData);
    }

    toJsonObject() {
        return {
            object: this._object,
            relatedObjects: this._relatedObjects,
            privateData: this._privateData,
        };
    }

    private _hasValidParameters(): boolean {
        if (!this._isValidPrivateData()) {
            return false;
        }

        if (this._relatedObjects === undefined &&
            CoreTypes.isObject(this._object)) {
            return true;
        }
        if (this._object === undefined &&
            CoreTypes.isObjectArray(this._relatedObjects)) {
            return true;
        }
        if (CoreTypes.isObject(this._object) &&
            CoreTypes.isObjectArray(this._relatedObjects)) {
            return true;
        }

        return false;
    }

    private _isValidPrivateData() {
        return this._privateData === undefined ||
            (this._privateData &&
                typeof this._privateData === "object");
    }
}

/**
 * Defines event data format for querying objects based on object types, object filters,
 * and object join conditions.
 */
export class QueryEventData extends CommunicationEventData {

    /**
     * Restrict objects by object types (logical OR).
     * Should not be used in combination with coreTypes.
     */
    get objectTypes() {
        return this._objectTypes;
    }

    /**
     * Restrict objects by core types (logical OR).
     * Should not be used in combination with objectTypes.
     */
    get coreTypes() {
        return this._coreTypes;
    }

    /**
     * Restrict objects by an object filter.
     */
    get objectFilter() {
        return this._objectFilter;
    }

    /**
     * Join related objects by join conditions.
     */
    get objectJoinConditions() {
        return this._objectJoinConditions;
    }

    private _objectTypes: string[];
    private _coreTypes: CoreType[];
    private _objectFilter: ObjectFilter;
    private _objectJoinConditions: ObjectJoinCondition | ObjectJoinCondition[];

    /**
     * Create a QueryEventData instance for the given type, filter, and join conditions.
     * Exactly one of objectTypes or coreTypes parameters must be specified (use undefined
     * for the other parameter). The object filter and join conditions are optional.
     *
     * @param objectTypes Restrict results by object types (logical OR).
     * @param coreTypes Restrict results by core types (logical OR).
     * @param objectFilter Restrict results by object filter (optional).
     * @param objectJoinConditions Join related objects into results (optional).
     */
    constructor(
        objectTypes?: string[],
        coreTypes?: CoreType[],
        objectFilter?: ObjectFilter,
        objectJoinConditions?: ObjectJoinCondition | ObjectJoinCondition[]) {
        super();

        this._objectTypes = objectTypes;
        this._coreTypes = coreTypes;
        this._objectFilter = objectFilter;
        this._objectJoinConditions = objectJoinConditions;

        if (!this._hasValidParameters()) {
            throw new TypeError("in QueryEventData: arguments not valid");
        }
    }

    static createFrom(eventData: any): QueryEventData {
        return new QueryEventData(
            eventData.objectTypes,
            eventData.coreTypes,
            eventData.objectFilter,
            eventData.objectJoinConditions);
    }

    /**
     * Determines whether the given CoreType is compatible with this event data.
     * Returns true, if the specified type is contained in the coreTypes property;
     * false otherwise.
     * @param coreType name of the core type to check
     */
    isCoreTypeCompatible(coreType: CoreType) {
        return this.coreTypes && this.coreTypes.some(t => t === coreType);
    }

    /**
     * Determines whether the given ObjectType is compatible with this event data.
     * Returns true, if the specified type is contained in the objectTypes property;
     * false otherwise.
     * @param objectType name of the object type to check
     */
    isObjectTypeCompatible(objectType: string) {
        return this.objectTypes && this.objectTypes.some(t => t === objectType);
    }

    /**
     * Determines whether the given object matches the requirements of this event data.
     * Matches all specified fields except the join conditions (coreType, objectType and 
     * objectFilter). Returns false for undefined objects.
     * @param object CoatyObject to match with the event data specifications.
     */
    matchesObject(object: CoatyObject): boolean {
        if (!object) {
            return false;
        }

        return (this._coreTypes === undefined || this._coreTypes.some(t => t === object.coreType))
            || (this._objectTypes === undefined || this._objectTypes.some(t => t === object.objectType))
            || (this._objectFilter === undefined || ObjectMatcher.matchesFilter(object, this._objectFilter));
    }

    toJsonObject() {
        return {
            objectTypes: this._objectTypes,
            coreTypes: this._coreTypes,
            objectFilter: this._objectFilter,
            objectJoinConditions: this._objectJoinConditions,
        };
    }

    private _hasValidParameters(): boolean {
        return this._isObjectFilterValid(this._objectFilter) &&
            this._areObjectJoinConditionsValid(this._objectJoinConditions) &&
            ((this._objectTypes === undefined &&
                CoreTypes.isCoreTypeArray(this._coreTypes)) ||
                (this._coreTypes === undefined &&
                    CoreTypes.isStringArray(this._objectTypes)));
    }

    private _isObjectFilterValid(filter: ObjectFilter): boolean {
        if (filter === undefined) {
            return true;
        }
        /* tslint:disable-next-line:no-null-keyword */
        return filter !== null &&
            typeof filter === "object" &&
            this._areFilterConditionsValid(filter.conditions) &&
            (filter.skip === undefined || typeof filter.skip === "number") &&
            (filter.take === undefined || typeof filter.take === "number") &&
            (filter.orderByProperties === undefined ||
                this._areOrderByPropertiesValid(filter.orderByProperties));
    }

    private _areFilterConditionsValid(conds: any): boolean {
        if (conds === undefined) {
            return true;
        }
        /* tslint:disable-next-line:no-null-keyword */
        return conds !== null &&
            this._isFilterConditionValid(conds) ||
            (typeof conds === "object" &&
                !(conds.and && conds.or) &&
                (conds.and === undefined || this._isFilterConditionArrayValid(conds.and)) &&
                (conds.or === undefined || this._isFilterConditionArrayValid(conds.or)));
    }

    private _isFilterConditionArrayValid(acond: ObjectFilterCondition[]) {
        return Array.isArray(acond) &&
            acond.every(cond => this._isFilterConditionValid(cond));
    }

    private _isFilterConditionValid(cond: ObjectFilterCondition) {
        // @todo(HHo) refine validation checks for filter operator parameters
        return Array.isArray(cond) &&
            cond.length === 2 &&
            cond[0] &&
            (typeof cond[0] === "string" ||
                (Array.isArray(cond[0]) && (<any[]>cond[0]).every(prop => typeof prop === "string"))) &&
            Array.isArray(cond[1]) &&
            cond[1].length >= 1 &&
            typeof cond[1][0] === "number" &&
            ObjectFilterOperator[cond[1][0]] !== undefined;
    }

    private _areOrderByPropertiesValid(orderProps: Array<[ObjectFilterProperties, "Asc" | "Desc"]>): boolean {
        return Array.isArray(orderProps) &&
            orderProps.every(o => Array.isArray(o) &&
                o.length === 2 &&
                (typeof o[0] === "string" ||
                    (Array.isArray(o[0]) && (<any[]>o[0]).every(prop => typeof prop === "string"))) &&
                (o[1] === "Asc" || o[1] === "Desc"));
    }

    private _areObjectJoinConditionsValid(joinConds: ObjectJoinCondition | ObjectJoinCondition[]): boolean {
        if (joinConds === undefined) {
            return true;
        }
        if (Array.isArray(joinConds)) {
            return joinConds.every(jc => this._isJoinConditionValid(jc));
        }
        return this._isJoinConditionValid(joinConds);
    }

    private _isJoinConditionValid(joinCond: ObjectJoinCondition) {
        /* tslint:disable-next-line:no-null-keyword */
        return joinCond !== null &&
            typeof joinCond === "object" &&
            (typeof joinCond.localProperty === "string") &&
            (typeof joinCond.asProperty === "string") &&
            (joinCond.isLocalPropertyArray === undefined ||
                typeof joinCond.isLocalPropertyArray === "boolean") &&
            (joinCond.isOneToOneRelation === undefined ||
                typeof joinCond.isOneToOneRelation === "boolean");
    }

}

/**
 * Defines event data format for retrieving objects.
 */
export class RetrieveEventData extends CommunicationEventData {

    private _objects: CoatyObject[];
    private _privateData: { [key: string]: any; };

    /**
     * Create an instance of RetrieveEventData.
     *
     * @param objects An array of objects to be retrieved.
     * @param privateData Application-specific options (optional).
     */
    constructor(
        objects: CoatyObject[],
        privateData?: any) {
        super();

        this._objects = objects;
        this._privateData = privateData;

        if (!this._hasValidParameters()) {
            throw new TypeError("in RetrieveEventData: arguments not valid");
        }
    }

    static createFrom(eventData: any): RetrieveEventData {
        return new RetrieveEventData(
            eventData.objects,
            eventData.privateData);
    }

    /**
     * An array of objects to be retrieved (array may be empty).
     */
    get objects() {
        return this._objects;
    }

    /**
     * Application-specific options as an object hash (optional).
     */
    get privateData() {
        return this._privateData;
    }

    toJsonObject() {
        return {
            objects: this._objects,
            privateData: this._privateData,
        };
    }

    private _hasValidParameters(): boolean {
        return this._isValidPrivateData() &&
            CoreTypes.isObjectArray(this._objects);
    }

    private _isValidPrivateData() {
        return this._privateData === undefined ||
            (this._privateData &&
                typeof this._privateData === "object");
    }
}

/**
 * Defines event data format for update operations on an object.
 */
export class UpdateEventData extends CommunicationEventData {

    /**
     * The UUID of the object to be updated (for partial updates only)
     */
    get objectId() {
        return this._objectId;
    }

    /**
     * Key value pairs for properties that have changed or should be changed
     * (accessible by indexer). For partial updates only.
     */
    get changedValues() {
        return this._changedValues;
    }

    /**
     * The object to be updated (for full updates only).
     */
    get object() {
        return this._object;
    }

    /**
     * Determines wheher this event data defines a partial update.
     */
    get isPartialUpdate() {
        return this._objectId !== undefined;
    }

    /**
     * Determines wheher this event data defines a full update.
     */
    get isFullUpdate() {
        return this._object !== undefined;
    }

    private _objectId: Uuid;
    private _changedValues: { [property: string]: any; };
    private _object: CoatyObject;

    /**
     * Create a new UpdateEventData instance.
     *
     * @param objectId The UUID of the object to be updated (for partial updates)
     * @param changedValues Object hash for properties that have changed or should be changed (for partial updates)
     * @param object the object to be updated (for full updates)
     */
    constructor(
        objectId?: Uuid,
        changedValues?: { [property: string]: any; },
        object?: CoatyObject) {
        super();

        this._objectId = objectId;
        this._changedValues = changedValues;
        this._object = object;

        if (!this._hasValidParameters()) {
            throw new TypeError("in UpdateEventData: arguments not valid");
        }
    }

    static createFrom(eventData: any): UpdateEventData {
        return new UpdateEventData(
            eventData.objectId,
            eventData.changedValues,
            eventData.object);
    }

    toJsonObject() {
        return {
            objectId: this._objectId,
            changedValues: this._changedValues,
            object: this._object,
        };
    }

    private _hasValidParameters(): boolean {
        return (typeof this._objectId === "string" &&
            this._objectId.length > 0 &&
            this._changedValues &&
            typeof this._changedValues === "object" &&
            this._object === undefined) ||
            (this._objectId === undefined &&
                this._changedValues === undefined &&
                CoreTypes.isObject(this._object)
            );
    }
}

/**
 * Defines event data format for Complete events.
 */
export class CompleteEventData extends CommunicationEventData {

    private _object: CoatyObject;
    private _privateData: { [key: string]: any; };

    /**
     * Create an instance of CompleteEventData.
     *
     * @param object The updated object.
     * @param privateData Application-specific options (optional).
     */
    constructor(
        object: CoatyObject,
        privateData?: any) {
        super();

        this._object = object;
        this._privateData = privateData;

        if (!this._hasValidParameters()) {
            throw new TypeError("in CompleteEventData: arguments not valid");
        }
    }

    static createFrom(eventData: any): CompleteEventData {
        return new CompleteEventData(
            eventData.object,
            eventData.privateData);
    }

    /**
     * The updated object.
     */
    get object() {
        return this._object;
    }

    /**
     * Application-specific options as an object hash (optional).
     */
    get privateData() {
        return this._privateData;
    }

    toJsonObject() {
        return {
            object: this._object,
            privateData: this._privateData,
        };
    }

    private _hasValidParameters(): boolean {
        return CoreTypes.isObject(this._object) && this._isValidPrivateData();
    }

    private _isValidPrivateData() {
        return this._privateData === undefined ||
            (this._privateData &&
                typeof this._privateData === "object");
    }
}

/**
 * Defines event data format for advertising objects.
 */
export class AdvertiseEventData extends CommunicationEventData {

    private _object: CoatyObject;
    private _privateData: { [key: string]: any; };

    /**
     * Create an instance of AdvertiseEventData.
     *
     * @param object The object to be advertised.
     * @param privateData Application-specific options (optional).
     */
    constructor(
        object: CoatyObject,
        privateData?: any) {
        super();

        this._object = object;
        this._privateData = privateData;

        if (!this._hasValidParameters()) {
            throw new TypeError("in AdvertiseEventData: arguments not valid");
        }
    }

    static createFrom(eventData: any): AdvertiseEventData {
        return new AdvertiseEventData(
            eventData.object,
            eventData.privateData);
    }

    /**
     * The object to be advertised.
     */
    get object() {
        return this._object;
    }

    /**
     * Application-specific options as an object hash (optional).
     */
    get privateData() {
        return this._privateData;
    }

    toJsonObject() {
        return {
            object: this._object,
            privateData: this._privateData,
        };
    }

    private _hasValidParameters(): boolean {
        return CoreTypes.isObject(this._object) && this._isValidPrivateData();
    }

    private _isValidPrivateData() {
        return this._privateData === undefined ||
            (this._privateData &&
                typeof this._privateData === "object");
    }
}

/**
 * Defines event data format to deadvertise an object (capability no longer
 * available or last will if client connection is closed abnormally).
 */
export class DeadvertiseEventData extends CommunicationEventData {

    private _objectIds: Uuid[];

    constructor(...objectIds: Uuid[]) {
        super();

        this._objectIds = objectIds;

        if (!this._hasValidParameters()) {
            throw new TypeError("in DeadvertiseEventData: arguments not valid");
        }
    }

    static createFrom(eventData: any): DeadvertiseEventData {
        return new DeadvertiseEventData(...eventData.objectIds);
    }

    /**
     * The objectIds of the objects/components to be deadvertised.
     */
    get objectIds() {
        return this._objectIds;
    }

    toJsonObject() {
        return {
            objectIds: this._objectIds,
        };
    }

    private _hasValidParameters(): boolean {
        return CoreTypes.isStringArray(this._objectIds) &&
            (<string[]>this._objectIds).every(o => o.length > 0);
    }
}

/**
 * Defines event data format for channelizing objects.
 */
export class ChannelEventData extends CommunicationEventData {

    private _object: CoatyObject;
    private _objects: CoatyObject[];
    private _privateData: { [key: string]: any; };

    /**
     * Create an instance of ChannelEventData.
     * Exactly one of the parameters `object` or `objects` is
     * required. The `privateData` parameter is optional.
     *
     * @param object The object to be channelized.
     * @param objects The objects to be channelized.
     * @param privateData Application-specific options (optional).
     */
    constructor(
        object?: CoatyObject,
        objects?: CoatyObject[],
        privateData?: any) {
        super();

        this._object = object;
        this._objects = objects;
        this._privateData = privateData;

        if (!this._hasValidParameters()) {
            throw new TypeError("in ChannelEventData: arguments not valid");
        }
    }

    static createFrom(eventData: any): ChannelEventData {
        return new ChannelEventData(
            eventData.object,
            eventData.objects,
            eventData.privateData);
    }

    /**
     * The object to be channelized.
     */
    get object() {
        return this._object;
    }

    /**
     * The objects to be channelized.
     */
    get objects() {
        return this._objects;
    }

    /**
     * Application-specific options as an object hash (optional).
     */
    get privateData() {
        return this._privateData;
    }

    toJsonObject() {
        return {
            object: this._object,
            objects: this._objects,
            privateData: this._privateData,
        };
    }

    private _hasValidParameters(): boolean {
        return this._isValidPrivateData() &&
            ((this._objects === undefined && CoreTypes.isObject(this._object)) ||
                (this._object === undefined && CoreTypes.isObjectArray(this._objects)));
    }

    private _isValidPrivateData() {
        return this._privateData === undefined ||
            (this._privateData &&
                typeof this._privateData === "object");
    }
}

/**
 * Defines event data format to associate or disassociate an IO source with an IO actor.
 */
export class AssociateEventData extends CommunicationEventData {

    private _ioSource: IoSource;
    private _ioActor: IoActor;
    private _associatedTopic: string;
    private _updateRate: number;

    /**
     * Create a new AssociateEventData instance.
     *
     * @param ioSource The IO source object to associate/disassociate
     * @param ioActor The IO actor object to associate/disassociate
     * @param associatedTopic The topic used by IO source and IO actor, or undefined for disassocation
     * @param updateRate The recommended update rate (in millis) for publishing IO source values (optional)
     */
    constructor(
        ioSource: IoSource,
        ioActor: IoActor,
        associatedTopic: string,
        updateRate?: number) {
        super();

        this._ioSource = ioSource;
        this._ioActor = ioActor;
        this._associatedTopic = associatedTopic;
        this._updateRate = updateRate;

        if (!this._hasValidParameters()) {
            throw new TypeError("in AssociateEventData: arguments not valid");
        }
    }

    static createFrom(eventData: any): AssociateEventData {
        return new AssociateEventData(
            eventData.ioSource,
            eventData.ioActor,
            eventData.associatedTopic,
            eventData.updateRate);
    }

    /**
     * The IO source object
     */
    get ioSource() {
        return this._ioSource;
    }

    /**
     * The IO actor object
     */
    get ioActor() {
        return this._ioActor;
    }

    /**
     * The topic associated with the given IO source and IO actor or
     * undefined if source and actor should be disassociated
     */
    get associatedTopic() {
        return this._associatedTopic;
    }

    /**
     * The recommended update rate (in millis) for publishing IO source values
     * (optional). Only used for association, not for disassociation.
     */
    get updateRate() {
        return this._updateRate;
    }

    toJsonObject() {
        return {
            ioSource: this._ioSource,
            ioActor: this._ioActor,
            associatedTopic: this._associatedTopic,
            updateRate: this._updateRate,
        };
    }

    private _hasValidParameters(): boolean {
        return this._ioSource &&
            CoreTypes.isObject(this._ioSource, "IoSource") &&
            CoreTypes.isObject(this._ioActor, "IoActor") &&
            (this._associatedTopic === undefined ||
                (typeof this._associatedTopic === "string" &&
                    this._associatedTopic.length > 0)) &&
            (this._updateRate === undefined ||
                typeof this._updateRate === "number");
    }
}

/**
 * Defines event data format for association/disassociation
 * related to a specific IO source/actor. This data is emitted
 * by the observable returned by `CommunicationManager.observeIoState`.
 */
export class IoStateEventData extends CommunicationEventData {

    private _hasAssociations: boolean;
    private _updateRate: number = undefined;

    /**
     * Create a new IoStateEventData instance.
     *
     * @param hasAssociations determines whether the related IO source/actor has associations
     * @param updateRate The recommended update rate (in millis) for publishing IO source values (optional)
     */
    constructor(
        hasAssociations: boolean,
        updateRate?: number) {
        super();

        this._hasAssociations = hasAssociations;
        this._updateRate = updateRate;
    }

    /**
     * Determines whether the related IO source/actor has associations.
     */
    get hasAssociations() {
        return this._hasAssociations;
    }

    /**
     * The recommended update rate (in millis) for publishing IO source values
     * (optional). Only used for association, not for disassociation.
     */
    get updateRate() {
        return this._updateRate;
    }

    toJsonObject() {
        return {
            hasAssociations: this._hasAssociations,
            updateRate: this._updateRate,
        };
    }
}
