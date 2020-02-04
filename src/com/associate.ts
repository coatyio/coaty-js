/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { Uuid } from "..";
import { CommunicationEvent, CommunicationEventData, CommunicationEventType } from "./communication-event";
import { CommunicationTopic } from "./communication-topic";

/**
 * Associate event.
 */
export class AssociateEvent extends CommunicationEvent<AssociateEventData> {

    get eventTypeFilter() {
        return this._ioContextName;
    }

    private _ioContextName: string;

    /**
     * @internal For internal use in framework only. Do not use in application
     * code.
     *
     * Create an AssociateEvent instance for associating or disassociating the
     * IO source and IO actor given in event data.
     *
     * The context name must be a non-empty string that does not contain the
     * following characters: `NULL (U+0000)`, `# (U+0023)`, `+ (U+002B)`, `/
     * (U+002F)`.
     *
     * @param ioContextName the name of the IO context
     * @param eventData data associated with this Associate event
     */
    constructor(ioContextName: string, eventData: AssociateEventData) {
        super(eventData);

        if (!CommunicationTopic.isValidTopicLevel(ioContextName)) {
            throw new TypeError("in AssociateEvent: argument 'ioContextName' is not a valid IO context name");
        }

        this._ioContextName = ioContextName;
    }

    /**
     * Create an AssociateEvent instance for associating or disassociating the
     * given IO source and IO actor.
     *
     * @param ioContextName the name of an IO context the given IO source and
     * actor belong to
     * @param ioSourceId the IO source object Id to associate/disassociate
     * @param ioActorId the IO actor object Id to associate/disassociate
     * @param associatingRoute the route used by IO source for publishing and by
     * IO actor for subscribing, or undefined if used for disassocation
     * @param updateRate the recommended update rate (in millis) for publishing
     * IO source values (optional)
     */
    static with(
        ioContextName: string,
        ioSourceId: Uuid,
        ioActorId: Uuid,
        associatingRoute: string,
        updateRate?: number) {
        return new AssociateEvent(ioContextName, new AssociateEventData(ioSourceId, ioActorId, associatingRoute, updateRate));
    }

    get eventType() {
        return CommunicationEventType.Associate;
    }
}

/**
 * Defines event data format to associate or disassociate an IO source with an IO actor.
 */
export class AssociateEventData extends CommunicationEventData {

    private _ioSourceId: Uuid;
    private _ioActorId: Uuid;
    private _associatingRoute: string;
    private _updateRate?: number;

    /**
     * Create a new AssociateEventData instance.
     *
     * @param ioSourceId the object Id of the IO source object to
     * associate/disassociate
     * @param ioActorId the object Id of the IO actor object to
     * associate/disassociate
     * @param associatingRoute the route used by IO source for publishing and
     *   by IO actor for subscribing, or undefined if used for disassocation
     * @param updateRate The recommended update rate (in millis) for publishing
     * IO source values (optional)
     */
    constructor(ioSourceId: Uuid, ioActorId: Uuid, associatingRoute: string, updateRate?: number) {
        super();

        this._ioSourceId = ioSourceId;
        this._ioActorId = ioActorId;
        this._associatingRoute = associatingRoute;
        this._updateRate = updateRate;

        if (!this._hasValidParameters()) {
            throw new TypeError("in AssociateEventData: arguments not valid");
        }
    }

    /** @internal For internal use in framework only. */
    static createFrom(eventData: any): AssociateEventData {
        return new AssociateEventData(
            eventData.ioSourceId,
            eventData.ioActorId,
            eventData.associatingRoute,
            eventData.updateRate);
    }

    /**
     * The object Id of the IO source object.
     */
    get ioSourceId() {
        return this._ioSourceId;
    }

    /**
     * The object Id of the IO actor object.
     */
    get ioActorId() {
        return this._ioActorId;
    }

    /**
     * The route associating the given IO source and IO actor, or undefined if
     * the association between IO source and actor should be dissolved.
     */
    get associatingRoute() {
        return this._associatingRoute;
    }

    /**
     * The recommended update rate (in millis) for publishing IO source values
     * (optional).
     *
     * Only used for association, not for disassociation.
     */
    get updateRate() {
        return this._updateRate;
    }

    toJsonObject() {
        return {
            ioSourceId: this._ioSourceId,
            ioActorId: this._ioActorId,
            associatingRoute: this._associatingRoute,
            updateRate: this._updateRate,
        };
    }

    private _hasValidParameters(): boolean {
        return this._ioSourceId &&
            typeof this.ioSourceId === "string" && this.ioSourceId.length > 0 &&
            typeof this.ioActorId === "string" && this.ioActorId.length > 0 &&
            (this._associatingRoute === undefined ||
                (typeof this._associatingRoute === "string" &&
                    this._associatingRoute.length > 0)) &&
            (this._updateRate === undefined ||
                typeof this._updateRate === "number");
    }
}
