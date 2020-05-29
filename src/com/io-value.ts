/*! Copyright (c) 2020 Siemens AG. Licensed under the MIT License. */

import { IoSource } from "..";
import { CommunicationEventType, TopicEvent, TopicEventData } from "../internal";

/**
 * IoValue event.
 */
export class IoValueEvent extends TopicEvent<IoValueEventData> {

    get eventType() {
        return CommunicationEventType.IoValue;
    }

    /**
     * The IoSource on which to publish the IO value.
     */
    readonly ioSource: IoSource;

    /**
     * @internal For internal use in framework only. Use `IoValueEvent.with()`
     * instead.
     *
     * Create an IoValue event instance.
     *
     * @param ioSource the IoSource for publishing
     * @param eventData data associated with this IoValue event
     * @param options binding-specific publication options (optional)
     * @throws if the given value data format does not comply with the
     * `IoSource.useRawIoValues` option
     */
    constructor(ioSource: IoSource, eventData: IoValueEventData, options?: { [key: string]: any; }) {
        super(undefined, eventData, options);

        const isValueRaw = eventData.payload instanceof Uint8Array;
        if (isValueRaw && !ioSource.useRawIoValues ||
            !isValueRaw && ioSource.useRawIoValues) {
            throw new Error("IO value data format of given IO source is not compatible with given IO value");
        }

        this.ioSource = ioSource;
    }

    /**
     * Create an IoValueEvent instance for the given IO source and IO value.
     * 
     * The IO value can be either JSON compatible or in binary format as a
     * Uint8Array (or Buffer in Node.js, a subclass thereof). The data format of
     * the given IO value **must** conform to the `useRawIoValues` property of
     * the given IO source. That means, if this property is set to true, the
     * given value must be in binary format; if this property is set to false,
     * the value must be a JSON encodable object. If this constraint is
     * violated, an error is thrown.
     *
     * @param ioSource the IoSource for publishing
     * @param value a JSON compatible value or a Uint8Array (or Buffer in
     * Node.js, a subclass thereof)
     * @param options binding-specific publication options
     * @throws if the given value data format does not comply with the
     * `IoSource.useRawIoValues` option
     */
    static with(ioSource: IoSource, value: any | Uint8Array, options?: { [key: string]: any; }) {
        return new IoValueEvent(ioSource, new IoValueEventData(value), options);
    }
}

/**
 * Defines event data format for IoValue events.
 */
export class IoValueEventData extends TopicEventData {

    /**
     * The payload JSON data or raw Uint8Array (or Buffer in Node.js, a subclass
     * thereof).
     */
    readonly payload: any | Uint8Array;

    /**
     * Create an instance of IoValueEventData.
     *
     * @param payload a JSON compatible value or a Uint8Array (or Buffer in
     * Node.js, a subclass thereof)
     */
    constructor(payload: any | Uint8Array) {
        super();
        this.payload = payload;
    }

    /** @internal For internal use in framework only. */
    static createFrom(eventData: any): IoValueEventData {
        return new IoValueEventData(eventData);
    }

    toJsonObject() {
        // Return undefined if event data is in a raw format that should
        // not be JSON encoded.
        if (this.payload instanceof Uint8Array) {
            return undefined;
        }
        return this.payload;
    }
}
