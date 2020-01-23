/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { CoreTypes, Identity, Uuid } from "..";
import { CommunicationEvent, CommunicationEventData, CommunicationEventType } from "./communication-event";

/**
 * Deadvertise event.
 */
export class DeadvertiseEvent extends CommunicationEvent<DeadvertiseEventData> {

    /**
     * Create a DeadvertiseEvent instance for deadvertising the given object IDs.
     * 
     * @param eventSource the event source identity
     * @param objectIds object IDs to be deadvertised
     */
    static withObjectIds(eventSource: Identity, ...objectIds: string[]) {
        return new DeadvertiseEvent(eventSource, new DeadvertiseEventData(...objectIds));
    }

    get eventType() {
        return CommunicationEventType.Deadvertise;
    }
}

/**
 * Defines event data format to deadvertise an object (capability no longer
 * available or last will if client connection is closed abnormally).
 */
export class DeadvertiseEventData extends CommunicationEventData {

    private _objectIds: Uuid[];

    constructor(...objectIds: Uuid[]) {
        super();

        this._objectIds = objectIds;

        if (!this._hasValidParameters()) {
            throw new TypeError("in DeadvertiseEventData: arguments not valid");
        }
    }

    static createFrom(eventData: any): DeadvertiseEventData {
        return new DeadvertiseEventData(...eventData.objectIds);
    }

    /**
     * The objectIds of the objects to be deadvertised.
     */
    get objectIds() {
        return this._objectIds;
    }

    toJsonObject() {
        return {
            objectIds: this._objectIds,
        };
    }

    private _hasValidParameters(): boolean {
        return CoreTypes.isStringArray(this._objectIds) &&
            (<string[]>this._objectIds).every(o => o.length > 0);
    }
}
