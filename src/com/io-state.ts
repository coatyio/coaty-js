/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { CommunicationEventData } from "../internal";

/**
 * IoState event.
 *
 * This event is internally emitted by the observable returned by
 * `CommunicationManager.observeIoState`.
 */
export class IoStateEvent {

    /**
     * Gets the data of this event.
     */
    get data() {
        return this._eventData;
    }

    private _eventData: IoStateEventData;

    /** @internal For internal use in framework only. */
    constructor(eventData: IoStateEventData) {
        this._eventData = eventData;
    }

    /**
     * Create an IoStateEvent instance for describing an IO state.
     *
     * @internal For internal use in framework only.
     *
     * @param hasAssociations determines whether the related IO source/actor has
     * associations
     * @param updateRate the recommended update rate (in millis) for publishing
     * IO source values (optional)
     */
    static with(hasAssociations: boolean, updateRate?: number) {
        return new IoStateEvent(new IoStateEventData(hasAssociations, updateRate));
    }
}

/**
 * Defines event data format for association/disassociation related to a
 * specific IO source/actor.
 *
 * This data is emitted by the observable returned by
 * `CommunicationManager.observeIoState`.
 */
export class IoStateEventData extends CommunicationEventData {

    private _hasAssociations: boolean;
    private _updateRate: number = undefined;

    /**
     * Create a new IoStateEventData instance.
     *
     *  @internal For internal use in framework only.
     *
     * @param hasAssociations determines whether the related IO source/actor has
     * associations
     * @param updateRate The recommended update rate (in millis) for publishing
     * IO source values (optional)
     */
    constructor(
        hasAssociations: boolean,
        updateRate?: number) {
        super();

        this._hasAssociations = hasAssociations;
        this._updateRate = updateRate;
    }

    /**
     * Determines whether the related IO source/actor has associations.
     */
    get hasAssociations() {
        return this._hasAssociations;
    }

    /**
     * The recommended update rate (in millis) for publishing IO source values
     * (optional). 
     *
     * The value is only specified for association events that are observed by
     * an IO source; otherwise undefined.
     */
    get updateRate() {
        return this._updateRate;
    }

    toJsonObject() {
        return {
            hasAssociations: this._hasAssociations,
            updateRate: this._updateRate,
        };
    }
}
