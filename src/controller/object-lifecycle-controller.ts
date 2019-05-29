/*! Copyright (c) 2019 Siemens AG. Licensed under the MIT License. */

import { merge, Observable } from "rxjs";
import { filter, map, share } from "rxjs/operators";

import { DiscoverEvent } from "../com/discover-resolve";
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
 * You can use this controller standalone by adding it to the container
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
 * distributed object lifecycle management, i.e. advertise your custom objects
 * and observe/respond to appropriate Discover events explicitely. Note that a
 * custom object must have the identity UUID of its associated communication
 * manager set as its `parentObjectId`.
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
