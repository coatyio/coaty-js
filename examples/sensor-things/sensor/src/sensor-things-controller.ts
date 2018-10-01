/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { Subscription } from "rxjs";

import { AdvertiseEvent, ResolveEvent } from "coaty/com";
import { CoatyObject, Uuid } from "coaty/model";
import {
    EncodingTypes,
    FeatureOfInterest,
    MockSensorIo,
    Observation,
    ObservationTypes,
    Sensor,
    SensorContainer,
    SensorEncodingTypes,
    SensorSourceController,
    SensorThingsTypes,
    Thing,
    UnitOfMeasurement,
} from "coaty/sensor-things";
import { TimeInterval } from "coaty/util";
import { freemem, hostname, loadavg, type as osType, uptime } from "os";

/**
 * Handles registration and discoveries of sensor objects.
 */
export class SensorThingsController extends SensorSourceController {
    private _thing: Thing;
    private _sensorsArray: Sensor[] = [];
    private _featureOfInterest: FeatureOfInterest;

    /** 
     * Store all sensor things objects of the system.
     * All objects are stored in only one array to simplify object retrieval by discover.
     * Observations should not be stored in dataStore because they are not relevant once they have been sent
     */
    private _dataStore = new Map<Uuid, CoatyObject>();

    /** Subscription to discover events */
    private _discoverSensorThingsSubscription: Subscription;

    onCommunicationManagerStarting() {
        super.onCommunicationManagerStarting();
        this._createObjects(this.options.answers);

        console.log(`# Client User ID: ${this.runtime.options.associatedUser.objectId}`);
        console.log(`# Thing ID: ${this._thing.objectId}`);

        this._discoverSensorThingsSubscription = this._observeDiscover();
    }

    onCommunicationManagerStopping() {
        super.onCommunicationManagerStopping();
        this._discoverSensorThingsSubscription && this._discoverSensorThingsSubscription.unsubscribe();
    }

    protected createObservation(
        container: SensorContainer,
        value: any,
        resultQuality?: string[],
        validTime?: TimeInterval,
        parameters?: { [key: string]: any; }): Observation {
        return super.createObservation(
            container,
            this._getMetricResult(container.sensor.objectId),
            resultQuality,
            validTime,
            parameters,
            this._featureOfInterest.objectId);
    }

    /**
     * Subscribe to discover events and resolve it if the discovered id is in the datastore.
     * 
     * There are two types of discover events that are considered. Discover event with an
     * objectId (to find any sensor things object) and the discover event for Things (used
     * by ThingsController to find all the things in the system).
     */
    private _observeDiscover() {
        return this.communicationManager.observeDiscover(this.identity)
            .subscribe(event => {
                if (event.eventData.isDiscoveringObjectId) {
                    if (this._dataStore.has(event.eventData.objectId)) {
                        event.resolve(ResolveEvent.withObject(
                            this.identity, this._dataStore.get(event.eventData.objectId)));
                    }
                } else if (event.eventData.isObjectTypeCompatible(SensorThingsTypes.OBJECT_TYPE_THING)) {
                    event.resolve(ResolveEvent.withObject(this.identity, this._thing));
                }
            });
    }

    /**
     * Creates a single Thing and FeatureOfInterest, and a Sensor for each metric. 
     */
    private _createObjects(answers: { metrics: string[], names: { deviceName: string, roomName: string } }) {
        this._sensorsArray = [];
        this._thing = {
            name: "Thing " + answers.names.deviceName,
            objectId: this.runtime.newUuid(),
            objectType: SensorThingsTypes.OBJECT_TYPE_THING,
            coreType: "CoatyObject",
            description: "A device you can monitor (os.name: " + hostname() + ")", // nodejs os.hostname() function
        };
        this._dataStore.set(this._thing.objectId, this._thing);
        this.communicationManager.publishAdvertise(AdvertiseEvent.withObject(this.identity, this._thing));

        this._featureOfInterest = {
            name: "Feature of Interest " + answers.names.roomName,
            objectId: this.runtime.newUuid(),
            objectType: SensorThingsTypes.OBJECT_TYPE_FEATURE_OF_INTEREST,
            coreType: "CoatyObject",
            description: "The location of your device (more relevant for real sensors)",
            encodingType: EncodingTypes.UNDEFINED,
            metadata: "Room " + hostname(),
        };
        this._dataStore.set(this._featureOfInterest.objectId, this._featureOfInterest);

        for (const metric of answers.metrics) {
            const sensor: Sensor = {
                name: "Sensor " + metric,
                objectId: this.runtime.newUuid(),
                objectType: SensorThingsTypes.OBJECT_TYPE_SENSOR,
                coreType: "CoatyObject",
                description: `Sensor measuring ${metric}`,
                unitOfMeasurement: this._getUnitOfMeasurement(metric),
                observationType: ObservationTypes.TRUTH,
                observedProperty: {
                    name: "Observed Property " + metric,
                    description: metric,
                    definition: "https://www.google.com.tr/?q=" + metric, // not a valid definition
                },
                parentObjectId: this._thing.objectId,
                encodingType: SensorEncodingTypes.UNDEFINED,
                metadata: {},
            };
            this._dataStore.set(sensor.objectId, sensor);

            // Register Sensor with SensorController.
            this._sensorsArray.push(sensor);
            this.registerSensor(sensor, new MockSensorIo(), "channel", this.options["monitoringInterval"]);
        }
    }

    /**
     * Returns a UnitOfMeasurement based on the given metric
     * @param metric string (Load average || Free memory || Uptime)
     * @return UnitOfMeasurement
     */
    private _getUnitOfMeasurement(metric: string): UnitOfMeasurement {
        if (metric === "Load average") {
            return {
                name: "Percentage",
                symbol: "%",
                definition: "http://www.qudt.org/qudt/owl/1.0.0/unit/Instances.html#Percent",
            };
        } else if (metric === "Free memory") {
            return {
                name: "Byte",
                symbol: "B",
                definition: "http://www.qudt.org/qudt/owl/1.0.0/unit/Instances.html#Byte",
            };
        } else if (metric === "Uptime") {
            return {
                name: "Second",
                symbol: "s",
                definition: "http://www.qudt.org/qudt/owl/1.0.0/unit/Instances.html#SecondTime",
            };
        } else {
            throw new TypeError("'Load average', 'Free memory' , 'Uptime' expected. Got " + metric);
        }
    }

    private _getMetricResult(sensorId: string): number {
        const metricIndex = this._sensorsArray.findIndex(s => s.objectId === sensorId);
        switch (metricIndex) {
            case 0:
                // The load average is a UNIX-specific concept with no real equivalent on Windows platforms.
                // On Windows, the return value is always [0, 0, 0].
                return Math.round(osType().startsWith("Windows") ? Math.random() * 100 : loadavg()[0] * 100);
            case 1:
                return freemem();
            case 2:
                return uptime();
            default:
                throw new TypeError("There are only three metrics. Got index " + metricIndex);
        }
    }
}
