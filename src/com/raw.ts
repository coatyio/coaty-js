/*! Copyright (c) 2020 Siemens AG. Licensed under the MIT License. */

import { CommunicationEventType, TopicEvent, TopicEventData } from "../internal";

/**
 * Raw event.
 */
export class RawEvent extends TopicEvent<RawEventData> {

    get eventType() {
        return CommunicationEventType.Raw;
    }

    /**
     * @internal For internal use in framework only. Do not use in application code.
     * 
     * Create a Raw event instance.
     * 
     * @param topic the topic this Raw event is published on
     * @param eventData data associated with this Raw event
     * @param options binding-specific publication options (optional)
     */
    constructor(
        topic: string,
        eventData: RawEventData,
        options?: { [key: string]: any; }) {
        super(topic, eventData, options);
    }

    /**
     * Create a RawEvent instance for the given publication topic and payload.
     * 
     * @remarks The publication topic of the Raw event must be in a valid
     * binding-specific format that corresponds with the configured communication
     * binding. The Raw event is not published if the topic is invalid or has a
     * Coaty-event-like shape.
     *
     * @param topic the publication topic
     * @param payload a payload string or Uint8Array (or Buffer in Node.js, a
     * subclass thereof) to be published on the given topic
     * @param options binding-specific publication options (optional)
     */
    static withTopicAndPayload(topic: string, payload: string | Uint8Array, options?: { [key: string]: any; }) {
        return new RawEvent(topic, new RawEventData(payload), options);
    }
}

/**
 * Defines event data format for raw events.
 */
export class RawEventData extends TopicEventData {

    /**
     * Create an instance of RawEventData.
     *
     * @param payload a payload string or Uint8Array (or Buffer in Node.js, a
     * subclass thereof)
     */
    constructor(payload: string | Uint8Array) {
        super();
        this.payload = payload;
    }

    /** @internal For internal use in framework only. */
    static createFrom(eventData: any): RawEventData {
        return new RawEventData(eventData);
    }

    toJsonObject() {
        // Return undefined to indicate that event data is in a raw format that should
        // not be JSON encoded.
        return undefined;
    }
}
