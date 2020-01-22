/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import {
    areObjectJoinConditionsValid,
    CoatyObject,
    Component,
    CoreType,
    CoreTypes,
    isObjectFilterValid,
    ObjectFilter,
    ObjectJoinCondition,
    ObjectMatcher,
} from "..";

import { CommunicationEvent, CommunicationEventData, CommunicationEventType } from "./communication-event";

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
     * @internal For internal use in framework only.
     * 
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
        return isObjectFilterValid(this._objectFilter) &&
            areObjectJoinConditionsValid(this._objectJoinConditions) &&
            ((this._objectTypes === undefined &&
                CoreTypes.isCoreTypeArray(this._coreTypes)) ||
                (this._coreTypes === undefined &&
                    CoreTypes.isStringArray(this._objectTypes)));
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
