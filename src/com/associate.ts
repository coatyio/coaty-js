/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { Component, CoreTypes, IoActor, IoSource } from "..";
import { CommunicationEvent, CommunicationEventData, CommunicationEventType } from "./communication-event";

/**
 * Associate event.
 */
export class AssociateEvent extends CommunicationEvent<AssociateEventData> {

    /**
     * Create an AssociateEvent instance for associating the given IO source/actor.
     * 
     * @param eventSource the event source component
     * @param ioSource the IO source object to associate/disassociate
     * @param ioActor the IO actor object to associate/disassociate
     * @param associatedTopic the topic used by IO source and IO actor, or undefined for disassocation
     * @param updateRate the recommended update rate (in millis) for publishing IO source values (optional)
     */
    static with(
        eventSource: Component,
        ioSource: IoSource,
        ioActor: IoActor,
        associatedTopic: string,
        updateRate?: number) {
        return new AssociateEvent(eventSource, new AssociateEventData(ioSource, ioActor, associatedTopic, updateRate));
    }

    get eventType() {
        return CommunicationEventType.Associate;
    }
}

/**
 * Defines event data format to associate or disassociate an IO source with an IO actor.
 */
export class AssociateEventData extends CommunicationEventData {

    private _ioSource: IoSource;
    private _ioActor: IoActor;
    private _associatedTopic: string;
    private _updateRate: number;

    /**
     * Create a new AssociateEventData instance.
     *
     * @param ioSource The IO source object to associate/disassociate
     * @param ioActor The IO actor object to associate/disassociate
     * @param associatedTopic The topic used by IO source and IO actor, or undefined for disassocation
     * @param updateRate The recommended update rate (in millis) for publishing IO source values (optional)
     */
    constructor(
        ioSource: IoSource,
        ioActor: IoActor,
        associatedTopic: string,
        updateRate?: number) {
        super();

        this._ioSource = ioSource;
        this._ioActor = ioActor;
        this._associatedTopic = associatedTopic;
        this._updateRate = updateRate;

        if (!this._hasValidParameters()) {
            throw new TypeError("in AssociateEventData: arguments not valid");
        }
    }

    static createFrom(eventData: any): AssociateEventData {
        return new AssociateEventData(
            eventData.ioSource,
            eventData.ioActor,
            eventData.associatedTopic,
            eventData.updateRate);
    }

    /**
     * The IO source object
     */
    get ioSource() {
        return this._ioSource;
    }

    /**
     * The IO actor object
     */
    get ioActor() {
        return this._ioActor;
    }

    /**
     * The topic associated with the given IO source and IO actor or
     * undefined if source and actor should be disassociated
     */
    get associatedTopic() {
        return this._associatedTopic;
    }

    /**
     * The recommended update rate (in millis) for publishing IO source values
     * (optional). Only used for association, not for disassociation.
     */
    get updateRate() {
        return this._updateRate;
    }

    toJsonObject() {
        return {
            ioSource: this._ioSource,
            ioActor: this._ioActor,
            associatedTopic: this._associatedTopic,
            updateRate: this._updateRate,
        };
    }

    private _hasValidParameters(): boolean {
        return this._ioSource &&
            CoreTypes.isObject(this._ioSource, "IoSource") &&
            CoreTypes.isObject(this._ioActor, "IoActor") &&
            (this._associatedTopic === undefined ||
                (typeof this._associatedTopic === "string" &&
                    this._associatedTopic.length > 0)) &&
            (this._updateRate === undefined ||
                typeof this._updateRate === "number");
    }
}
