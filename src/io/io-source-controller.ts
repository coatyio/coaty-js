/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { BehaviorSubject, Observable, Subject, Subscription } from "rxjs";
import { debounceTime, sampleTime } from "rxjs/operators";

import { IoStateEvent } from "../com/io-state";
import { Controller } from "../controller/controller";
import { IoSource, IoSourceBackpressureStrategy } from "../model/io-point";
import { Uuid } from "../model/object";
import { clone } from "../util/deep";

/**
 * A tuple related to an IoSource:
 * - the IO source object
 * - state subscription
 * - subject for updateRate
 * - subject for association state
 * - subject for pushing IO values
 * - subscription for observable that emits update values
 */
type IoSourceItems = [
    IoSource,
    Subscription,
    BehaviorSubject<number>,
    BehaviorSubject<boolean>,
    Subject<any>,
    Subscription
];

/**
 * Provides data transfer rate controlled publishing of IO values for
 * IO sources and monitoring of changes in the association state of IO sources.
 * This controller respects the backpressure strategy of an IO source in order to
 * cope with IO values that are more rapidly produced than specified in the
 * recommended update rate.
 */
export class IoSourceController extends Controller {

    private _sourceItems: Map<Uuid, IoSourceItems>;

    onInit() {
        super.onInit();
        this._sourceItems = new Map<Uuid, IoSourceItems>();
    }

    onCommunicationManagerStarting() {
        super.onCommunicationManagerStarting();

        // Establish new observable for IO state and initialize 
        // subjects for IO values and IO association state from the
        // communication manager.
        this._reregisterAll();
    }

    onCommunicationManagerStopping() {
        super.onCommunicationManagerStopping();

        // The current observable for IO state is no longer served by the 
        // communication manager so it can be unsubscribed.
        this._deregisterAll();
    }

    /**
     * Schedule the given IO value for publishing on the given IO source.
     * Values to be pulished may be throttled or sampled according to
     * the backpressure strategy and the recommended update rate of the IO source.
     *
     * If the given IO source is not associated currently,
     * no publishing takes place. The given IO value is discarded.
     *
     * @param source an IO source object
     * @param value an IO value of the given type
     */
    publish<T>(source: IoSource, value: T) {
        const [, , , association, updateSubject] = this._ensureRegistered<T>(source);

        if (!association.value) {
            return;
        }

        // Deep copy value to make it immutable for caching
        if (typeof value === "string" ||
            typeof value === "boolean" ||
            typeof value === "number" ||
            typeof value === "object") {
            value = clone(value);
        }

        updateSubject.next(value);
    }

    /**
     * Listen to update rate changes for the given IO source.
     * The returned observable emits distinct rate values until changed.
     * When the last association becomes disassociated, undefined is emitted.
     * When subscribed, the current update rate is emitted immediately.
     *
     * @param source an IO source object
     */
    observeUpdateRate<T>(source: IoSource): Observable<number> {
        const [, , updateRate] = this._ensureRegistered<T>(source);
        return updateRate.asObservable();
    }

    /**
     * Listen to associations or disassociations for the given IO source.
     * The returned observable emits distinct boolean values until changed, i.e
     * true when the first association is made and false, when the last
     * association becomes disassociated.
     * When subscribed, the current association state is emitted immediately.
     *
     * @param source an IO source object
     */
    observeAssociation<T>(source: IoSource): Observable<boolean> {
        const [, , , association] = this._ensureRegistered<T>(source);
        return association.asObservable();
    }

    /**
     * Determines whether the given IO source is currently associated.
     */
    isAssociated<T>(source: IoSource): boolean {
        const [, , , association] = this._ensureRegistered<T>(source);
        return association.value;
    }

    private _reregisterAll() {
        this._sourceItems.forEach(item => {
            const source = item[0];
            const ioState = this.communicationManager.observeIoState(source);
            item[1] = ioState.subscribe(event => this._onIoStateChanged(source.objectId, event));

            // Keep subjects that may be in use by the application code.
            item[2].next(ioState.value.eventData.updateRate);
            item[3].next(ioState.value.eventData.hasAssociations);

            this._updateUpdateRateObservable(item);
        });
    }

    private _deregisterAll() {
        this._sourceItems.forEach(item => {
            item[1] && item[1].unsubscribe();
            item[1] = undefined;
            item[5] && item[5].unsubscribe();
            item[5] = undefined;
        });
    }

    private _ensureRegistered<T>(source: IoSource): IoSourceItems {
        const sourceId = source.objectId;
        let item = this._sourceItems.get(sourceId);
        if (!item) {
            const ioState = this.communicationManager.observeIoState(source);
            item = [
                source,
                ioState.subscribe(event => this._onIoStateChanged(sourceId, event)),
                new BehaviorSubject<number>(ioState.value.eventData.updateRate),
                new BehaviorSubject<boolean>(ioState.value.eventData.hasAssociations),
                new Subject<T>(),
                undefined,
            ];
            this._sourceItems.set(sourceId, item);
            this._updateUpdateRateObservable(item);
        }
        return item;
    }

    private _onIoStateChanged(sourceId: Uuid, event: IoStateEvent) {
        const item = this._sourceItems.get(sourceId);

        if (!item) {
            return;
        }

        let needsUpdate = false;

        if (item[3].value !== event.eventData.hasAssociations) {
            item[3].next(event.eventData.hasAssociations);
            needsUpdate = true;
        }

        if (item[2].value !== event.eventData.updateRate) {
            item[2].next(event.eventData.updateRate);
            needsUpdate = true;
        }

        needsUpdate && this._updateUpdateRateObservable(item);
    }

    private _updateUpdateRateObservable(item: IoSourceItems) {
        const [source, , updateRate, association, updateSubject, updateSubscription] = item;

        // Unsubscribe and discard already scheduled IO values
        updateSubscription && updateSubscription.unsubscribe();

        if (!association.value) {
            item[5] = undefined;
            return;
        }

        const rate = updateRate.value;
        let updateObs: Observable<any>;

        if (rate === undefined || rate === 0) {
            updateObs = updateSubject;
        } else {
            switch (source.updateStrategy || IoSourceBackpressureStrategy.Default) {
                case IoSourceBackpressureStrategy.Default:
                case IoSourceBackpressureStrategy.Sample:
                    updateObs = updateSubject.pipe(sampleTime(rate));
                    break;
                case IoSourceBackpressureStrategy.Throttle:
                    updateObs = updateSubject.pipe(debounceTime(rate));
                    break;
                case IoSourceBackpressureStrategy.None:
                    updateObs = updateSubject;
                    break;
                default:
                    updateObs = updateSubject;
                    break;
            }
        }

        item[5] = updateObs.subscribe(value =>
            this.communicationManager.publishIoValue(source, value));
    }

}
