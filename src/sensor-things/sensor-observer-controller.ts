/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { Observable } from "rxjs";
import { filter, map } from "rxjs/operators";

import { Controller, DiscoverEvent, filterOp, ObjectFilter, QueryEvent, Uuid } from "..";
import { Observation, Sensor } from "./objects";
import { SensorThingsTypes } from "./types";

/**
 * Observes Sensors and Sensor-related objects. This controller is designed
 * to be used by a client as a counterpart to a SensorSourceController which
 * should answer its requests.
 */
export class SensorObserverController extends Controller {

    /**
     * Observe the channeled observations for the given Sensor. By default, the
     * channelId is the same as the sensorId.
     * @param sensorId ObjectId of the sensor to listen observations of.
     * @param channelId ChannelId to listen to. This is by default the objectId of the
     * Sensor and therefore should be left undefined. (optional)
     */
    observeChanneledObservations(sensorId: Uuid, channelId?: string): Observable<Observation> {
        return this.communicationManager
            .observeChannel(this.identity, channelId || sensorId)
            .pipe(
                filter(event => !!event.eventData.object
                    && event.eventData.object.objectType === SensorThingsTypes.OBJECT_TYPE_OBSERVATION
                    && event.eventData.object.parentObjectId === sensorId),
                map(event => event.eventData.object as Observation));
    }

    /**
     * Observe the advertised observations for the given Sensor.
     * @param sensorId ObjectId of the sensor to listen observations of.
     */
    observeAdvertisedObservations(sensorId: Uuid): Observable<Observation> {
        return this.communicationManager
            .observeAdvertiseWithObjectType(this.identity, SensorThingsTypes.OBJECT_TYPE_OBSERVATION)
            .pipe(
                filter(event => !!event.eventData.object
                    && event.eventData.object.parentObjectId === sensorId),
                map(event => event.eventData.object as Observation),
            );
    }

    /**
     * Returns a hot observable emitting advertised Sensors.
     * 
     * This method does not perform any kind of caching and it should
     * be performed on the application-side.
     */
    observeAdvertisedSensors(): Observable<Sensor> {
        return this.communicationManager
            .observeAdvertiseWithObjectType(this.identity, SensorThingsTypes.OBJECT_TYPE_SENSOR)
            .pipe(
                map(event => event.eventData.object as Sensor),
                filter(sensor => !!sensor),
            );
    }

    /**
     * Returns an observable of the Sensors in the system. This is performed
     * by sending a Discovery event with the object type of Sensor.
     * 
     * This method does not perform any kind of caching and it should
     * be performed on the application-side.
     */
    discoverSensors(): Observable<Sensor> {
        return this.communicationManager
            .publishDiscover(DiscoverEvent.withObjectTypes(
                this.identity,
                [SensorThingsTypes.OBJECT_TYPE_SENSOR]))
            .pipe(
                filter(event => !!event.eventData.object),
                map(event => event.eventData.object as Sensor),
            );
    }

    /**
     * Returns an observable of the Sensors that are associated
     * with this Thing. This is performed by sending a Query
     * event for Sensor objects with the parentObjectId matching the
     * objectId of the Thing.
     * 
     * This method does not perform any kind of caching and it should
     * be performed on the application-side.
     */
    querySensorsOfThing(thingId: Uuid): Observable<Sensor[]> {
        const objectFilter: ObjectFilter = {
            conditions: ["parentObjectId", filterOp.equals(thingId)],
        };

        return this.communicationManager
            .publishQuery(QueryEvent.withObjectTypes(
                this.identity,
                [SensorThingsTypes.OBJECT_TYPE_SENSOR],
                objectFilter))
            .pipe(map(event => event.eventData.objects as Sensor[]));
    }
}
