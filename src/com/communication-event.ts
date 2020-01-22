/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { Component, CoreTypes, Uuid } from "..";

/**
 * Predefined event types used by Coaty communication event patterns.
 * Note: add new types to the end to maintain existing enum values.
 */
export enum CommunicationEventType {
    Raw = 0,
    Advertise,
    Deadvertise,
    Channel,
    Discover,
    Resolve,
    Query,
    Retrieve,
    Update,
    Complete,
    Associate,
    IoValue,
    Call,
    Return,

    // Indicates the valid range of event type enum values.
    MAX,
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

    private _eventSource: Component;
    private _eventSourceId: Uuid;
    private _eventData: T;
    private _eventUserId: Uuid | string;

    /**
     * @internal For internal use in framework only. Do not use in application code.
     * 
     * Create an event instance for the given event type.
     *
     * @param eventSource source component associated with this event
     * @param eventData data associated with this event
     */
    constructor(eventSource: Component, eventData: T) {
        const source: any = eventSource;

        // This is to support passing a UUID as event source 
        // (for internal use such as validation checks).
        if ((typeof source === "string") && source.length > 0) {
            this._eventSource = undefined;
            this._eventSourceId = source;
        } else if (CoreTypes.isObject(source, "Component")) {
            this._eventSource = eventSource;
            this._eventSourceId = eventSource.objectId;
        } else {
            throw new TypeError("in CommunicationEvent<T>: argument 'eventSource' is not a Component");
        }

        this._eventData = eventData;
    }

    /**
     * Gets the event source component associated with this event.
     * Returns undefined if the source component is not available
     * but only its ID (via `eventSourceId`). This is always the
     * case on the receiving, i.e. observing side, since the
     * message topic only transmits the source ID but not the source
     * object itself.
     */
    get eventSource() {
        return this._eventSource;
    }

    /**
     * Gets the event source object ID associated with this event.
     */
    get eventSourceId() {
        return this._eventSourceId;
    }

    /**
     * Gets the event data associated with this event.
     */
    get eventData() {
        return this._eventData;
    }

    /**
     * Gets the user ID associated with this event.
     * Returns undefined if this is not a user-associated event.
     */
    get eventUserId() {
        return this._eventUserId;
    }

    /**
     * @internal For internal use in framework only.
     *
     * Sets the user ID associated with this event.
     * For framework-internal use only. Do not use in application code.
     */
    set eventUserId(userId: Uuid | string) {
        this._eventUserId = userId;
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
