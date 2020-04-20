/*! Copyright (c) 2020 Siemens AG. Licensed under the MIT License. */

import { CommunicationEvent, CommunicationEventData, CommunicationEventType } from "./communication-event";

/**
 * Raw event.
 */
export class RawEvent extends CommunicationEvent<RawEventData> {

    get eventType() {
        return CommunicationEventType.Raw;
    }

    /**
     * Gets publication topic.
     */
    get topic() {
        return this._topic;
    }

    /**
     * Gets binding-specific publication options.
     */
    get options() {
        return this._options;
    }

    private _topic: string;
    private _options: { [key: string]: any; };

    /**
     * @internal For internal use in framework only. Do not use in application code.
     * 
     * Create a Raw event instance.
     * 
     * @param topic the topic this Raw event is published on
     * @param eventData payload data associated with this Raw event
     * @param options binding-specific publication options
     */
    constructor(
        topic: string,
        eventData: RawEventData,
        options?: { [key: string]: any; }) {
        super(eventData);
        this._topic = topic;
        this._options = options;
    }

    /**
     * Create a ChannelEvent instance for delivering the given object.
     * 
     * @param topic the topic this Raw event is published on
     * @param eventData a payload string or Uint8Array (Buffer in Node.js) to be published on the given topic
     * @param options binding-specific publication options
     */
    static withTopicAndPayload(topic: string, payload: string | Uint8Array, options?: { [key: string]: any; }) {
        return new RawEvent(topic, new RawEventData(payload), options);
    }
}

/**
 * Defines event data format for raw payload data.
 */
export class RawEventData extends CommunicationEventData {

    private _payload: string | Uint8Array;

    /**
     * Create an instance of RawEventData.
     *
     * @param payload a payload string or Uint8Array (Buffer in Node.js) to be published
     */
    constructor(payload: string | Uint8Array) {
        super();
        this._payload = payload;
    }

    /** @internal For internal use in framework only. */
    static createFrom(eventData: any): RawEventData {
        return new RawEventData(eventData.payload);
    }

    /**
     * The payload data string or Uint8Array (Buffer in Node.js) to be published.
     */
    get payload() {
        return this._payload;
    }

    toJsonObject() {
        // Should never be used.
        return {};
    }
}
