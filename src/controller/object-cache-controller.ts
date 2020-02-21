/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { Observable, of, Subscription } from "rxjs";
import { filter, first, map } from "rxjs/operators";

import { CoatyObject, CoreType, DiscoverEvent, Uuid } from "..";
import { Controller } from "./controller";

/**
 * Discovers objects by given object Ids and maintains a local cache of
 * resolved objects. The controller will also update existing objects in its
 * cache whenever such objects are advertised by other parties.
 * 
 * To realize an object cache controller for a specific core types or for specific objects,
 * define a custom controller class that extends this abstract class and
 * set the core type and/or the filter predicate of objects to be cached in the `OnInit` method.
 */
export abstract class ObjectCacheController<T extends CoatyObject> extends Controller {

    private _objectCache: Map<Uuid, T>;
    private _pendingRequests: Map<Uuid, Observable<T>>;
    private _coreType: CoreType;
    private _objectFilter: (obj: T) => boolean;
    private _advertiseSubscription: Subscription;

    onInit() {
        super.onInit();

        this._objectCache = new Map<Uuid, T>();
        this._pendingRequests = new Map<Uuid, Observable<T>>();
        this._coreType = "CoatyObject";
        this._objectFilter = undefined;
    }

    onCommunicationManagerStarting() {
        super.onCommunicationManagerStarting();

        this._objectCache.clear();
        this._pendingRequests.clear();
        this._advertiseSubscription = this._observeObjectAdvertisements();
    }

    onCommunicationManagerStopping() {
        super.onCommunicationManagerStopping();
        this._advertiseSubscription?.unsubscribe();
    }

    /**
     * Gets an observable that emits the first object resolved for the given
     * object Id, then completes.
     *
     * @param objectId the object Id of the object to resolve
     * @param shouldResolvePending true if an already pending resolution should be
     * rediscovered; false otherwise (default)
     */
    resolveObject(objectId: Uuid, shouldResolvePending = false): Observable<T> {
        const object = this._objectCache.get(objectId);

        if (object) {
            return of(object);
        }

        let resolve = this._pendingRequests.get(objectId);
        if (!resolve || shouldResolvePending) {
            // Create pending request for the given object ID.
            resolve = this.communicationManager
                .publishDiscover(DiscoverEvent.withObjectId(objectId))
                .pipe(
                    map(event => event.data.object as T),
                    first(obj => obj &&
                        (obj.coreType === this.coreType) &&
                        (this._objectFilter ? this._objectFilter(obj) : true)),
                );

            this._pendingRequests.set(objectId, resolve);

            // Cache the resolved object.
            resolve.subscribe(obj => {
                this._objectCache.set(obj.objectId, obj);
                this._pendingRequests.delete(obj.objectId);
            });
        }

        return resolve;
    }

    /**
     * Sets a filter predicate on objects to be resolved.
     *
     * To filter out specific objects or object types you should set an object
     * filter once in the `OnInit` method of your custom controller.
     */
    public set objectFilter(predicate: (obj: T) => boolean) {
        this._objectFilter = predicate;
    }

    /**
     * Gets the core type of objects to be cached.
     * The default value returned is `CoatyObject`.
     */
    protected get coreType() {
        return this._coreType;
    }

    /**
     * Sets the core type of objects to be cached.
     * 
     * To filter out specific object core types you should set 
     * the core type once in the `OnInit` 
     * method of your custom controller.
     */
    protected set coreType(value: CoreType) {
        this._coreType = value || "CoatyObject";
    }

    private _observeObjectAdvertisements() {
        return this.communicationManager
            .observeAdvertiseWithCoreType(this.coreType)
            .pipe(filter(event => this._objectCache.has(event.data.object.objectId)))
            .subscribe(event => {
                const obj = event.data.object as T;
                this._objectCache.set(obj.objectId, obj);
            });
    }

}
