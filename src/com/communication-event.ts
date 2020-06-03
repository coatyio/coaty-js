/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { CommunicationEventType, Uuid } from "..";

/**
 * Base generic communication event class
 */
export abstract class CommunicationEvent<T extends CommunicationEventData> {

    // @todo Coaty 3
    // private static readonly EVENT_FILTER_REGEX = new RegExp(/^[a-zA-Z0-9.-]+$/);
    private static readonly EVENT_FILTER_REGEX = new RegExp(/^[^\u0000+#/]+$/);

    /** @internal For internal use in framework only. Do not use in application code. */
    abstract get eventType(): CommunicationEventType;

    /** @internal For internal use in framework only. Do not use in application code. */
    get eventTypeFilter(): string {
        return undefined;
    }

    /**  @internal For internal use in framework only. Do not use in application code. */
    get responseEventType(): CommunicationEventType {
        return undefined;
    }

    /** @internal For internal use in framework only. Do not use in application code. */
    eventRequest: CommunicationEvent<CommunicationEventData> = undefined;

    private _eventSourceId: Uuid;

    /**
     * @internal For internal use in framework only. Do not use in application code.
     * 
     * Create an event instance for the given event type.
     *
     * @param eventData data associated with this event
     */
    constructor(private _eventData: T) {
    }

    /**
     * Determines whether the given name is valid as an event filter for Coaty
     * communication.
     *
     * Event filters are used for Coaty communication event filtering, e.g. to
     * filter a communication namespace, an object type, a channel identifier,
     * or a remote operation.
     *
     * An event filter is valid for communication if it is non-empty and does
     * not contain the following characters: `NULL (U+0000)`, `# (U+0023)`, `+
     * (U+002B)`, `/ (U+002F)`.
     *
     * @param name an event filter
     * @returns true if the given name can be used for event filtering; false
     * otherwise
     */
    static isValidEventFilter(name: string) {
        return typeof name === "string" && CommunicationEvent.EVENT_FILTER_REGEX.test(name);
    }

    /**
     * Gets the object ID of the event source object.
     */
    get sourceId() {
        return this._eventSourceId;
    }

    /**
     * @internal For internal use in framework only.
     *
     * Sets the object ID of the event source object.
     */
    set sourceId(sourceId: Uuid) {
        this._eventSourceId = sourceId;
    }

    /**
     * Gets the event data of this event.
     */
    get data() {
        return this._eventData;
    }

}

/**
 * The base class for communication event data
 */
export abstract class CommunicationEventData {

    /**
     * @internal For internal use in framework only.
     *
     * Returns an object with event data properties to be encoded by JSON or
     * undefined to indicate that event data is in a raw format.
     */
    abstract toJsonObject(): { [key: string]: any };
}

/**
 * Represents communication events that are topic-based and provide data in raw,
 * i.e. non-JSON format.
 */
export abstract class TopicEvent<T extends TopicEventData> extends CommunicationEvent<T> {

    get eventTypeFilter() {
        return this.topic;
    }

    /**
     * Publication topic for this topic-based event.
     */
    topic: string;

    /**
     * Binding-specific publication options.
     */
    readonly options: { [key: string]: any; };

    /**
     * @internal For internal use in framework only. Do not use in application code.
     * 
     * Create a Topic event instance.
     * 
     * @param topic the topic this event is published on
     * @param eventData data associated with this event
     * @param options binding-specific publication options (optional)
     */
    constructor(
        topic: string,
        eventData: T,
        options?: { [key: string]: any; }) {
        super(eventData);
        this.topic = topic;
        this.options = options;
    }
}

/**
 * Represents communication event data for topic-based events.
 */
export abstract class TopicEventData extends CommunicationEventData {

    /** 
     * Raw data string or Uint8Array (or Buffer in Node.js, a subclass thereof).
     *
     * For inbound events raw data is always of type `Uint8Array`. For publication
     * events, data may also be as string.
     */
    payload: string | Uint8Array;
}
