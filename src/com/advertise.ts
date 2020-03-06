/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { CoatyObject, CoreTypes } from "..";
import { CommunicationEvent, CommunicationEventData, CommunicationEventType } from "./communication-event";
import { CommunicationTopic } from "./communication-topic";

/**
 * Advertise event.
 */
export class AdvertiseEvent extends CommunicationEvent<AdvertiseEventData> {

    get eventType() {
        return CommunicationEventType.Advertise;
    }

    /**
     * @internal For internal use in framework only. Do not use in application
     * code.
     *
     * Create an Advertise event instance.
     *
     * The `objectType` of the object specified in the given event data must be
     * a non-empty string that does not contain the following characters: `NULL
     * (U+0000)`, `# (U+0023)`, `+ (U+002B)`, `/ (U+002F)`.
     *
     * @param eventData data associated with this Advertise event
     * @throws if object type of given object is not in a valid format
     */
    constructor(eventData: AdvertiseEventData) {
        super(eventData);

        if (!CommunicationTopic.isValidTopicLevel(eventData.object.objectType)) {
            throw new TypeError(`in AdvertiseEvent: invalid objectType ${eventData.object.objectType}`);
        }
    }

    /**
     * Create an AdvertiseEvent instance for advertising the given object.
     * 
     * @param object the object to be advertised
     * @param privateData application-specific options (optional)
     * @throws if object type of given object is not in a valid format
     */
    static withObject(object: CoatyObject, privateData?: any) {
        return new AdvertiseEvent(new AdvertiseEventData(object, privateData));
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

    /** @internal For internal use in framework only. */
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
