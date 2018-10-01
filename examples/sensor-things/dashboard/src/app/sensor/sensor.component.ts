/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { Component, OnDestroy } from "@angular/core";
import { ActivatedRoute } from "@angular/router";

import { Subscription } from "rxjs";
import { take } from "rxjs/operators";

import { SensorThingsController } from "../controller/sensor-things-controller";
import { CoatyObject, Uuid } from "coaty/model";
import {
    Observation,
    SensorObserverController,
    SensorThingsTypes,
    ThingObserverController
} from "coaty/sensor-things";

/** 
 * Format of this._chartdata elements.
 */
interface ChartItem {
    "product_id": Uuid;
    "name": string;
    "objectType": string;
    "parents_id": { id: Uuid }[];
}

/**
 * Sensor component is a stateful component that manage incoming observations
 * and discover events.
 */
@Component({
    templateUrl: './sensor.component.html',
    styleUrls: ['./sensor.component.scss']
})
export class SensorComponent implements OnDestroy {

    private _channeledObservationsSubscription: Subscription;
    private _root: CoatyObject;

    private _chartData = new Map<Uuid, ChartItem>();
    private _objects: CoatyObject[] = [];
    private _observations: Observation[] = [];

    constructor(
        private _route: ActivatedRoute,
        private _sensorObserverController: SensorObserverController,
        private _sensorThingsController: SensorThingsController,
        private _thingObserverController: ThingObserverController) {

        this._route.params.subscribe(params => {
            const id = params['id'];

            this._sensorThingsController
                .resolveSensorThingsObject(id)
                .subscribe(object => {
                    this._chartData.clear();
                    this._objects = [];
                    this._observations = [];

                    this._root = object;
                    this._addElement(object);
                    this._discoverNeighbors(object);

                    if (object.objectType === SensorThingsTypes.OBJECT_TYPE_SENSOR) {
                        this._observeObservations(object.objectId);
                    }
                }, error => {
                    console.error("Timed out while discovering object with objectId: " + id);
                });
        });
    }

    ngOnDestroy() {
        this._channeledObservationsSubscription && this._channeledObservationsSubscription.unsubscribe();
    }

    get root(): CoatyObject {
        return this._root;
    }

    get chartData(): Map<Uuid, ChartItem> {
        return this._chartData;
    }

    get observations(): Observation[] {
        return this._observations;
    }

    get objects(): CoatyObject[] {
        return this._objects;
    }

    isSensorRoot(): boolean {
        return this._root && this._root.objectType === SensorThingsTypes.OBJECT_TYPE_SENSOR;
    }

    isLinkedField(object: CoatyObject, fieldName: string): boolean {
        let fields: string[];
        if (object.objectType === SensorThingsTypes.OBJECT_TYPE_THING) {
            fields = ["objectId", "locationId"];
        } else if (object.objectType === SensorThingsTypes.OBJECT_TYPE_SENSOR) {
            fields = ["objectId", "parentObjectId", "observedPropertyId"];
        } else if (object.objectType === SensorThingsTypes.OBJECT_TYPE_FEATURE_OF_INTEREST) {
            fields = ["objectId"];
        } else if (object.objectType === SensorThingsTypes.OBJECT_TYPE_OBSERVATION) {
            fields = ["objectId", "parentObjectId"];
        }
        return fields.indexOf(fieldName) !== -1;
    }

    public isObject(object: CoatyObject) {
        return typeof object === "object";
    }

    public objectToArray(object: CoatyObject) {
        return Object.keys(object).map((key) => ({ key: key, value: object[key] }));
    }

    private _discoverNeighbors(object: CoatyObject, parent?: CoatyObject) {
        if (object.objectType === SensorThingsTypes.OBJECT_TYPE_THING) {
            if (!parent || parent.objectType !== SensorThingsTypes.OBJECT_TYPE_SENSOR) {
                this._sensorObserverController
                    .querySensorsOfThing(object.objectId)
                    .pipe(take(1))
                    .subscribe(sensors => sensors.forEach(sensor => this._handleDiscovered(sensor, object)));
            }
        } else if (object.objectType === SensorThingsTypes.OBJECT_TYPE_SENSOR) {
            if (!parent || parent.objectType !== SensorThingsTypes.OBJECT_TYPE_THING) {
                this._sensorThingsController
                    .resolveSensorThingsObject(object.parentObjectId)
                    .subscribe(thing => this._handleDiscovered(thing, object),
                        error => {
                            console.error("Timed out while discovering thing with objectId: " + object.parentObjectId);
                        });
            }
        } else {
            throw new TypeError("Cannot get associated objects of an unknown object: " + object);
        }
    }

    private _observeObservations(sensorId: Uuid) {
        this._channeledObservationsSubscription && this._channeledObservationsSubscription.unsubscribe();

        this._channeledObservationsSubscription = this._sensorObserverController
            .observeChanneledObservations(sensorId)
            .subscribe(observation => this._observations.push(observation));
    }

    private _handleDiscovered(object: CoatyObject, parent: CoatyObject) {
        this._addElement(object, parent);
        this._discoverNeighbors(object, parent);
    }

    private _addElement(object: CoatyObject, parent?: CoatyObject) {
        this._objects.push(object);
        this._chartData.set(object.objectId, {
            "product_id": object.objectId,
            "name": object.name,
            "objectType": object.objectType,
            "parents_id": (this._chartData.size === 0 || parent === undefined ? undefined : [{ id: parent.objectId }])
        });
    }
}
