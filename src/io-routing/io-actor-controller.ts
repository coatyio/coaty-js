/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { BehaviorSubject, Observable } from "rxjs";

import { Controller, IoActor, IoStateEvent, Uuid } from "..";

type IoActorItems = [
    IoActor,
    BehaviorSubject<boolean>,
    BehaviorSubject<any>
];

/**
 * Provides convenience methods for observing IO values and for
 * monitoring changes in the association state of specific IO actors.
 */
export class IoActorController extends Controller {

    private _actorItems: Map<Uuid, IoActorItems>;

    onInit() {
        super.onInit();
        this._actorItems = new Map<Uuid, IoActorItems>();
    }

    onCommunicationManagerStarting() {
        super.onCommunicationManagerStarting();

        // Establish new observable for IO state and initialize 
        // subject for IO association state from the
        // communication manager.
        this._reregisterAll();
    }

    onCommunicationManagerStopping() {
        super.onCommunicationManagerStopping();

        // IO state and IO value subscriptions are automatically unsubscribed.
    }

    /**
     * Listen to IO values for the given IO actor. The returned observable
     * always emits the last value received for the given IO actor. When
     * subscribed, the current value (or undefined if none exists yet) is
     * emitted immediately.
     *
     * Due to this behavior the cached value of the observable will also be
     * emitted after reassociation. If this is not desired use
     * `this.communicationManager.observeIoValue` instead. This method doesn't
     * cache any previously emitted value.
     *
     * @remarks Note that subscriptions on the observable returned **must** be
     * manually unsubscribed by the application; they are not automatically
     * unsubscribed when communication manager is stopped.
     *
     * @param actor an IO actor object
     * @returns an observable emitting IO values for the given actor
     */
    observeIoValue<T>(actor: IoActor): Observable<T> {
        const [, , valueSubject] = this._ensureRegistered<T>(actor);
        return valueSubject.asObservable();
    }

    /**
     * Gets the lastest IO value emitted to the given IO actor or `undefined` if
     * none exists yet.
     *
     * @param actor an IO actor object
     * @returns the latest IO value for the given actor if one exists
     */
    getIoValue<T>(actor: IoActor): T {
        const [, , valueSubject] = this._ensureRegistered<T>(actor);
        return valueSubject.value;
    }

    /**
     * Listen to associations or disassociations for the given IO actor.
     * The returned observable emits distinct boolean values until changed, i.e
     * true when the first association is made and false, when the last
     * association becomes disassociated.
     * When subscribed, the current association state is emitted immediately.
     * 
     * @remarks Note that subscriptions on the observable returned **must** be
     * manually unsubscribed by the application; they are not automatically
     * unsubscribed when communication manager is stopped.
     *
     * @param actor an IO actor object
     */
    observeAssociation<T>(actor: IoActor): Observable<boolean> {
        const [, association] = this._ensureRegistered<T>(actor);
        return association.asObservable();
    }

    /**
     * Determines whether the given IO actor is currently associated.
     */
    isAssociated<T>(actor: IoActor): boolean {
        const [, association] = this._ensureRegistered<T>(actor);
        return association.value;
    }

    private _reregisterAll() {
        this._actorItems.forEach(item => {
            const actor = item[0];
            const ioState = this.communicationManager.observeIoState(actor);
            const ioValue = this.communicationManager.observeIoValue(actor);
            ioState.subscribe(event => this._onIoStateChanged(actor.objectId, event));
            ioValue.subscribe(value => this._onIoValueChanged(actor.objectId, value));

            // Keep subject that may be in use by the application code.
            item[1].next(ioState.value.data.hasAssociations);
        });
    }

    private _ensureRegistered<T>(actor: IoActor): IoActorItems {
        const actorId = actor.objectId;
        let item = this._actorItems.get(actorId);
        if (!item) {
            const ioState = this.communicationManager.observeIoState(actor);
            const ioValue = this.communicationManager.observeIoValue(actor);
            ioState.subscribe(event => this._onIoStateChanged(actorId, event));
            ioValue.subscribe(value => this._onIoValueChanged(actorId, value));
            item = [
                actor,
                new BehaviorSubject<boolean>(ioState.value.data.hasAssociations),
                new BehaviorSubject<T>(undefined),
            ];
            this._actorItems.set(actorId, item);
        }
        return item;
    }

    private _onIoStateChanged(actorId: Uuid, event: IoStateEvent) {
        const item = this._actorItems.get(actorId);

        if (!item) {
            return;
        }

        if (item[1].value !== event.data.hasAssociations) {
            item[1].next(event.data.hasAssociations);
        }
    }

    private _onIoValueChanged(actorId: Uuid, value: any) {
        const item = this._actorItems.get(actorId);

        if (!item) {
            return;
        }

        item[2].next(value);
    }

}
