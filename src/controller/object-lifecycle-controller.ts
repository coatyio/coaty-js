/*! Copyright (c) 2019 Siemens AG. Licensed under the MIT License. */

import { merge, Observable, Subscription } from "rxjs";
import { filter, map, share } from "rxjs/operators";

import { AdvertiseEvent } from "../com/advertise";
import { DeadvertiseEvent } from "../com/deadvertise";
import { DiscoverEvent, ResolveEvent } from "../com/discover-resolve";
import { CoatyObject, Uuid } from "../model/object";
import { CoreType } from "../model/types";
import { equals } from "../util/deep";
import { Controller } from "./controller";

/**
 * Represents the current objects kept for lifecycle management by the
 * `ObjectLifecycleController`. Changes are provided by the properties `added`,
 * `removed`, or `changed` where exactly one is set.
 */
export interface ObjectLifecycleInfo {

    /** 
     * Array of objects currently monitored for lifecycle management after most
     * recent changes have been applied.
     */
    objects: CoatyObject[];

    /**
     * Array of object ids which have been newly advertised or discovered
     * (optional).
     */
    addedIds?: Uuid[];

    /** 
     * Array of object ids which have been deadvertised (optional).
     */
    removedIds?: Uuid[];

    /**
     * Array of object ids which have been readvertised or rediscovered with
     * different object properties (optional).
     */
    changedIds?: Uuid[];
}

/**
 * Keeps track of specific agents/objects in a Coaty network by monitoring
 * identity components of communication managers, controllers or custom object
 * types. The controller observes advertisements and deadvertisements of such
 * objects and initially discovers them. Changes are emitted on an observable
 * that applications can subscribe to.
 *
 * You can use this controller either standalone by adding it to the container
 * components or make your custom controller class extend this controller class.
 *
 * Basically, to keep track of identity components, the
 * `shouldAdvertiseIdentity` option in `CommunicationOptions` and/or
 * `ControllerOptions` must be set to `true`. Note that this controller also
 * supports tracking the identities of the communication manager and the *other*
 * controllers inside its *own* agent container.
 *
 * If you want to keep track of custom object types (not commmunication manager
 * or controller identities), you have to implement the remote side of the
 * distributed object lifecycle management, i.e.
 * advertise/readvertise/deadvertise your custom objects and observe/resolve
 * corresponding Discover events explicitely. To facilitate this, this
 * controller provides convenience methods: `advertiseDiscoverableObject`,
 * `readvertiseDiscoverableObject`, and `deadvertiseDiscoverableObject`.
 *
 * Usually, a custom object should have the identity UUID of its associated
 * communication manager set as its `parentObjectId` to be automatically
 * deadvertised when the agent terminates abnormally. You can automate this by
 * passing `true` to the optional parameter `shouldSetParentObjectId` of method
 * `advertiseDiscoverableObject` (`true` is also the default parameter value).
 */
export class ObjectLifecycleController extends Controller {

    /**
     * Observes advertisements, deadvertisments and initial discoveries of
     * objects of the given core type. To track identity components of
     * communication managers or controllers, use core type `Component`.
     *
     * Specify an optional filter predicate to be applied to trackable objects.
     * If the predicate function returns `true`, the object is being tracked;
     * otherwise the object is not tracked. If no predicate is specified, all
     * objects corresponding to the given core type are tracked.
     *
     * @param coreType the core type of objects to be tracked
     * @param objectFilter a predicate for filtering objects to be tracked
     * (optional)
     * @returns a hot observable emitting changes concerning tracked objects of
     * the given core type
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
     * @param objectType the object type of objects to be tracked
     * @param objectFilter a predicate for filtering objects to be tracked
     * (optional)
     * @returns a hot observable emitting changes concerning tracked objects of
     * the given object type
     */
    observeObjectLifecycleInfoByObjectType(
        objectType: string,
        objectFilter?: (obj: CoatyObject) => boolean,
    ): Observable<ObjectLifecycleInfo> {
        return this._observeObjectLifecycleInfo(undefined, objectType, objectFilter);
    }

    /**
     * Advertises the given Coaty object and makes it discoverable by its
     * `objectType` or `objectId`.
     *
     * The optional `shouldSetParentObjectId` parameter determines whether the
     * parent object ID of the given object should be set to the communication
     * manager's identity objectId property (default is `true`). This is
     * required if you want to observe the object's lifecycle info by method
     * `observeObjectLifecycleInfoByObjectType` and get notified when the
     * advertising agent terminates abnormally.
     *
     * The returned subscription should be unsubscribed when the object is
     * deadvertised explicitely in your application code (see method
     * `deadvertiseDiscoverableObject`) or at the latest when the communication
     * manager is stopped (i.e. in the controller lifecycle method
     * `onCommunicationManagerStopping`).
     *
     * @param object a CoatyObject that is advertised and discoverable
     * @param shouldSetParentObjectId determines whether the parent object ID of
     * the given object should be set to the communication manager's identity
     * objectId (default is `true`)
     * @returns subscription on DiscoverEvent observable
     */
    advertiseDiscoverableObject(object: CoatyObject, shouldSetParentObjectId = true): Subscription {
        if (shouldSetParentObjectId) {
            object.parentObjectId = this.communicationManager.identity.objectId;
        }
        this.communicationManager.publishAdvertise(AdvertiseEvent.withObject(this.identity, object));
        return this.communicationManager
            .observeDiscover(this.identity)
            .pipe(filter((event: DiscoverEvent) =>
                (event.eventData.isDiscoveringTypes &&
                    event.eventData.isObjectTypeCompatible(object.objectType)) ||
                (event.eventData.isDiscoveringObjectId &&
                    event.eventData.objectId === object.objectId)))
            .subscribe(event =>
                event.resolve(ResolveEvent.withObject(this.identity, object)));
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
        this.communicationManager.publishAdvertise(AdvertiseEvent.withObject(this.identity, object));
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
        if (discoverableSubscription) {
            // Stop observing Discover events that have been set up in
            // advertiseDiscoverableObject.
            discoverableSubscription.unsubscribe();
        }
        this.communicationManager.publishDeadvertise(DeadvertiseEvent.withObjectIds(this.identity, object.objectId));
    }

    private _observeObjectLifecycleInfo(
        coreType?: CoreType,
        objectType?: string,
        objectFilter?: (obj: CoatyObject) => boolean,
    ): Observable<ObjectLifecycleInfo> {
        if (!coreType && !objectType) {
            coreType = "Component";
        }
        if (coreType && objectType) {
            throw new TypeError("Must not specify both coreType and objectType");
        }

        const registry = new Map<Uuid, CoatyObject>();

        const discovered = this.communicationManager
            // Note that the Discover event will also resolve the identity of
            // this agent's communication manager itself!
            .publishDiscover(coreType ? DiscoverEvent.withCoreTypes(this.identity, [coreType]) :
                DiscoverEvent.withObjectTypes(this.identity, [objectType]));

        const advertised = coreType ?
            this.communicationManager.observeAdvertiseWithCoreType(this.identity, coreType) :
            this.communicationManager.observeAdvertiseWithObjectType(this.identity, objectType);

        const deadvertised = this.communicationManager
            .observeDeadvertise(this.identity);

        return merge(
            merge(discovered, advertised)
                .pipe(
                    map(event => event.eventData.object),
                    filter(obj => obj !== undefined && (objectFilter ? objectFilter(obj) === true : true)),
                    map(obj => this._addToRegistry(registry, obj)),
                    filter(info => info !== undefined),
                ),
            deadvertised
                .pipe(
                    map(event => this._removeFromRegistry(registry, event.eventData.objectIds)),
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
                objects: Array.from(registry.values()),
                addedIds: [obj.objectId],
            };
        } else if (!equals(obj, robj)) {
            return {
                objects: Array.from(registry.values()),
                changedIds: [robj.objectId],
            };
        } else {
            return undefined;
        }
    }

    private _removeFromRegistry(registry: Map<Uuid, CoatyObject>, objectIds: Uuid[]): ObjectLifecycleInfo {
        const removedIds: Uuid[] = [];
        objectIds.forEach(objectId => this._updateRegistryOnRemove(registry, objectId, removedIds));
        if (removedIds.length === 0) {
            return undefined;
        }
        return {
            objects: Array.from(registry.values()),
            removedIds,
        };
    }

    private _updateRegistryOnRemove(registry: Map<Uuid, CoatyObject>, objectId: Uuid, removedIds: Uuid[]) {
        const obj = registry.get(objectId);

        // Cleanup: check if objects are registered that have a parent object
        // referencing the object to be removed. These objects must be also
        // unregistered.
        registry.forEach(o => {
            if (o.parentObjectId === objectId) {
                registry.delete(o.objectId);
                removedIds.push(o.objectId);
            }
        });

        if (obj !== undefined) {
            // Unregister the target object to be removed.
            registry.delete(objectId);
            removedIds.push(objectId);
        }
    }

}
