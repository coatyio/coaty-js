/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { CoatyObject, CoreType, CoreTypes, Identity, Uuid } from "..";
import { CommunicationEvent, CommunicationEventData, CommunicationEventType } from "./communication-event";

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
     * @param eventSource the event source identity
     * @param externalId the external ID to discover
     */
    static withExternalId(eventSource: Identity, externalId: string) {
        return new DiscoverEvent(eventSource, new DiscoverEventData(externalId));
    }

    /**
     * Create a DiscoverEvent instance for discovering objects with the given external Id and core types.
     * 
     * @param eventSource the event source identity
     * @param externalId the external ID to discover
     * @param coreTypes an array of core types to discover
     */
    static withExternalIdAndCoreTypes(eventSource: Identity, externalId: string, coreTypes: CoreType[]) {
        return new DiscoverEvent(eventSource, new DiscoverEventData(externalId, undefined, undefined, coreTypes));
    }

    /**
     * Create a DiscoverEvent instance for discovering objects with the given external Id and object types.
     * 
     * @param eventSource the event source identity
     * @param externalId the external ID to discover
     * @param objectTypes an array of object types to discover
     */
    static withExternalIdAndObjectTypes(eventSource: Identity, externalId: string, objectTypes: string[]) {
        return new DiscoverEvent(eventSource, new DiscoverEventData(externalId, undefined, objectTypes, undefined));
    }

    /**
     * Create a DiscoverEvent instance for discovering objects with the given object Id.
     * 
     * @param eventSource the event source identity
     * @param objectId the object ID to discover
     */
    static withObjectId(eventSource: Identity, objectId: Uuid) {
        return new DiscoverEvent(eventSource, new DiscoverEventData(undefined, objectId));
    }

    /**
     * Create a DiscoverEvent instance for discovering objects with the given external Id and object Id.
     * 
     * @param eventSource the event source identity
     * @param externalId the external ID to discover
     * @param objectId the object ID to discover
     */
    static withExternalAndObjectId(eventSource: Identity, externalId: string, objectId: Uuid) {
        return new DiscoverEvent(eventSource, new DiscoverEventData(externalId, objectId));
    }

    /**
     * Create a DiscoverEvent instance for discovering objects with the given core types.
     * 
     * @param eventSource the event source identity
     * @param coreTypes the core types to discover
     */
    static withCoreTypes(eventSource: Identity, coreTypes: CoreType[]) {
        return new DiscoverEvent(eventSource, new DiscoverEventData(undefined, undefined, undefined, coreTypes));
    }

    /**
     * Create a DiscoverEvent instance for discovering objects with the given object types.
     * 
     * @param eventSource the event source identity
     * @param objectTypes the object types to discover
     */
    static withObjectTypes(eventSource: Identity, objectTypes: string[]) {
        return new DiscoverEvent(eventSource, new DiscoverEventData(undefined, undefined, objectTypes, undefined));
    }

    /**
     * @internal For internal use in framework only.
     * 
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
     * Determines whether this event data discovers an object based on an external ID
     * but not an object ID.
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
     * @param eventSource the event source identity
     * @param object the object to be resolved
     * @param relatedObjects related objects to be resolved (optional)
     * @param privateData private data object (optional)
     */
    static withObject(eventSource: Identity, object: CoatyObject, relatedObjects?: CoatyObject[], privateData?: any) {
        return new ResolveEvent(eventSource, new ResolveEventData(object, relatedObjects, privateData));
    }

    /**
     * Create a ResolveEvent instance for resolving the given related objects.
     * 
     * @static
     * @param eventSource the event source identity
     * @param relatedObjects related objects to be resolved
     * @param privateData private data object (optional)
     */
    static withRelatedObjects(eventSource: Identity, relatedObjects: CoatyObject[], privateData?: any) {
        return new ResolveEvent(eventSource, new ResolveEventData(undefined, relatedObjects, privateData));
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
