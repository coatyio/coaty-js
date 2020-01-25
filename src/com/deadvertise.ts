/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { CoreTypes, Uuid } from "..";
import { CommunicationEvent, CommunicationEventData, CommunicationEventType } from "./communication-event";

/**
 * Deadvertise event.
 */
export class DeadvertiseEvent extends CommunicationEvent<DeadvertiseEventData> {

    /**
     * Create a DeadvertiseEvent instance for deadvertising the given object IDs.
     * 
     * @param objectIds object IDs to be deadvertised
     */
    static withObjectIds(...objectIds: string[]) {
        return new DeadvertiseEvent(new DeadvertiseEventData(objectIds));
    }

    get eventType() {
        return CommunicationEventType.Deadvertise;
    }
}

/**
 * Defines event data format to deadvertise an object (capability no longer
 * available or last will if connection is closed abnormally).
 */
export class DeadvertiseEventData extends CommunicationEventData {

    constructor(private _objectIds: Uuid[]) {
        super();

        if (!this._hasValidParameters()) {
            throw new TypeError("in DeadvertiseEventData: arguments not valid");
        }
    }

    static createFrom(eventData: any): DeadvertiseEventData {
        return new DeadvertiseEventData(eventData.objectIds);
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
