/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { filter, take } from "rxjs/operators";

import {
    AdvertiseEvent,
    AdvertiseEventData,
    ChannelEvent,
    ChannelEventData,
    CoatyObject,
    Controller,
    CoreType,
    CoreTypes,
    DiscoverEvent,
    Location,
    ResolveEvent,
    Uuid,
} from "../..";
import {
    EncodingTypes,
    FeatureOfInterest,
    Observation,
    ObservationTypes,
    Sensor,
    SensorEncodingTypes,
    SensorThingsTypes,
    Thing,
} from "../../sensor-things";

import { Spy } from "./utils";

export interface AdvertiseEventLogger {
    count: number;
    eventData: AdvertiseEventData[];
}

export interface ChannelEventLogger {
    count: number;
    eventData: ChannelEventData[];
}

export interface RawEventLogger {
    count: number;
    eventData: any[];
}

/**
 * Mock controller consuming data produced by sensorThings sensors
 */
export class MockReceiverController extends Controller {
    onInit() {
        super.onInit();
        this.communicationManager
            .publishDiscover(DiscoverEvent.withObjectTypes([SensorThingsTypes.OBJECT_TYPE_SENSOR]))
            .subscribe(event => {
                Spy.set("MockConsumerController", event);
            });

        this.communicationManager
            .observeCommunicationState()
            .subscribe(state => {
                Spy.set("MockConsumerController", Spy.NO_VALUE, state);
            });
    }

    watchForAdvertiseEvents(logger: AdvertiseEventLogger, objectType: string) {
        this.communicationManager
            .observeAdvertiseWithObjectType(objectType)
            .subscribe(event => {
                logger.count++;
                logger.eventData.push(event.data);
            });
    }

    watchForChannelEvents(logger: ChannelEventLogger, channelId: string) {
        this.communicationManager
            .observeChannel(channelId)
            .subscribe(event => {
                logger.count++;
                logger.eventData.push(event.data);
            });
    }

    watchForRawEvents(logger: RawEventLogger, topic: string) {
        this.communicationManager
            .observeRaw(topic)
            .subscribe(value => {
                logger.count++;
                // Raw values are emitted as Uint8Array/Buffer objects
                logger.eventData.push(value.toString());
            });
    }

}

/**
 * Mock controller producing sensorThings observations.
 */
export class MockEmitterController extends Controller {

    private _name: string;

    onInit() {
        super.onInit();
        this._name = this.options["name"];

        this._handleDiscoverEvents();
    }

    /**
     * Publish count objects of type objectType through advertise.
     * @param count number Number of times a different object will be advertised
     * @param objectType ObjectType the type for objects to be emitted
     */
    publishAdvertiseEvents(count: number = 1, objectType: string) {
        for (let i = 1; i <= count; i++) {
            this.communicationManager.publishAdvertise(
                AdvertiseEvent.withObject(
                    this._createSensorThings(i, objectType, "Advertised")));
        }
    }

    /**
     * Publish count objects of type objectType on a given channel.
     * @param count number Number of times a different object will be published
     * @param objectType ObjectType the type for objects to be emitted
     * @param channelId the channel id on which objects will be published
     */
    publishChannelEvents(count: number, objectType: CoreType, channelId: string) {
        for (let i = 1; i <= count; i++) {
            this.communicationManager.publishChannel(
                ChannelEvent.withObject(
                    channelId,
                    this._createSensorThings(i, objectType, "Channeled")));
        }
    }

    /**
     * Count and store the advertise events for objectType
     * @param logger 
     * @param objectType Type to look the advertise events for.
     */
    watchForAdvertiseEvents(logger: AdvertiseEventLogger, objectTypes: string) {
        this.communicationManager
            .observeAdvertiseWithObjectType(objectTypes)
            .subscribe(event => {
                logger.count++;
                logger.eventData.push(event.data);
            });
    }

    /**
     * Observe discover events for object of Type sensor reply to the first of them
     */
    private _handleDiscoverEvents() {
        this.communicationManager
            .observeDiscover()
            .pipe(
                filter(event => event.data.isObjectTypeCompatible(SensorThingsTypes.OBJECT_TYPE_SENSOR)),
                // Take first event only and unsubscribe automatically afterwards
                take(1),
            )
            .subscribe(event => {
                Spy.set(this._name, event);

                setTimeout(
                    () => {
                        event.resolve(ResolveEvent.withObject(
                            this._createSensorThings(100, SensorThingsTypes.OBJECT_TYPE_SENSOR)));
                    },
                    this.options["responseDelay"]);
            });
    }

    private _createSensorThings(i: number, objectType: string, name?: string): CoatyObject {
        return SensorThingsCollection.getByObjectType(objectType, this.runtime.newUuid(), i, name);
    }

}

/**
 * A collection of sensorThings objects. Used to check validators behaviours.
 */
export class SensorThingsCollection {
    public static readonly sensor: Sensor = {
        name: "Thermometer",
        objectType: SensorThingsTypes.OBJECT_TYPE_SENSOR,
        coreType: "CoatyObject",
        objectId: "83dfc46a-0709-4f70-9ea5-beebf8fa89af",
        unitOfMeasurement: {
            name: "Celsius",
            symbol: "degC",
            definition: "http://www.qudt.org/qudt/owl/1.0.0/unit/Instances.html#DegreeCelsius",
        },
        observationType: ObservationTypes.MEASUREMENT,
        parentObjectId: "00tt046a-0709-4f70-9ea5-beebf8fa89af",
        observedProperty: {
            name: "Temperature",
            description: "DewPoint Temperature",
            definition: "http://dbpedia.org/page/Dew_point",
        },
        phenomenonTime: {
            start: Date.now() - 1000,
            end: Date.now(),
        },
        resultTime: {
            start: Date.now() - 1000,
            duration: 1000,
        },
        description: "A thermometer measures the temperature",
        encodingType: SensorEncodingTypes.UNDEFINED,
        metadata: {},
    };

    public static readonly featureOfInterest: FeatureOfInterest = {
        name: "FOI1",
        objectType: SensorThingsTypes.OBJECT_TYPE_FEATURE_OF_INTEREST,
        coreType: "CoatyObject",
        objectId: "b15521af-9077-4b22-978a-5ff8381d53ae",
        description: "feature of interest",
        encodingType: EncodingTypes.UNDEFINED,
        metadata: "interesting",
    };

    public static readonly location: Location = {
        name: "Muenchen",
        objectType: CoreTypes.OBJECT_TYPE_LOCATION,
        coreType: "Location",
        objectId: "14119642-ee6a-4596-bf34-d8a3436290d3",
        geoLocation: {
            coords: {
                latitude: 32,
                longitude: 46,
                accuracy: 1,
            },
            timestamp: Date.now(),
        },
    };

    public static readonly observation: Observation = {
        name: "Observation1",
        objectType: SensorThingsTypes.OBJECT_TYPE_OBSERVATION,
        coreType: "CoatyObject",
        objectId: "31ba0e43-ea26-4179-acf2-299e3a9a0f92",
        phenomenonTime: Date.now(),
        resultTime: Date.now(),
        result: "12.50",
        parentObjectId: "83dfc46a-0709-4f70-9ea5-beebf8fa89af",
        featureOfInterestId: "b15521af-9077-4b22-978a-5ff8381d53ae",
    };

    public static readonly thing: Thing = {
        name: "Thing1",
        objectType: SensorThingsTypes.OBJECT_TYPE_THING,
        coreType: "CoatyObject",
        objectId: "4c480c29-f65f-496f-8005-03e7503eec2b",
        description: "",
        locationId: "14119642-ee6a-4596-bf34-d8a3436290d3",
    };

    public static getByObjectType(objectType: string, uuid: Uuid, i?: number, name?: string) {
        // routing
        const result = SensorThingsCollection._objectTypeRouter(objectType);
        result.objectId = uuid;
        if (i !== undefined && name !== undefined && result.hasOwnProperty("name")) {
            result.name = name + "_" + i;
        }
        return result;
    }

    private static _objectTypeRouter(objectType: string) {
        switch (objectType) {
            case SensorThingsTypes.OBJECT_TYPE_SENSOR:
                return SensorThingsCollection.sensor;
            case SensorThingsTypes.OBJECT_TYPE_FEATURE_OF_INTEREST:
                return SensorThingsCollection.featureOfInterest;
            case CoreTypes.OBJECT_TYPE_LOCATION:
                return SensorThingsCollection.location;
            case SensorThingsTypes.OBJECT_TYPE_OBSERVATION:
                return SensorThingsCollection.observation;
            case SensorThingsTypes.OBJECT_TYPE_THING:
                return SensorThingsCollection.thing;
            default:
                throw new Error("SensorThings objectType expected. " + objectType + " given");
        }
    }
}
