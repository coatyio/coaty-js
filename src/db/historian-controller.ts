/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { Observable } from "rxjs";
import { filter, map } from "rxjs/operators";

import {
    AdvertiseEvent,
    CoatyObject,
    Controller,
    CoreTypes,
    filterOp,
    ObjectFilter,
    QueryEvent,
    RetrieveEvent,
    Snapshot,
    Uuid,
} from "..";
import { DbContext } from "./db-context";

/**
 * A controller which can be used on each Coaty agent to create and/or persist
 * Snapshot objects in time of arbitrary Coaty objects.
 *
 * Available controller options (default value for all options is `false`):
 * - `shouldAdvertiseSnapshots`: if `true` each generated Snapshot object will
 *   be advertised
 * - `shouldPersistLocalSnapshots`: if `true` each Snapshot object generated
 *   will be persisted in a database collection if the `database` option is set
 *   with valid values
 * - `shouldPersistObservedSnapshots`: if `true` each Snapshot object observed
 *   as Advertise event will be persisted in database if the `database` option
 *   is set with valid values; Note: local snapshots will not be observed and
 *   hereby not persisted, if `shouldPersistLocalSnapshots` is not additionally
 *   set to `true`. 
 * - `shouldReplyToQueries`: if `true` HistorianController will execute matching
 *   query events on the database if the `database` option is set with valid
 *   values
 * - `database`: with two properties `key` and `collection`; `key` references
 *   the database key as defined in the `databases` option of your
 *   configuration; `collection` is the name of the collection to be used. If
 *   the collection doesn't exist, it will be created in the given database.
 */
export class HistorianController extends Controller {

    /**
     * Log tag for logging database operations.
     */
    private static readonly _LOG_TAG_DB = "db";

    private _dbCtxPromise: Promise<DbContext>;

    onInit() {
        super.onInit();
    }

    onCommunicationManagerStarting() {
        super.onCommunicationManagerStarting();
        if (this.options["shouldReplyToQueries"]) {
            this._observeQueries();
        }
        if (this.options["shouldPersistObservedSnapshots"]) {
            this._observeAdvertise();
        }

    }

    /**
     * Create a new snapshot object of the given object with a creation
     * timestamp set to `Date.now()`.
     *
     * The new snapshot object will be processed according to the controller
     * options specified. The promise returned is resolved with the created
     * snapshot after it has been advertised and/or persisted locally.
     *
     * Note: Advertisement and persistence of snapshots are executed
     * asynchronously. Whenever a snapshot is both persisted locally and
     * advertised it is guaranteed that the snapshot has been stored in the
     * database before being advertised. This also implies that Advertise events
     * are not necessarily delivered in the same order in which snapshots were
     * generated.
     *
     * @param obj Object from which the snapshot will be created
     * @param tags String tags which can be used for filtering of (persisted)
     * snapshot objects
     */
    generateSnapshot(obj: CoatyObject, ...tags: string[]): Promise<Snapshot>;

    /**
     * Create a new snapshot object of the given object with the given creation
     * timestamp. 
     *
     * The new snapshot object will be processed according to the controller
     * options specified. The promise returned is resolved with the created
     * snapshot after it has been advertised and/or persisted locally.
     *
     * Note: Advertisement and persistence of snapshots are executed
     * asynchronously. Whenever a snapshot is both persisted locally and
     * advertised it is guaranteed that the snapshot has been stored in the
     * database before being advertised. This also implies that Advertise events
     * are not necessarily delivered in the same order in which snapshots were
     * generated.
     *
     * @param obj CoatyObject from which the snapshot will be created
     * @param timestamp creation timestamp of the snapshot
     * @param tags String tags which can be used for filtering of (persisted)
     * snapshot objects
     */
    generateSnapshot(obj: CoatyObject, timestamp: number, ...tags: string[]): Promise<Snapshot>;

    generateSnapshot(obj: any, param1?: number | string, ...param2: string[]) {
        if (typeof param1 === "string") {
            param2.push(param1);
        }
        if (typeof param1 !== "number") {
            param1 = Date.now();
        }

        const snapshot: Snapshot = {
            objectId: this.runtime.newUuid(),
            parentObjectId: obj.objectId,
            objectType: CoreTypes.OBJECT_TYPE_SNAPSHOT,
            coreType: "Snapshot",
            name: `${obj.objectType} ${obj.name}`,
            creatorId: this.container.identity.objectId,
            creationTimestamp: param1,
            object: CoreTypes.clone(obj),
            tags: param2,
        };
        return this._processSnaphot(snapshot);
    }

    /**
     * Convenience method that queries snapshot objects for the given parent ID.
     *
     * Returns an observable of matching snapshot objects ordered descendingly
     * by creation timestamp.
     *
     * @param parentObjectId object id from which snapshots were taken
     */
    querySnapshotsByParentId(parentObjectId: Uuid): Observable<Snapshot[]> {
        const objectFilter: ObjectFilter = {
            conditions: ["parentObjectId", filterOp.equals(parentObjectId)],
            orderByProperties: [["creationTimestamp", "Desc"]],
        };

        return this.communicationManager
            .publishQuery(QueryEvent.withCoreTypes(["Snapshot"], objectFilter))
            .pipe(map(retrieve => retrieve.data.objects as Snapshot[]));
    }

    /**
     * Find snapshot objects in connected database for a specific object ID
     * which are created within a certain time period. 
     *
     * The array of snapshot objects returned is ordered descendingly by
     * creation timestamp.
     *
     * @param parentObjectId object id from which snapshots were taken
     * @param startTimestamp start timestamp of filter interval (optional);
     * `undefined` if unrestricted
     * @param endTimestamp end timestamp of filter interval (optional);
     * `undefined` if unrestricted
     */
    findSnapshotsByParentId(parentObjectId: Uuid, startTimestamp?: number, endTimestamp?: number): Promise<Snapshot[]> {
        const andConds = [];
        if (parentObjectId) {
            andConds.push(["parentObjectId", filterOp.equals(parentObjectId)]);
        }
        if (startTimestamp) {
            andConds.push(["creationTimestamp", filterOp.greaterThanOrEqual(startTimestamp)]);
        }
        if (endTimestamp) {
            andConds.push(["creationTimestamp", filterOp.lessThanOrEqual(endTimestamp)]);
        }

        const objectFilter: ObjectFilter = {
            conditions: {
                and: andConds,
            },
            orderByProperties: [["creationTimestamp", "Desc"]],
        };
        return this.findSnapshotsByFilter(objectFilter);
    }

    /**
     * Find all snapshot objects in connected database which are created within
     * a certain time period.
     *
     * @param startTimestamp start timestamp of filter interval (optional);
     * `undefined` if unrestricted
     * @param endTimestamp end timestamp of filter interval (optional);
     * `undefined` if unrestricted
     */
    findSnapshotsByTimeFrame(startTimestamp?: number, endTimestamp?: number): Promise<Snapshot[]> {
        return this.findSnapshotsByParentId(undefined, startTimestamp, endTimestamp);
    }

    /**
     * Find snapshot objects in connected database which match a given filter.
     *
     * @param objectFilter object filter to apply to snapshot objects
     */
    findSnapshotsByFilter(objectFilter: ObjectFilter): Promise<Snapshot[]> {
        let snapshots: Snapshot[];
        return this._getDbContext()
            .then(dbCtx => dbCtx.findObjects<Snapshot>(this.options["database"].collection, objectFilter))
            .then(iterator => iterator.forBatch(results => {
                snapshots = results;
            }))
            .then(() => snapshots);
    }

    /**
     * Called whenever the Historian controller receives an incoming Query
     * event.
     *
     * Overwrite this method in a subclass to perform some side effect. Do not
     * call this method in your application code, it is called by the framework.
     *
     * The base method implementation does nothing. The method is only invoked
     * when `shouldReplyToQueries` is set to true.
     *
     * @param event incoming Query event
     */
    protected onQueryReceived(event: QueryEvent) {
        /* tslint:disable:empty-block */
        /* tslint:enable:empty-block */
    }

    /**
     * Called whenever the Historian controller replies to an incoming Query
     * with a Retrieve event.
     *
     * Overwrite this method in a subclass to perform some side effect. Do not
     * call this method in your application code, it is called by the framework.
     *
     * The base method implementation does nothing. The method is only invoked
     * when `shouldReplyToQueries` is set to true.
     *
     * @param event incoming Query event
     * @param snapshots array of Snapshot objects to be passed as Retrieve event
     * data
     */
    protected onQueryRetrieved(event: QueryEvent, snapshots: Snapshot[]) {
        /* tslint:disable:empty-block */
        /* tslint:enable:empty-block */
    }

    private _observeQueries() {
        return this.communicationManager
            .observeQuery()
            .pipe(filter(event => event.data.isCoreTypeCompatible("Snapshot")))
            .subscribe(event => {
                this.onQueryReceived(event);
                this._getDbContext()
                    .then(dbCtx => dbCtx.findObjects<Snapshot>(this.options["database"].collection, event.data.objectFilter))
                    .then(iterator => iterator.forBatch(results => {
                        this.onQueryRetrieved(event, results);
                        event.retrieve(RetrieveEvent.withObjects(results));
                    }))
                    .catch(error => {
                        // In case of retrieval error, do not respond with a 
                        // Retrieve event. The sender of the query should 
                        // implement proper error handling by using a timeout 
                        // operator that triggers in case no response 
                        // is received after a certain period of time.
                    });
            });
    }

    private _observeAdvertise() {
        return this.communicationManager
            .observeAdvertiseWithCoreType("Snapshot")
            .subscribe(event => {
                this._getDbContext()
                    .then(dbCtx => dbCtx.insertObjects(this.options["database"].collection, event.data.object))
                    .catch(error => this.logError(error, "Failed to persist observed snapshot", HistorianController._LOG_TAG_DB));
            });
    }

    private _processSnaphot(snapshot: Snapshot): Promise<Snapshot> {
        const advertiseIfRequested = (s: Snapshot) => {
            if (this.options["shouldAdvertiseSnapshots"]) {
                this.communicationManager.publishAdvertise(AdvertiseEvent.withObject(s));
            }
            return s;
        };

        if (this.options["shouldPersistLocalSnapshots"]) {
            // Ensure snapshot is persisted before being advertised so that it can be 
            // retrieved by an observer.
            return this._getDbContext()
                .then(
                    dbCtx => dbCtx.insertObjects(this.options["database"].collection, snapshot),
                    error => this.logError(error, "Failed to persist new snapshot", HistorianController._LOG_TAG_DB))
                .then(() => advertiseIfRequested(snapshot));
        } else {
            return Promise.resolve(advertiseIfRequested(snapshot));
        }
    }

    private _getDbContext(): Promise<DbContext> {
        if (this._dbCtxPromise === undefined) {
            if (this.options["database"] &&
                this.options["database"].key &&
                this.options["database"].collection) {
                const dbCtx = new DbContext(this.runtime.databaseOptions[this.options["database"].key]);
                this._dbCtxPromise = dbCtx.addCollection(this.options["database"].collection).then(() => dbCtx);
            } else {
                this._dbCtxPromise = Promise.reject("Unspecified database options for HistorianController");
            }
        }
        return this._dbCtxPromise;
    }

}
