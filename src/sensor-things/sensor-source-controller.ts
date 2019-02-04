/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { Observable, Subject, Subscription } from "rxjs";
import { filter } from "rxjs/operators";

import {
    AdvertiseEvent,
    ChannelEvent,
    DeadvertiseEvent,
    ResolveEvent,
    RetrieveEvent,
} from "../com/communication-events";
import { Controller } from "../controller/controller";
import { Uuid } from "../model/object";
import { ObjectMatcher } from "../model/object-matcher";
import { TimeInterval } from "../util/date";
import { Observation, Sensor } from "./objects";
import { ISensorIoStatic, SensorIo } from "./sensor-io";
import { SensorThingsTypes } from "./types";

/**
 * Defines whether and how the observations should be automatically published
 * from SensorSourceController. This is used together with the samplingInterval
 * value.
 */
export type ObservationPublicationType =
    /**
     * The observations should not be published automatically.
     */
    "none" |

    /**
     * The observations are advertised. The value of the sensor is read continuously
     * every `samplingInterval` milliseconds.
     */
    "advertise" |

    /**
     * The observations are channeled. The value of the sensor is read continuously
     * every `samplingInterval` milliseconds.
     */
    "channel";

/**
 * Static definition of a sensor for use in SensorController. This is used
 * in the options of the controller to register the sensors directly at creation.
 * The 'sensors' option of the SensorController should contain an array of
 * SensorDefinitions.
 * 
 * Each definition should contain the Sensor object, the hardware pin that
 * it is connected to, and the type of the IO communication that it has.
 */
export interface SensorDefinition {
    /**
     * Hardware-specific parameters necessary for the read and write methods.
     */
    parameters?: any;

    /**
     * The Sensor object. This will be used for the main communication
     * with other controllers and applications.
     */
    sensor: Sensor;

    /**
     * The type of the IO handling used for this sensor. You can use predefined ones
     * such as 'Aio', 'InputGpio', 'OuputGpio' or define your own class. You can
     * also use 'MockSensorIo' if you don't have any actual hardware connection.
     */
    io: ISensorIoStatic<SensorIo>;

    /**
     * The time interval in milliseconds with which the values of the sensor should
     * be read and published. This should only be used if the observationPublicationType
     * is not set to none.
     */
    samplingInterval?: number;

    /**
     * Defines whether and how the observations should be automatically published
     * from the controller. This is used together with the samplingInterval
     * value. If it is not set to none, samplingInterval must be set to positive
     * value.
     */
    observationPublicationType: ObservationPublicationType;
}

/**
 * The registered sensors as they are used by the SensorController. This contains
 * the Sensor object that is used for communication and the IO interface
 * that defines the hardware connection and how the pin is read and written to.
 */
export interface SensorContainer {
    /**
     * The Sensor object. This will be used for the main communication
     * with other controllers and applications.
     */
    sensor: Sensor;

    /**
     * The IO handling used for this sensor.
     */
    io: SensorIo;
}

/**
 * Manages a set of registered Sensors and provides a source for both Sensors and
 * Sensor-related objects. This controller is designed to be used by a server as a 
 * counterpart of a SensorObserverController.
 * 
 * You can either register the Sensors manually by calling registerSensor method or
 * do it automatically from the controller options by defining your Sensors in a
 * SensorDefinition array given in the 'sensors' option of the controller.
 * 
 * SensorSourceController also takes some other options (they all default to false):
 * - ignoreSensorDiscoverEvents: Ignores received discover events for registered sensors.
 * - ignoreSensorQueryEvents: Ignores received query events for registered sensors.
 * - skipSensorAdvertise: Does not advertise a sensor when registered.
 * - skipSensorDeadvertise: Does not deadvertise a sensor when unregistered.
 */
export class SensorSourceController extends Controller {
    private _sensors = new Map<Uuid, SensorContainer>();
    // Publishers store a NodeJS.Timer which cannot be added directly in the imports.
    // That's why we use any to avoid compile errors.
    private _observationPublishers = new Map<Uuid, any>();
    private _sensorValueObservables = new Map<Uuid, Subject<any>>();

    private _querySubscription: Subscription;
    private _discoverSubscription: Subscription;

    onInit() {
        super.onInit();
        if (!!this.options["sensors"] && this._isSensorDefinitionArray(this.options["sensors"])) {
            (this.options["sensors"] as SensorDefinition[]).forEach(definition => {
                this.registerSensor(
                    definition.sensor,
                    new definition.io(definition.parameters),
                    definition.observationPublicationType,
                    definition.samplingInterval);
            });
        }
    }

    onCommunicationManagerStopping() {
        super.onCommunicationManagerStopping();
        this._querySubscription && this._querySubscription.unsubscribe();
        this._querySubscription = undefined;
        this._discoverSubscription && this._discoverSubscription.unsubscribe();
        this._discoverSubscription = undefined;
    }

    /**
     * Returns all the registered sensor containers in an array.
     */
    get registeredSensorContainers(): SensorContainer[] {
        return Array.from(this._sensors.values());
    }

    /**
     * Returns all the registered Sensors in an array.
     */
    get registeredSensors(): Sensor[] {
        const sensors: Sensor[] = [];
        this._sensors.forEach(container => sensors.push(container.sensor));
        return sensors;
    }

    /**
     * Determines whether a Sensor with the given objectId is registered with
     * this controller.
     */
    isRegistered(sensorId: Uuid): boolean {
        return this._sensors.has(sensorId);
    }

    /**
     * Returns the sensor container associated with the given Sensor objectId.
     * If no such container exists then 'undefined' is returned.
     */
    getSensorContainer(sensorId: Uuid): SensorContainer {
        return this._sensors.get(sensorId);
    }

    /**
     * Returns the Sensor associated with the given Sensor objectId.
     * If no such container exists then 'undefined' is returned.
     */
    getSensor(sensorId: Uuid): Sensor {
        const container = this._sensors.get(sensorId);
        return !container ? undefined : container.sensor;
    }

    /**
     * Returns the sensor IO interface associated with the given Sensor objectId.
     * If no such container exists then 'undefined' is returned.
     */
    getSensorIo(sensorId: Uuid): SensorIo {
        const container = this._sensors.get(sensorId);
        return !container ? undefined : container.io;
    }

    /**
     * Returns a hot observable that emits values read from the sensor. Only
     * the values read with publishChanneledObservation or 
     * publishAdvertisedObservation will emit new values. Reading the sensor
     * value manually with SensorIo.read will not emit any new value.
     * 
     * The observable is created lazily and cached. Once the Sensor associated
     * with the observable is unregistered, all subscriptions to the observable
     * are also unsubscribed.
     * 
     * If the Sensor is not registered, this method will throw an error.
     */
    getSensorValueObservable(sensorId: Uuid): Observable<any> {
        if (!this._sensors.has(sensorId)) {
            throw new Error("Cannot create a value observable for a non-registered sensor.");
        }

        if (!this._sensorValueObservables.has(sensorId)) {
            this._sensorValueObservables.set(sensorId, new Subject<any>());
        }
        return this._sensorValueObservables.get(sensorId);
    }

    /**
     * Registers a Sensor to this controller along with its IO handler interface.
     * You can call this function at runtime or register sensors automatically at
     * the beginning by passing them in the controller options under 'sensors' as
     * a SensorDefinition array.
     * 
     * If a Sensor with the given objectId already exists, this method is simply
     * ignored.
     * 
     * When a sensor is registered, it is advertised to notify other listeners (unless
     * ignoreSensorAdvertise option is set). The controller class also starts to listen 
     * on query and discover events for Sensors (unless skipSensorQueryEvents or
     * skipSensorDiscoverEvents options are set).
     * 
     * If the observationPublicationType is not set to none, then the value of the
     * sensor is read every `samplingInterval` milliseconds and published as an
     * observation automatically.
     * @param sensor Sensor to register to the controller.
     * @param io IO handler interface for the sensor. This could be an 'Aio',
     * 'InputGpio', 'OutputGpio', 'MockSensorIo' or a custom handler.
     * @param observationPublicationType Whether and how the observations of the
     * sensor should be published.
     * @param samplingInterval If the observations are published automatically,
     * defines how often the publications should be sent.
     */
    registerSensor(
        sensor: Sensor,
        io: SensorIo,
        observationPublicationType: ObservationPublicationType = "none",
        samplingInterval?: number) {
        if (this._sensors.has(sensor.objectId)) {
            return;
        }

        if (observationPublicationType !== "none" && (!samplingInterval || samplingInterval <= 0)) {
            throw new Error("A positive sampling interval is expected.");
        }

        this._sensors.set(sensor.objectId, {
            sensor: sensor,
            io: io,
        });

        if (observationPublicationType !== "none") {
            this._observationPublishers.set(
                sensor.objectId,
                setInterval(() => this._publishObservation(
                    sensor.objectId, observationPublicationType === "channel"),
                    samplingInterval));
        }

        if (!this.options["skipSensorAdvertise"]) {
            this.communicationManager
                .publishAdvertise(AdvertiseEvent.withObject(this.identity, sensor));
        }
        if (!this.options["ignoreSensorQueryEvents"]) {
            this._observeSensorQueriesIfNeeded();
        }
        if (!this.options["ignoreSensorDiscoverEvents"]) {
            this._observeSensorDiscoversIfNeeded();
        }
    }

    /**
     * Unregisters a previously registered Sensor. If no such Sensor is 
     * registered, then an error is thrown.
     * 
     * This also sends a disadvertise event to notify the listeners (unless
     * ignoreSensorDeadvertise option is set). The query and discover events 
     * for this Sensor are ignored from this point on.
     * 
     * If a value observable for the Sensor exists, then all subscriptions
     * to that observable are unsubscribed. 
     */
    unregisterSensor(sensorId: Uuid) {
        if (!this._sensors.has(sensorId)) {
            return new Error("sensorId is not registered.");
        }

        this._sensors.delete(sensorId);
        if (this._sensorValueObservables.has(sensorId)) {
            this._sensorValueObservables.get(sensorId).unsubscribe();
            this._sensorValueObservables.delete(sensorId);
        }
        if (this._observationPublishers.has(sensorId)) {
            clearInterval(this._observationPublishers.get(sensorId));
            this._observationPublishers.delete(sensorId);
        }

        if (!this.options["skipSensorDeadvertise"]) {
            this.communicationManager
                .publishDeadvertise(DeadvertiseEvent.withObjectIds(this.identity, sensorId));
        }

        if (this._sensors.size === 0) {
            if (this._querySubscription) {
                this._querySubscription.unsubscribe();
            }
            if (this._discoverSubscription) {
                this._discoverSubscription.unsubscribe();
            }
        }
    }

    /**
     * Publishes an observation for a registered Sensor. If no such registered
     * Sensor exists then an error is thrown. The publication is performed in the
     * form of a channel event. By default the channelId is the sensorId. However,
     * subclasses can change it by overriding getChannelId method.
     * 
     * The observation value is read directly from the IO handler of the Sensor.
     * The observation time is recorded as this method is called. Subclasses can
     * change the final value of the observation object by overriding the
     * createObservation method.
     * @param sensorId ObjectId of the Sensor to publish the observation.
     * @param resultQuality The quality of the result. (optional)
     * @param validTime The validity time of the observation. (optional)
     * @param parameters Extra parameters for the observation. (optional)
     * @param featureOfInterestId UUID of associated feature of interest. (optional)
     */
    publishChanneledObservation(
        sensorId: Uuid,
        resultQuality?: string[],
        validTime?: TimeInterval,
        parameters?: { [key: string]: any; },
        featureOfInterestId?: Uuid) {
        this._publishObservation(
            sensorId,
            true /* channeled */,
            resultQuality,
            validTime,
            parameters,
            featureOfInterestId);
    }

    /**
     * Publishes an observation for a registered Sensor. If no such registered
     * Sensor exists then an error is thrown. The publication is performed in the
     * form of an advertise event.
     * 
     * The observation value is read directly from the IO handler of the Sensor.
     * The observation time is recorded as this method is called. Subclasses can
     * change the final value of the observation object by overriding the
     * createObservation method.
     * @param sensorId ObjectId of the Sensor to publish the observation.
     * @param resultQuality The quality of the result. (optional)
     * @param validTime The validity time of the observation. (optional)
     * @param parameters Extra parameters for the observation. (optional)
     * @param featureOfInterestId UUID of associated feature of interest. (optional)
     */
    publishAdvertisedObservation(
        sensorId: Uuid,
        resultQuality?: string[],
        validTime?: TimeInterval,
        parameters?: { [key: string]: any; },
        featureOfInterestId?: Uuid) {
        this._publishObservation(
            sensorId,
            false /* advertised */,
            resultQuality,
            validTime,
            parameters,
            featureOfInterestId);
    }

    /**
     * Creates an Observation object for a Sensor. Subclasses can override
     * this method to provide their own logic.
     * @param container Sensor container creating the observation.
     * @param value Value of the observation.
     * @param resultQuality The quality of the result. (optional)
     * @param validTime The validity time of the observation. (optional)
     * @param parameters Extra parameters for the observation. (optional)
     * @param featureOfInterestId UUID of associated feature of interest. (optional)
     */
    protected createObservation(
        container: SensorContainer,
        value: any,
        resultQuality?: string[],
        validTime?: TimeInterval,
        parameters?: { [key: string]: any; },
        featureOfInterestId?: Uuid): Observation {
        const now = Date.now();
        return {
            name: "Observation of " + container.sensor.name,
            objectId: this.runtime.newUuid(),
            parentObjectId: container.sensor.objectId,
            coreType: "CoatyObject",
            objectType: SensorThingsTypes.OBJECT_TYPE_OBSERVATION,
            phenomenonTime: now,
            result: value,
            resultTime: now,
            resultQuality: resultQuality,
            validTime: validTime,
            parameters: parameters,
            featureOfInterestId: featureOfInterestId,
        };
    }

    /**
     * Returns the channelId associated with a sensor container. By
     * default, it is the objectId of the Sensor. Subclasses can override
     * this method to provide their own logic.
     */
    protected getChannelId(container: SensorContainer): string {
        return container.sensor.objectId;
    }

    /**
     * Lifecycle method called just before an observation is published for
     * a specific Sensor. Default implementation does nothing.
     */
    protected onObservationWillPublish(container: SensorContainer, observation: Observation) {
        /* tslint:disable:no-empty */
        /* tslint:enable:no-empty */
    }

    /**
     * Lifecycle method called immediately after an observation is published for
     * a specific Sensor. Default implementation does nothing.
     */
    protected onObservationDidPublish(container: SensorContainer, observation: Observation) {
        /* tslint:disable:no-empty */
        /* tslint:enable:no-empty */
    }

    private _observeSensorQueriesIfNeeded() {
        if (this._querySubscription) {
            return;
        }

        this._querySubscription = this.communicationManager
            .observeQuery(this.identity)
            .pipe(filter(event => event.eventData.isObjectTypeCompatible(SensorThingsTypes.OBJECT_TYPE_SENSOR)))
            .subscribe(event => {
                let retrieved: Sensor[] = [];
                if (!event.eventData.objectFilter) {
                    retrieved = this.registeredSensors;
                } else {
                    this._sensors.forEach(container => {
                        if (ObjectMatcher.matchesFilter(container.sensor, event.eventData.objectFilter)) {
                            retrieved.push(container.sensor);
                        }
                    });
                }
                if (retrieved.length > 0) {
                    event.retrieve(RetrieveEvent.withObjects(this.identity, retrieved));
                }
            });
    }

    private _observeSensorDiscoversIfNeeded() {
        if (this._discoverSubscription) {
            return;
        }

        this._discoverSubscription = this.communicationManager
            .observeDiscover(this.identity)
            .subscribe(event => {
                if (event.eventData.isDiscoveringObjectId) {
                    if (this._sensors.has(event.eventData.objectId)) {
                        event.resolve(ResolveEvent.withObject(this.identity, this._sensors.get(event.eventData.objectId).sensor));
                    }
                } else if (
                    event.eventData.isDiscoveringTypes &&
                    event.eventData.isObjectTypeCompatible(SensorThingsTypes.OBJECT_TYPE_SENSOR)) {
                    this._sensors.forEach(container => {
                        event.resolve(ResolveEvent.withObject(this.identity, container.sensor));
                    });
                }
            });
    }

    private _publishObservation(
        sensorId: Uuid,
        channeled: boolean,
        resultQuality?: string[],
        validTime?: TimeInterval,
        parameters?: { [key: string]: any; },
        featureOfInterestId?: Uuid) {
        if (!this._sensors.has(sensorId)) {
            return new Error("sensorId is not registered.");
        }

        const container = this._sensors.get(sensorId);
        container.io.read(value => {
            // Publish the value over the subject if it exists.
            const subject = this._sensorValueObservables.get(sensorId);
            if (subject) {
                subject.next(value);
            }

            const observation = this.createObservation(
                container,
                value,
                resultQuality,
                validTime,
                parameters,
                featureOfInterestId);

            this.onObservationWillPublish(container, observation);
            if (channeled) {
                this.communicationManager.publishChannel(
                    ChannelEvent.withObject(
                        this.identity,
                        this.getChannelId(container),
                        observation));
            } else {
                this.communicationManager.publishAdvertise(
                    AdvertiseEvent.withObject(this.identity, observation));
            }
            this.onObservationDidPublish(container, observation);
        });
    }

    private _isSensorDefinition(definition: SensorDefinition): boolean {
        return definition !== undefined &&
            SensorThingsTypes.isSensor(definition.sensor) &&
            definition.io !== undefined &&
            typeof definition.observationPublicationType === "string" &&
            (definition.observationPublicationType === "none" ||
                (definition.observationPublicationType === "advertise" ||
                    definition.observationPublicationType === "channel") &&
                typeof definition.samplingInterval === "number" &&
                definition.samplingInterval > 0);
    }

    private _isSensorDefinitionArray(obj: any): boolean {
        return Array.isArray(obj) &&
            (<SensorDefinition[]> obj).every(o => this._isSensorDefinition(o));
    }
}
