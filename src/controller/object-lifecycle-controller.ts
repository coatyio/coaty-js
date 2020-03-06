/*! Copyright (c) 2019 Siemens AG. Licensed under the MIT License. */

import { merge, Observable, Subscription } from "rxjs";
import { filter, map, share } from "rxjs/operators";

import {
    AdvertiseEvent,
    CoatyObject,
    CoreType,
    DeadvertiseEvent,
    DiscoverEvent,
    equals,
    ResolveEvent,
    Uuid,
} from "..";
import { Controller } from "./controller";

/**
 * Represents changes in the objects kept for lifecycle management by the
 * `ObjectLifecycleController`. Changes are provided by the properties `added`,
 * `removed`, or `changed` where exactly one is set and the others are not
 * defined.
 */
export interface ObjectLifecycleInfo {

    /**
     * Array of objects which have been newly advertised or discovered
     * (optional). The value is not defined if no additions occured.
     */
    added?: CoatyObject[];

    /**
     * Array of objects which have been readvertised or rediscovered with
     * different object properties (optional). The value is not defined if no
     * changes occured.
     */
    changed?: CoatyObject[];

    /** 
     * Array of objects which have been deadvertised (optional). The value is
     * not defined if no removals occured.
     */
    removed?: CoatyObject[];
}

/**
 * Keeps track of agents or specific Coaty objects in a Coaty network by
 * monitoring agent identities or custom object types.
 *
 * This controller observes advertisements and deadvertisements of such objects
 * and discovers them. Changes are emitted on corresponding observables that
 * applications can subscribe to.
 *
 * You can use this controller either standalone by adding it to the container
 * components or extend your custom controller class from this controller class.
 *
 * If you want to keep track of custom object types (not agent identities), you
 * have to implement the remote side of the distributed object lifecycle
 * management explicitely, i.e. advertise/readvertise/deadvertise your custom
 * objects and observe/resolve corresponding Discover events. To facilitate
 * this, this controller provides convenience methods:
 * `advertiseDiscoverableObject`, `readvertiseDiscoverableObject`, and
 * `deadvertiseDiscoverableObject`.
 *
 * Usually, a custom object should have the object ID of its agent identity,
 * i.e. `Container.identity`, set as its `parentObjectId` in order to be
 * automatically deadvertised when the agent terminates abnormally. You can
 * automate this by passing `true` to the optional parameter
 * `shouldSetParentObjectId` of method `advertiseDiscoverableObject` (`true` is
 * also the default parameter value).
 */
export class ObjectLifecycleController extends Controller {

    /**
     * Observes advertisements, deadvertisments and initial discoveries of
     * objects of the given core type. To track agent identity objects, specify
     * core type `Identity`.
     *
     * Specify an optional filter predicate to be applied to trackable objects.
     * If the predicate function returns `true`, the object is being tracked;
     * otherwise the object is not tracked. If no predicate is specified, all
     * objects corresponding to the given core type are tracked.
     * 
     * @remarks Subscriptions to the returned observable are automatically
     * unsubscribed when the communication manager is stopped.
     *
     * @param coreType the core type of objects to be tracked
     * @param objectFilter a predicate for filtering objects to be tracked
     * (optional)
     * @returns an observable emitting changes concerning tracked objects of the
     * given core type
     */
    observeObjectLifecycleInfoByCoreType(
        coreType: CoreType,
        objectFilter?: (obj: CoatyObject) => boolean,
    ): Observable<ObjectLifecycleInfo> {
        return this._observeObjectLifecycleInfo(coreType, undefined, objectFilter);
    }

    /**
     * Observes advertisements, deadvertisments and initial discoveries of
     * objects of the given object type.
     *
     * Specify an optional filter predicate to be applied to trackable objects.
     * If the predicate function returns `true`, the object is being tracked;
     * otherwise the object is not tracked. If no predicate is specified, all
     * objects corresponding to the given core type are tracked.
     *
     * @remarks Subscriptions to the returned observable are automatically
     * unsubscribed when the communication manager is stopped.
     *
     * @param objectType the object type of objects to be tracked
     * @param objectFilter a predicate for filtering objects to be tracked
     * (optional)
     * @returns an observable emitting changes concerning tracked objects of the
     * given object type
     */
    observeObjectLifecycleInfoByObjectType(
        objectType: string,
        objectFilter?: (obj: CoatyObject) => boolean,
    ): Observable<ObjectLifecycleInfo> {
        return this._observeObjectLifecycleInfo(undefined, objectType, objectFilter);
    }

    /**
     * Advertises the given Coaty object and makes it discoverable either by its
     * `objectType` or `objectId`.
     *
     * The optional `shouldSetParentObjectId` parameter determines whether the
     * parent object ID of the given object should be set to the agent
     * identity's object ID (default is `true`). This is required if you want to
     * observe the object's lifecycle info by method
     * `observeObjectLifecycleInfoByObjectType` and to get notified when the
     * advertising agent terminates abnormally.
     *
     * The returned subscription should be unsubscribed when the object is
     * deadvertised explicitely in your application code (see method
     * `deadvertiseDiscoverableObject`). It will be automatically unsubscribed
     * when the communication manager is stopped.
     *
     * @param object a CoatyObject that is advertised and discoverable
     * @param shouldSetParentObjectId determines whether the parent object ID of
     * the given object should be set to the agent identity's object ID (default
     * is `true`)
     * @returns the subscription on a DiscoverEvent observable that should be
     * unsubscribed if no longer needed
     */
    advertiseDiscoverableObject(object: CoatyObject, shouldSetParentObjectId = true): Subscription {
        if (shouldSetParentObjectId) {
            object.parentObjectId = this.container.identity.objectId;
        }
        this.communicationManager.publishAdvertise(AdvertiseEvent.withObject(object));
        return this.communicationManager
            .observeDiscover()
            .pipe(filter((event: DiscoverEvent) =>
                (event.data.isDiscoveringTypes &&
                    event.data.isObjectTypeCompatible(object.objectType)) ||
                (event.data.isDiscoveringObjectId &&
                    event.data.objectId === object.objectId)))
            .subscribe(event =>
                event.resolve(ResolveEvent.withObject(object)));
    }

    /**
     * Readvertises the given Coaty object, usually after some properties have
     * changed. The object reference should have been advertised before once
     * using the method `advertiseDiscoverableObject`.
     *
     * @param object a CoatyObject that should be advertised again after
     * properties have changed
     */
    readvertiseDiscoverableObject(object: CoatyObject) {
        this.communicationManager.publishAdvertise(AdvertiseEvent.withObject(object));
    }

    /**
     * Deadvertises the given Coaty object and unsubscribes the given
     * subscription resulting from a corresponding invocation of method
     * `advertiseDiscoverableObject`.
     *
     * Note that if you want to keep a Coaty object for the whole lifetime of
     * its agent you don't necessarily need to invoke this method explicitely.
     * Deadvertise events are published automatically by or on behalf of an
     * agent whenever its communication manager is stopped or when the agent
     * terminates abnormally.
     *
     * @param object a CoatyObject to be deadvertised
     * @param discoverableSubscription subscription on DiscoverEvent to be
     * unsubscribed
     */
    deadvertiseDiscoverableObject(object: CoatyObject, discoverableSubscription: Subscription) {
        // Stop observing Discover events that have been set up in
        // advertiseDiscoverableObject.
        discoverableSubscription?.unsubscribe();
        this.communicationManager.publishDeadvertise(DeadvertiseEvent.withObjectIds(object.objectId));
    }

    private _observeObjectLifecycleInfo(
        coreType?: CoreType,
        objectType?: string,
        objectFilter?: (obj: CoatyObject) => boolean,
    ): Observable<ObjectLifecycleInfo> {
        if (!coreType && !objectType) {
            coreType = "Identity";
        }
        if (coreType && objectType) {
            throw new TypeError("Must not specify both coreType and objectType");
        }

        const registry = new Map<Uuid, CoatyObject>();

        const discovered = this.communicationManager
            // Note that the Discover event will also resolve the identity of this agent itself!
            .publishDiscover(coreType ?
                DiscoverEvent.withCoreTypes([coreType]) :
                DiscoverEvent.withObjectTypes([objectType]));

        const advertised = coreType ?
            this.communicationManager.observeAdvertiseWithCoreType(coreType) :
            this.communicationManager.observeAdvertiseWithObjectType(objectType);

        const deadvertised = this.communicationManager
            .observeDeadvertise();

        return merge(
            merge(discovered, advertised)
                .pipe(
                    map(event => event.data.object),
                    filter(obj => obj !== undefined && (objectFilter ? objectFilter(obj) === true : true)),
                    map(obj => this._addToRegistry(registry, obj)),
                    filter(info => info !== undefined),
                ),
            deadvertised
                .pipe(
                    map(event => this._removeFromRegistry(registry, event.data.objectIds)),
                    filter(info => info !== undefined),
                ))
            // All subscribers share the same source so that side effecting
            // operators will be executed only once per emission.
            .pipe(share());
    }

    private _addToRegistry(registry: Map<Uuid, CoatyObject>, obj: CoatyObject): ObjectLifecycleInfo {
        const robj = registry.get(obj.objectId);
        registry.set(obj.objectId, obj);
        if (robj === undefined) {
            return {
                added: [obj],
            };
        } else if (!equals(obj, robj)) {
            return {
                changed: [obj],
            };
        } else {
            return undefined;
        }
    }

    private _removeFromRegistry(registry: Map<Uuid, CoatyObject>, objectIds: Uuid[]): ObjectLifecycleInfo {
        const removed: CoatyObject[] = [];
        objectIds.forEach(objectId => this._updateRegistryOnRemove(registry, objectId, removed));
        if (removed.length === 0) {
            return undefined;
        }
        return {
            removed,
        };
    }

    private _updateRegistryOnRemove(registry: Map<Uuid, CoatyObject>, objectId: Uuid, removed: CoatyObject[]) {
        const obj = registry.get(objectId);

        // Cleanup: check if objects are registered that have a parent object
        // referencing the object to be removed. These objects must be also
        // unregistered.
        registry.forEach(o => {
            if (o.parentObjectId === objectId) {
                registry.delete(o.objectId);
                removed.push(o);
            }
        });

        if (obj !== undefined) {
            // Unregister the target object to be removed.
            registry.delete(objectId);
            removed.push(obj);
        }
    }

}
