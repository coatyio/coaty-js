/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { BehaviorSubject, merge, Observable, Subject, Subscription } from "rxjs";
import { concatMap, filter } from "rxjs/operators";

import { Container, Uuid } from "..";
import { Observation, Sensor, Thing } from "./objects";
import { SensorObserverController } from "./sensor-observer-controller";
import { ThingObserverController } from "./thing-observer-controller";

/**
 * Represents change information when sensors are registered or deregistered.
 */
export interface RegisteredSensorsChangeInfo {

    /**
     * New sensors that have been added.
     */
    added: Sensor[];

    /**
     * Previously added sensors that have been removed.
     */
    removed: Sensor[];

    /**
     * Existing sensors that have been readvertised (some properties might have changed).
     */
    changed: Sensor[];

    /**
     * The current sensors after changes have been applied.
     */
    total: Sensor[];
}

/**
 * A convenience controller that observes things and associated sensor and observation objects, combining 
 * the functionality of `ThingObserverController` and `SensorObserverController`.
 * This controller is designed to be used by a client that wants to easily handle sensor-related events
 * as well as sensor  observations.
 */
export class ThingSensorObservationObserverController extends ThingObserverController {

    private _sensorObserverController: SensorObserverController;
    private _thingOnlineSubscription: Subscription;
    private _thingOfflineSubscription: Subscription;
    private _sensorSubscriptions = new Map<string, Subscription[]>();   // key is thing.objectId
    private _observationSubscriptions = new Map<Uuid, Subscription>();
    private _registeredSensors: Map<Uuid, Sensor>;   // key is sensor.objectId
    private _registeredSensorsChangeInfo$: BehaviorSubject<RegisteredSensorsChangeInfo>;
    private _sensorObservation$ = new Subject<{ obs: Observation, sensor: Sensor }>();
    private _thingFilter: (thing: Thing) => boolean;
    private _sensorFilter: (sensor: Sensor, thing: Thing) => boolean;

    onInit() {
        super.onInit();
        this._registeredSensors = new Map<Uuid, Sensor>();
        this._registeredSensorsChangeInfo$ = new BehaviorSubject<RegisteredSensorsChangeInfo>({
            added: [],
            removed: [],
            changed: [],
            total: [],
        });
    }

    onContainerResolved(container: Container) {
        super.onContainerResolved(container);
        this._sensorObserverController = container
            .registerController("SensorObserverController_" + this.runtime.newUuid(), SensorObserverController, {});
        if (!this._sensorObserverController) {
            throw new Error(`SensorObserverController could not be registered.`);
        }
    }

    onCommunicationManagerStarting() {
        super.onCommunicationManagerStarting();
        this._observeThings();
    }

    onCommunicationManagerStopping() {
        super.onCommunicationManagerStopping();
        this._sensorSubscriptions.forEach(subs => subs.forEach(sub => sub.unsubscribe()));
        this._sensorSubscriptions.clear();
        this._observationSubscriptions.forEach(sub => sub.unsubscribe());
        this._observationSubscriptions.clear();
        this._thingOnlineSubscription.unsubscribe();
        this._thingOfflineSubscription.unsubscribe();
        this._registeredSensorsChangeInfo$.next({
            added: [],
            removed: Array.from(this._registeredSensors.values()),
            changed: [],
            total: [],
        });
        this._registeredSensors.clear();
    }

    /**
     * Gets an Observable emitting information about changes in the currently registered sensors.
     * Registered sensor objects are augmented by a property `thing` which
     * references the associated `Thing` object.
     */
    get registeredSensorsChangeInfo$() {
        return this._registeredSensorsChangeInfo$;
    }

    /**
     * Gets an Observable emitting incoming observations on registered sensors.
     */
    get sensorObservation$() {
        return this._sensorObservation$;
    }

    /**
     * Sets a filter predicate that determines whether an observed thing is relevant 
     * and should be registered with the controller. The filter predicate should 
     * return `true` if the passed-in thing is relevant; `false` otherwise.
     * 
     * By default, all observed things are considered relevant.
     * 
     * @param thingFilter a filter predicate for things
     */
    set thingFilter(thingFilter: (thing: Thing) => boolean) {
        this._thingFilter = thingFilter;
    }

    /**
     * Sets a filter predicate that determines whether an observed sensor is relevant 
     * and should be registered with the controller. The filter predicate should 
     * return `true` if the passed-in sensor is relevant; `false` otherwise.
     * 
     * By default, all observed sensors of all relevant things are considered relevant.
     * 
     * @param sensorFilter a filter predicate for sensors
     */
    set sensorFilter(sensorFilter: (sensor: Sensor, thing: Thing) => boolean) {
        this._sensorFilter = sensorFilter;
    }

    private _observeThings() {
        this._thingOnlineSubscription = merge(this.discoverThings(), this.observeAdvertisedThings())
            .subscribe(thing => this._onThingReceived(thing));

        this._thingOfflineSubscription = this.communicationManager.observeDeadvertise(this.identity)
            .subscribe(event => event.eventData.objectIds.forEach(id => this._onDeadvertised(id)));
    }

    private _onThingReceived(thing: Thing) {
        if (this._thingFilter && !this._thingFilter(thing)) {
            return;
        }
        const advertiseObservable = this._sensorObserverController
            .observeAdvertisedSensors()
            .pipe(filter(sensor => sensor.parentObjectId === thing.objectId));

        const subscription = merge(
            this._sensorObserverController
                .querySensorsOfThing(thing.objectId)
                .pipe(concatMap(sensors => {
                    return new Observable<Sensor>(observer => {
                        sensors.forEach(sensor => {
                            observer.next(sensor);
                        });
                        observer.complete();
                    });
                })),
            advertiseObservable)
            .subscribe(sensor => this._onSensorReceived(sensor, thing));

        if (this._sensorSubscriptions.has(thing.objectId)) {
            this._sensorSubscriptions.get(thing.objectId).push(subscription);
        } else {
            this._sensorSubscriptions.set(thing.objectId, [subscription]);
        }
    }

    private _onSensorReceived(sensor: Sensor, thing: Thing) {
        if (this._sensorFilter && !this._sensorFilter(sensor, thing)) {
            return;
        }
        sensor["thing"] = thing;
        const isRegistered = this._registeredSensors.has(sensor.objectId);
        this._registeredSensors.set(sensor.objectId, sensor);
        this._registeredSensorsChangeInfo$.next({
            added: isRegistered ? [] : [sensor],
            removed: [],
            changed: isRegistered ? [sensor] : [],
            total: Array.from(this._registeredSensors.values()),
        });
        if (this._observationSubscriptions.has(sensor.objectId)) {
            this._observationSubscriptions.get(sensor.objectId).unsubscribe();
        }
        this._observationSubscriptions.set(
            sensor.objectId,
            this._observeObservations(sensor));
    }

    private _observeObservations(sensor: Sensor): Subscription {
        return this._sensorObserverController
            .observeChanneledObservations(sensor.objectId)
            .subscribe(observation => {
                this._sensorObservation$.next({ obs: observation, sensor });
            });
    }

    private _onDeadvertised(objectId: string) {
        // Clean up associated sensors and sensor observations
        const removedThingIds = new Set<Uuid>();
        const removedSensors = [];
        this._registeredSensors.forEach((s, id) => {
            if (s["thing"].parentObjectId === objectId) {
                removedThingIds.add(s["thing"].objectId);
                this._observationSubscriptions.get(id).unsubscribe();
                this._observationSubscriptions.delete(id);
                removedSensors.push(s);
                this._registeredSensors.delete(id);
            }
        });
        removedThingIds.forEach(id => {
            this._sensorSubscriptions.get(id).forEach(sub => sub.unsubscribe());
            this._sensorSubscriptions.delete(id);
        });
        if (removedSensors.length === 0) {
            return;
        }
        this._registeredSensorsChangeInfo$.next({
            added: [],
            removed: removedSensors,
            changed: [],
            total: Array.from(this._registeredSensors.values()),
        });
    }
}
