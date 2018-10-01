/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { Observable } from "rxjs";
import { filter, map } from "rxjs/operators";

import { DiscoverEvent, QueryEvent } from "../com/communication-events";
import { Controller } from "../controller";
import { filterOp, ObjectFilter, Uuid } from "../model";
import { Thing } from "./objects";
import { SensorThingsTypes } from "./types";

/**
 * Observes Things and Thing-related objects. This controller is designed
 * to be used by a client with a corresponding controller (e.g. ThingSourceController)
 * that answers to its events.
 */
export class ThingObserverController extends Controller {

    /**
     * Returns an observable of the Things in the system. This is performed
     * by sending a Discovery event with the object type of Thing.
     * 
     * This method does not perform any kind of caching and it should
     * be performed on the application-side.
     */
    public discoverThings(): Observable<Thing> {
        return this.communicationManager
            .publishDiscover(DiscoverEvent.withObjectTypes(
                this.identity,
                [SensorThingsTypes.OBJECT_TYPE_THING]))
            .pipe(
                filter(event => !!event.eventData.object),
                map(event => event.eventData.object as Thing),
            );
    }

    /**
     * Returns a hot observable emitting advertised Things.
     * 
     * This method does not perform any kind of caching and it should
     * be performed on the application-side.
     */
    public observeAdvertisedThings(): Observable<Thing> {
        return this.communicationManager
            .observeAdvertiseWithObjectType(this.identity, SensorThingsTypes.OBJECT_TYPE_THING)
            .pipe(
                map(event => event.eventData.object as Thing),
                filter(thing => !!thing),
            );
    }

    /**
     * Returns an observable of the Things that are located at the
     * given Location. This is performed by sending a Query
     * event for Thing objects with the locationId matching the
     * objectId of the Location.
     * 
     * This method does not perform any kind of caching and it should
     * be performed on the application-side.
     */
    public queryThingsAtLocation(locationId: Uuid): Observable<Thing[]> {
        const objectFilter: ObjectFilter = {
            conditions: {
                and: [["locationId", filterOp.equals(locationId)]],
            },
        };

        return this.communicationManager
            .publishQuery(QueryEvent.withObjectTypes(
                this.identity,
                [SensorThingsTypes.OBJECT_TYPE_THING],
                objectFilter))
            .pipe(map(event => event.eventData.objects as Thing[]));
    }
}
