/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { Observable } from "rxjs";
import { timeout } from "rxjs/operators";

import { CoatyObject, Uuid } from "coaty/model";
import { DiscoverEvent } from "coaty/com";
import { Controller, ObjectCacheController } from "coaty/controller";
import { SensorThingsTypes } from "coaty/sensor-things";

/**
 * Discovers sensor thing objects by given object Ids and maintains a local cache of
 * resolved objects.
 */
export class SensorThingsController extends ObjectCacheController<CoatyObject> {

    onInit() {
        super.onInit();

        this.objectFilter = (obj: CoatyObject) => obj.objectType === SensorThingsTypes.OBJECT_TYPE_THING ||
            obj.objectType === SensorThingsTypes.OBJECT_TYPE_SENSOR ||
            obj.objectType === SensorThingsTypes.OBJECT_TYPE_OBSERVATION ||
            obj.objectType === SensorThingsTypes.OBJECT_TYPE_FEATURE_OF_INTEREST;
    }

    /**
     * Resolves sensor thing object for the given object ID. Resolution times out after 5 seconds.
     * 
     * @param objectId the object id of the object to resolve
     */
    resolveSensorThingsObject(objectId: Uuid) {
        return this.resolveObject(objectId)
            .pipe(timeout(5000));
    }
}
