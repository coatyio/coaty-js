/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { CoatyObject, Component } from "../model/object";
import { CoreTypes } from "../model/types";
import { CommunicationEvent, CommunicationEventData, CommunicationEventType } from "./communication-event";

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
