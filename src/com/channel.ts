/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { CoatyObject, CoreTypes, Identity } from "..";
import { CommunicationEvent, CommunicationEventData, CommunicationEventType } from "./communication-event";
import { CommunicationTopic } from "./communication-topic";

/**
 * Channel event.
 */
export class ChannelEvent extends CommunicationEvent<ChannelEventData> {

    get eventType() {
        return CommunicationEventType.Channel;
    }

    get eventTypeFilter() {
        return this._channelId;
    }

    get channelId() {
        return this._channelId;
    }

    private _channelId: string;

    /**
     * @internal For internal use in framework only. Do not use in application code.
     * 
     * Create a Channel event instance.
     * 
     * The channel identifier must be a non-empty string that does not contain
     * the following characters: `NULL (U+0000)`, `# (U+0023)`, `+ (U+002B)`,
     * `/ (U+002F)`.
     * 
     * @param eventSource source identity associated with this Channel event
     * @param channelId the channel identifier of this Channel event
     * @param eventData data associated with this Channel event
     */
    constructor(
        eventSource: Identity,
        channelId: string,
        eventData: ChannelEventData) {
        super(eventSource, eventData);

        if (!CommunicationTopic.isValidEventTypeFilter(channelId)) {
            throw new TypeError("in ChannelEvent: argument 'channelId' is not a valid channel identifier");
        }

        this._channelId = channelId;
    }

    /**
     * Create a ChannelEvent instance for delivering the given object.
     * 
     * @param eventSource the event source identity
     * @param object the object to be channelized
     * @param privateData application-specific options (optional)
     */
    static withObject(eventSource: Identity, channelId: string, object: CoatyObject, privateData?: any) {
        return new ChannelEvent(eventSource, channelId, new ChannelEventData(object, undefined, privateData));
    }

    /**
     * Create a ChannelEvent instance for delivering the given objects.
     * 
     * @param eventSource the event source identity
     * @param objects the objects to be channelized
     * @param privateData application-specific options (optional)
     */
    static withObjects(eventSource: Identity, channelId: string, objects: CoatyObject[], privateData?: any) {
        return new ChannelEvent(eventSource, channelId, new ChannelEventData(undefined, objects, privateData));
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
