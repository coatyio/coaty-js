/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { CoatyObject, CommunicationEventType, CoreTypes } from "..";
import { CommunicationEvent, CommunicationEventData } from "./communication-event";

/**
 * Update event.
 */
export class UpdateEvent extends CommunicationEvent<UpdateEventData> {

    get eventType() {
        return CommunicationEventType.Update;
    }

    get responseEventType() {
        return CommunicationEventType.Complete;
    }

    /**
     * Respond to an observed Update event by sending the given Complete event.
     *
     * @param event a Complete event
     */
    complete: (event: CompleteEvent) => void;

    /**
     * @internal For internal use in framework only. Do not use in application
     * code.
     *
     * Create an Update event instance.
     *
     * The `objectType` of the object specified in the given event data must be
     * a non-empty string that does not contain the following characters: `NULL
     * (U+0000)`, `# (U+0023)`, `+ (U+002B)`, `/ (U+002F)`.
     *
     * @param eventData data associated with this Update event
     * @throws if object type of given object is not in a valid format
     */
    constructor(eventData: UpdateEventData) {
        super(eventData);

        if (!CommunicationEvent.isValidEventFilter(eventData.object.objectType)) {
            throw new TypeError(`in UpdateEvent: invalid objectType ${eventData.object.objectType}`);
        }
    }

    /**
     * Create an UpdateEvent instance for the given object.
     * 
     * @param object the object with properties to be updated
     * @throws if object type of given object is not in a valid format
     */
    static withObject(object: CoatyObject) {
        return new UpdateEvent(new UpdateEventData(object));
    }

    /**
     * @internal For internal use in framework only.
     *
     * @param eventData event data for Complete response event
     * @throws if the given Complete event data does not correspond to the event
     * data of this Update event.
     */
    ensureValidResponseParameters(eventData: CompleteEventData) {
        if (this.data.object.objectId !== eventData.object.objectId) {
            throw new TypeError("object ID of Complete event doesn't match object ID of Update event");
        }
    }
}

/**
 * Defines event data format for update operations on an object.
 */
export class UpdateEventData extends CommunicationEventData {

    /**
     * The object with properties to be updated.
     */
    get object() {
        return this._object;
    }

    /**
     * Create a new UpdateEventData instance.
     *
     * @param object the object with properties to be updated
     */
    constructor(private _object: CoatyObject) {
        super();

        if (!this._hasValidParameters()) {
            throw new TypeError("in UpdateEventData: arguments not valid");
        }
    }

    /** @internal For internal use in framework only. */
    static createFrom(eventData: any): UpdateEventData {
        return new UpdateEventData(eventData.object);
    }

    toJsonObject() {
        return { object: this._object };
    }

    private _hasValidParameters(): boolean {
        return CoreTypes.isObject(this._object);
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
     * @internal For internal use in framework only. Do not use in application
     * code.
     *
     * Associated request event.
     */
    eventRequest: UpdateEvent;

    /**
     * Create a CompleteEvent instance for updating the given object.
     * 
     * @param object the updated object
     * @param privateData application-specific options (optional)
     */
    static withObject(object: CoatyObject, privateData?: any) {
        return new CompleteEvent(new CompleteEventData(object, privateData));
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

    /** @internal For internal use in framework only. */
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
