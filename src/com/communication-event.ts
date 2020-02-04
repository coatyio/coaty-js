/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { Uuid } from "..";

/**
 * Predefined event types used by Coaty communication event patterns.
 */
export enum CommunicationEventType {
    // Event types for non-Coaty messages
    External = 0,

    Raw,

    // Event types for Coaty one-way messages
    OneWay,

    Advertise,
    Deadvertise,
    Channel,
    Associate,
    IoValue,

    // Event types for Coaty two-way messages
    TwoWay,

    Discover,
    Resolve,
    Query,
    Retrieve,
    Update,
    Complete,
    Call,
    Return,
}

/**
 * Base generic communication event class
 */
export abstract class CommunicationEvent<T extends CommunicationEventData> {

    /** @internal For internal use in framework only. Do not use in application code. */
    abstract get eventType(): CommunicationEventType;

    /** @internal For internal use in framework only. Do not use in application code. */
    get eventTypeFilter(): string {
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
     * Returns an object with event data properties to be serialized by JSON.
     */
    abstract toJsonObject(): { [key: string]: any };
}
