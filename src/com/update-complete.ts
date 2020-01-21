/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { CoatyObject, Component, CoreTypes, Uuid } from "..";
import { CommunicationEvent, CommunicationEventData, CommunicationEventType } from "./communication-event";

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
     * @internal For internal use in framework only.
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
