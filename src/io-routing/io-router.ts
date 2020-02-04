/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { Subject } from "rxjs";
import { filter, takeUntil } from "rxjs/operators";

import {
    AdvertiseEvent,
    AssociateEvent,
    CompleteEvent,
    Controller,
    DiscoverEvent,
    IoActor,
    IoNode,
    IoSource,
    ResolveEvent,
    Uuid,
} from "..";
import { IoContext } from "../model/io-context";

/**
 * Base IO router class for context-driven routing of IO values.
 *
 * This router implements the base logic of routing. It observes IO nodes that
 * are associated with the router's IO context and manages routes for the IO
 * sources and actors of these nodes.
 *
 * This router implements a basic routing algorithm where all compatible pairs
 * of IO sources and IO actors are associated. An IO source and an IO actor are
 * compatible if both define equal value types. You can define your own custom
 * compatibility check on value types in a subclass by overriding the
 * `areValueTypesCompatible` method.
 *
 * To implement context-specific routing strategies extend this class and
 * implement the abstract protected methods.
 *
 * Note that this router makes its IO context available for discovery (by core
 * type, object type, or object Id) and listens for Update-Complete events on
 * its IO context, triggering `onIoContextChanged` automatically.
 *
 * This base router class requires the following controller options:
 * - `ioContext`: the IO context for which this router is managing routes
 *   (mandatory)
 */
export abstract class IoRouter extends Controller {

    private _ioContext: IoContext;
    private _managedIoNodes: Map<Uuid, IoNode>;
    private _sourceRoutes: Map<Uuid, string>;
    private _unsubscribeSubject$ = new Subject();

    onInit() {
        super.onInit();

        this._ioContext = this.options?.ioContext;
        if (!this._ioContext) {
            throw new Error("no IO context configured for IO router: specify an IoContext object in controller option 'ioContext'");
        }
        this._ioContext.parentObjectId = this.container.identity.objectId;
        this._managedIoNodes = new Map<Uuid, IoNode>();
        this._sourceRoutes = new Map<Uuid, string>();
    }

    onCommunicationManagerStarting() {
        super.onCommunicationManagerStarting();

        // Starts this IO router. The router now listens for Advertise and
        // Deadvertise events of IO nodes and issues an initial Discover event
        // for IO nodes.
        //
        // Additionally, it makes its IO context available by advertising and
        // for discovery (by core type or object Id) and listens for
        // Update-Complete events on the context, triggering
        // `onIoContextChanged`.
        //
        // After starting the `onStarted` method is invoked.
        this._observeAdvertisedIoNode();
        this._observeDeadvertisedIoNodes();
        this._discoverIoNodes();
        this._observeDiscoverIoContext();
        this._observeUpdateIoContext();

        this.onStarted();
        this.onIoContextChanged();
    }

    onCommunicationManagerStopping() {
        super.onCommunicationManagerStopping();

        // Stops this IO router. Subclasses should disassociate all current
        // associations in the `onStopped` method.
        this.onStopped();

        this._unsubscribeSubject$.next();
        this._managedIoNodes.clear();
        this._sourceRoutes.clear();
    }

    /**
     * Gets the IO context of this router.
     */
    get ioContext() {
        return this._ioContext;
    }

    /**
     * Gets the IO nodes currently managed by this router.
     */
    get managedIoNodes(): Readonly<Map<Uuid, IoNode>> {
        return this._managedIoNodes;
    }

    /**
     * Finds a managed IO node that matches the given predicate.
     *
     * Returns undefined if no such IO node exists.
     *
     * @param predicate a function returning true if an IO node matches; false
     * otherwise.
     */
    findManagedIoNode(predicate: (node: IoNode) => boolean) {
        let foundNode: IoNode;
        this._managedIoNodes.forEach(node => {
            if (!foundNode && predicate(node)) {
                foundNode = node;
            }
        });
        return foundNode;
    }

    /**
     * Called by this IO router when its IO context has changed.
     *
     * The base method just advertises the changed IO context object.
     *
     * Overwrite this method in your router subclass to reevaluate all
     * associations between IO sources and IO actors currently held by this
     * router.
     *
     * Ensure to invoke `super.onIoContextChanged` so that the changed IO
     * context is (re)advertised.
     */
    protected onIoContextChanged() {
        this.communicationManager.publishAdvertise(AdvertiseEvent.withObject(this._ioContext));
    }

    /**
     * Called by the IO router base implementation when an IO node is being
     * managed.
     *
     * To be implemented by concrete subclasses.
     */
    protected abstract onIoNodeManaged(node: IoNode);

    /**
     * Called by the IO router base implementation when currently managed IO
     * nodes are going to be unmanaged.
     *
     * To be implemented by concrete subclasses.
     */
    protected abstract onIoNodesUnmanaged(nodes: IoNode[]);

    /**
     * Associates the given IO source and actor by publishing an Associate
     * event.
     *
     * @param source an IO source object
     * @param actor an IO actor object
     * @param updateRate the recommended update rate (in milliseconds)
     */
    protected associate(source: IoSource, actor: IoActor, updateRate: number) {
        // Ensure that an IO source publishes IO values to all associated IO
        // actors on a unique and common route.
        let route = this._sourceRoutes.get(source.objectId);
        if (!route) {
            route = source.externalRoute || this.communicationManager.createIoValueTopic(source);
            this._sourceRoutes.set(source.objectId, route);
        }
        this.communicationManager.publishAssociate(
            AssociateEvent.with(this._ioContext.name, source.objectId, actor.objectId, route, updateRate));
    }

    /**
     * Disassociates the given IO source and actor by publishing an Associate
     * event with an undefined route.
     *
     * @param source an IO source object
     * @param actor an IO actor object
     */
    protected disassociate(source: IoSource, actor: IoActor) {
        this.communicationManager.publishAssociate(
            AssociateEvent.with(this._ioContext.name, source.objectId, actor.objectId, undefined));
    }

    /**
     * Checks whether the value types of the given IO source and actor match.
     *
     * This is a precondition for associating IO source and actor.
     *
     * The base implementation returns true, if the given source value type is
     * identical to the given actor value type.
     *
     * Override the base implementation if you need a custom value type
     * compatibility check.
     *
     * @param source an IO source object
     * @param actor an IO actor object
     */
    protected areValueTypesCompatible(source: IoSource, actor: IoActor): boolean {
        return source.valueType === actor.valueType;
    }

    /**
     * Override this method to perform side effects when this router is
     * started.
     *
     * This method does nothing.
     */
    protected onStarted() {
        /* tslint:disable:empty-block */
        /* tslint:enable:empty-block */
    }

    /**
     * Override this method to perform side effects when this router is
     * stopped.
     *
     * This method does nothing.
     *
     * Subclasses should disassociate all current associations in this method.
     */
    protected onStopped() {
        /* tslint:disable:empty-block */
        /* tslint:enable:empty-block */
    }

    private _observeAdvertisedIoNode() {
        this.communicationManager
            .observeAdvertiseWithCoreType("IoNode")
            .pipe(
                takeUntil(this._unsubscribeSubject$),
                filter(event => event.data.object !== undefined && event.data.object.name === this._ioContext.name))
            .subscribe(event => {
                this._ioNodeAdvertised(event.data.object as IoNode);
            });
    }

    private _observeDeadvertisedIoNodes() {
        this.communicationManager
            .observeDeadvertise()
            .pipe(takeUntil(this._unsubscribeSubject$))
            .subscribe(event => this._ioNodesDeadvertised(event.data.objectIds));
    }

    private _ioNodeAdvertised(node: IoNode) {
        const isDeadvertise = (node.ioSources === undefined || node.ioSources.length === 0) &&
            (node.ioActors === undefined || node.ioActors.length === 0);

        this._ioNodesDeadvertised([node.objectId], isDeadvertise ? undefined : node);
        if (isDeadvertise) {
            return;
        }
        this._managedIoNodes.set(node.objectId, node);
        this.onIoNodeManaged(node);
    }

    private _ioNodesDeadvertised(objectIds: Uuid[], readvertisedNode?: IoNode) {
        const deregisteredNodes: IoNode[] = [];

        objectIds.forEach(id => {
            const deregisteredNode = this._managedIoNodes.get(id);
            if (deregisteredNode) {
                this._managedIoNodes.delete(id);
                deregisteredNode.ioSources.forEach(point => {
                    // Ensure source topics are preserved for IO sources that
                    // also exist in a rediscovered or readvertised IO node.
                    if (!readvertisedNode || !readvertisedNode.ioSources.some(p => p.objectId === point.objectId)) {
                        this._sourceRoutes.delete(point.objectId);
                    }
                });
                if (!readvertisedNode) {
                    deregisteredNodes.push(deregisteredNode);
                }
            }
        });

        if (deregisteredNodes.length > 0) {
            this.onIoNodesUnmanaged(deregisteredNodes);
        }
    }

    private _discoverIoNodes() {
        this.communicationManager.publishDiscover(
            DiscoverEvent.withCoreTypes(["IoNode"]))
            .pipe(
                takeUntil(this._unsubscribeSubject$),
                filter(event => event.data.object !== undefined && event.data.object.name === this._ioContext.name))
            .subscribe(event => {
                this._ioNodeAdvertised(event.data.object as IoNode);
            });
    }

    private _observeDiscoverIoContext() {
        this.communicationManager
            .observeDiscover()
            .pipe(
                takeUntil(this._unsubscribeSubject$),
                filter(event =>
                    (event.data.isDiscoveringTypes &&
                        event.data.isCoreTypeCompatible(this._ioContext.coreType)) ||
                    (event.data.isDiscoveringTypes &&
                        event.data.isObjectTypeCompatible(this._ioContext.objectType)) ||
                    (event.data.isDiscoveringObjectId &&
                        event.data.objectId === this._ioContext.objectId)))
            .subscribe(event => {
                event.resolve(ResolveEvent.withObject(this._ioContext));
            });
    }

    private _observeUpdateIoContext() {
        this.communicationManager
            .observeUpdateWithCoreType(this._ioContext.coreType)
            .pipe(
                takeUntil(this._unsubscribeSubject$),
                filter(update => update.data.object.objectId === this._ioContext.objectId),
            )
            .subscribe(update => {
                this._ioContext = update.data.object as IoContext;
                this._ioContext.parentObjectId = this.container.identity.objectId;
                this.onIoContextChanged();
                update.complete(CompleteEvent.withObject(this._ioContext));
            });
    }
}
