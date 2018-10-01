/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { CoatyObject, Uuid } from "../../model/object";
import { ObjectMatcher } from "../../model/object-filter";
import { CoreTypes } from "../../model/types";
import { DbAdapterBase } from "../db-adapter";
import { DbConnectionInfo } from "../db-connection-info";
import {
    DbJoinCondition,
    DbObjectFilter,
    IQueryIterator,
    QueryIterator,
} from "../db-operations";
import { AggregateOp } from "../db-operators";

interface InMemoryDb {
    name: string;
    collections: Map<string, InMemoryCollection>;
}

interface InMemoryCollection {
    name: string;
    objects: Map<Uuid, CoatyObject>;
}

/**
 * Provides access to an in-memory NoSQL database that supports NoSQL operations only.
 * Transactions are not supported.  Fetching in chunks is not supported,
 * i.e. `DbObjectFilter.shouldFetchInChunks` and `DbObjectFilter.fetchSize` are ignored.
 * 
 * This adapter has no external dependencies to database
 * drivers and requires no installation of third-party modules. It can be used in any
 * runtime environment, running in Node.js, Cordova apps, or browsers.
 * 
 * This adapter requires a connection string of the following form:
 * `in-memory://<database>`
 * 
 * This adapter supports the following connection options:
 * ```ts
 * {
 *    // Name of database to connect
 *    database: "<name>"
 * }
 * ```
 * The database specified by either the connection string or options is implicitely and
 * automatically created in-memory the first time you are creating a `DbContext` on it.
 */
export class InMemoryAdapter extends DbAdapterBase {

    private static readonly DATABASES = new Map<string, InMemoryDb>();

    private _db: InMemoryDb;

    constructor(connectionInfo: DbConnectionInfo) {
        super(connectionInfo);
        this._initDatabase();
    }

    /* IDbNoSqlOperations */

    addCollection(name: string): Promise<void> {
        let coll = this._db.collections.get(name);
        if (!coll) {
            coll = { name, objects: new Map<Uuid, CoatyObject>() };
            this._db.collections.set(name, coll);
        }
        return Promise.resolve();
    }

    removeCollection(name: string): Promise<void> {
        const coll = this._db.collections.get(name);
        if (coll) {
            this._db.collections.delete(name);
        }
        return Promise.resolve();
    }

    clearCollection(name: string): Promise<void> {
        const coll = this._db.collections.get(name);
        if (!coll) {
            return Promise.reject(`Failed to clear collection '${name}': not existing`);
        }
        coll.objects.clear();
        return Promise.resolve();
    }

    insertObjects(
        collectionName: string,
        objects: CoatyObject | CoatyObject[],
        shouldReplaceExisting?: boolean): Promise<Uuid[]> {
        const coll = this._db.collections.get(collectionName);
        if (!coll) {
            return Promise.reject(`Failed to insert objects in collection '${collectionName}': not existing`);
        }
        if (!Array.isArray(objects)) {
            objects = [objects];
        }
        const insertedUuids = [];
        objects.forEach(obj => {
            if (!coll.objects.has(obj.objectId) || shouldReplaceExisting) {
                coll.objects.set(obj.objectId, CoreTypes.clone(obj));
                insertedUuids.push(obj.objectId);
            }
        });
        return Promise.resolve(insertedUuids);
    }

    updateObjects(collectionName: string, objects: CoatyObject | CoatyObject[]): Promise<Uuid[]> {
        const coll = this._db.collections.get(collectionName);
        if (!coll) {
            return Promise.reject(`Failed to update objects in collection '${collectionName}': not existing`);
        }
        if (!Array.isArray(objects)) {
            objects = [objects];
        }
        const updatedUuids = [];
        objects.forEach(obj => {
            if (coll.objects.has(obj.objectId)) {
                coll.objects.set(obj.objectId, CoreTypes.clone(obj));
                updatedUuids.push(obj.objectId);
            }
        });
        return Promise.resolve(updatedUuids);
    }

    updateObjectProperty(
        collectionName: string,
        objectIds: Uuid | Uuid[],
        property: string,
        value: any,
        shouldCreateMissing = true): Promise<any> {
        const coll = this._db.collections.get(collectionName);
        if (!coll) {
            return Promise.reject(`Failed to update object property in collection '${collectionName}': not existing`);
        }
        if (!Array.isArray(objectIds)) {
            objectIds = [objectIds];
        }
        objectIds.forEach(objId => {
            const obj = coll.objects.get(objId);
            if (obj) {
                if (value === undefined) {
                    delete obj[property];
                } else {
                    if (obj.hasOwnProperty(property) || shouldCreateMissing) {
                        obj[property] = value;
                    }
                }
            }
        });
        return Promise.resolve();
    }

    deleteObjectsById(collectionName: string, objectIds: Uuid | Uuid[]): Promise<Uuid[]> {
        const coll = this._db.collections.get(collectionName);
        if (!coll) {
            return Promise.reject(`Failed to delete objects in collection '${collectionName}': not existing`);
        }
        if (!Array.isArray(objectIds)) {
            objectIds = [objectIds];
        }
        const deletedUuids = [];
        objectIds.forEach(objId => {
            if (coll.objects.has(objId)) {
                coll.objects.delete(objId);
                deletedUuids.push(objId);
            }
        });
        return Promise.resolve(deletedUuids);
    }

    deleteObjects(collectionName: string, filter?: DbObjectFilter): Promise<number> {
        const coll = this._db.collections.get(collectionName);
        if (!coll) {
            return Promise.reject(`Failed to delete objects in collection '${collectionName}': not existing`);
        }
        let numDeleted = 0;
        const matcher = this._getFilterMatcher(filter);
        if (!matcher) {
            numDeleted = coll.objects.size;
            coll.objects.clear();
        } else {
            coll.objects.forEach((obj, key, map) => {
                if (matcher(obj)) {
                    map.delete(key);
                    numDeleted++;
                }
            });
        }
        return Promise.resolve(numDeleted);
    }

    findObjectById<T extends CoatyObject>(collectionName: string, id: string, isExternalId = false): Promise<T> {
        const coll = this._db.collections.get(collectionName);
        if (!coll) {
            return Promise.reject(`Failed to find object by id in collection '${collectionName}': not existing`);
        }
        if (isExternalId) {
            let result: T;

            // When targeting ES6, use a for...of loop instead.
            // (in ES5, TS only accepts array and string types in for...of loops)
            const iter = coll.objects.values();
            let iterValue = iter.next();
            while (!iterValue.done) {
                const o = iterValue.value as T;
                if (o.externalId === id) {
                    result = o;
                    break;
                }
                iterValue = iter.next();
            }
            return Promise.resolve(result);
        }
        return Promise.resolve(coll.objects.get(id) as any);
    }

    findObjects<T extends CoatyObject>(
        collectionName: string,
        filter?: DbObjectFilter,
        joinConditions?: DbJoinCondition | DbJoinCondition[]): Promise<IQueryIterator<T>> {
        const coll = this._db.collections.get(collectionName);
        if (!coll) {
            return Promise.reject(`Failed to find objects in collection '${collectionName}': not existing`);
        }

        return new Promise<IQueryIterator<T>>((resolve, reject) => {
            const iterator = new QueryIterator<T>();
            const donePromise = new Promise<[number, boolean]>((resolveDone, rejectDone) => {
                iterator.setStarter(() => {
                    const limit = (filter && filter.take) || Number.MAX_SAFE_INTEGER;
                    const offset = (filter && filter.skip) || 0;
                    const comparer = this._getFilterComparer(filter);
                    let matcher = this._getFilterMatcher(filter);
                    let iter: any;

                    if (comparer) {
                        const objectsToOrder: T[] = [];
                        coll.objects.forEach(obj => {
                            if (!matcher || matcher(obj)) {
                                objectsToOrder.push(obj as T);
                            }
                        });
                        const sorted = objectsToOrder.sort(comparer);
                        // When targeting ES6, use sorted array in for...of loop directly (no iterable needed)
                        let iIter = 0;
                        iter = {
                            next: () => {
                                const done = iIter >= sorted.length;
                                return { value: done ? undefined : sorted[iIter++], done };
                            },
                        };
                        matcher = undefined;
                    } else {
                        iter = coll.objects.values();
                    }

                    let matchIndex = 0;
                    let resultCount = 0;
                    let currentBatch: T[] = [];
                    let isBreakInvoked = false;
                    let iterValue = iter.next();

                    try {
                        // When targeting ES6, use a for...of loop instead.
                        // (in ES5, TS only accepts array and string types in for...of loops)
                        while (!iterValue.done) {
                            const origObj = iterValue.value as T;
                            if (!matcher || matcher(origObj)) {
                                const resultIndex = matchIndex - offset;
                                if (resultIndex >= 0) {
                                    if (resultIndex < limit) {
                                        // Hit object within limit range has been found
                                        const obj = CoreTypes.clone(origObj, true);

                                        // Augment object by extra properties from join conditions
                                        this._joinObjectProperties(obj, joinConditions);

                                        let dontBreak: void | boolean = true;

                                        // Yield a single item
                                        if (iterator.forEachAction) {
                                            dontBreak = iterator.forEachAction(obj, resultCount);
                                        }
                                        // Yield current batch if enough items have accumulated
                                        if (iterator.forBatchAction) {
                                            currentBatch.push(obj);
                                            if (iterator.batchSize > 0 && currentBatch.length === iterator.batchSize) {
                                                dontBreak = iterator.forBatchAction(currentBatch);
                                                currentBatch = [];
                                            }
                                        }

                                        resultCount++;

                                        if (dontBreak === false) {
                                            isBreakInvoked = true;
                                            break;
                                        }
                                    } else {
                                        // Finishing iteration of hits because limit has been reached
                                        break;
                                    }
                                }
                                matchIndex++;
                            }
                            iterValue = iter.next();
                        }

                        // Yield last batch if needed. If query yields no results at all, also 
                        // submit the first (empty) batch.
                        if (iterator.forBatchAction && (currentBatch.length > 0 || resultCount === 0)) {
                            if (iterator.forBatchAction(currentBatch) === false) {
                                isBreakInvoked = true;
                            }
                        }
                        resolveDone([resultCount, isBreakInvoked]);
                    } catch (error) {
                        rejectDone(error);
                    }
                });
            });
            iterator.setDonePromise(donePromise);
            resolve(iterator);
        });
    }

    countObjects(collectionName: string, filter?: DbObjectFilter): Promise<number> {
        const coll = this._db.collections.get(collectionName);
        if (!coll) {
            return Promise.reject(`Failed to count objects in collection '${collectionName}': not existing`);
        }
        let count = 0;
        const matcher = this._getFilterMatcher(filter);
        if (!matcher) {
            count = coll.objects.size;
        } else {
            coll.objects.forEach(obj => {
                if (matcher(obj)) {
                    count++;
                }
            });
        }
        return Promise.resolve(count);
    }

    aggregateObjects(
        collectionName: string,
        aggregateProp: string,
        aggregateOp: AggregateOp,
        filter?: DbObjectFilter): Promise<number | boolean> {
        const coll = this._db.collections.get(collectionName);
        if (!coll) {
            return Promise.reject(`Failed to aggregate objects in collection '${collectionName}': not existing`);
        }
        const matcher = this._getFilterMatcher(filter);
        const aggregator = this._getAggregator(aggregateOp);
        let aggregatedValue: number | boolean;
        let aggregatedCount = 0;
        coll.objects.forEach(obj => {
            if (!matcher || matcher(obj)) {
                aggregatedValue = aggregator(aggregatedValue, obj[aggregateProp]);
                aggregatedCount++;
            }
        });
        if (aggregatedCount > 1 && aggregateOp === AggregateOp.Avg) {
            aggregatedValue = aggregatedValue as number / aggregatedCount;
        }
        return Promise.resolve(aggregatedCount === 0 ? undefined : aggregatedValue);
    }

    /* Private */

    private _initDatabase() {
        let dbName;
        if (this.connectionInfo.connectionString) {
            const [protocol, name] = this.connectionInfo.connectionString.split("://");
            if (protocol === "in-memory" && name.length > 0) {
                dbName = name;
            }
        } else if (this.connectionInfo.connectionOptions) {
            dbName = this.connectionInfo.connectionOptions["database"];
        }

        if (!dbName) {
            throw new Error("No database specified in connection info.");
        }

        let db = InMemoryAdapter.DATABASES.get(dbName);
        if (!db) {
            db = { name: dbName, collections: new Map<string, InMemoryCollection>() };
            InMemoryAdapter.DATABASES.set(dbName, db);
        }
        this._db = db;
    }

    private _getAggregator(aggregateOp: AggregateOp):
        (aggregatedValue: number | boolean, currentValue: number | boolean) => number | boolean {
        switch (aggregateOp) {
            case AggregateOp.Avg:
                return (av: number, cv: number) => av === undefined ? cv : av + cv;
            case AggregateOp.Sum:
                return (av: number, cv: number) => av === undefined ? cv : av + cv;
            case AggregateOp.Max:
                return (av: number, cv: number) => av === undefined ? cv : Math.max(av, cv);
            case AggregateOp.Min:
                return (av: number, cv: number) => av === undefined ? cv : Math.min(av, cv);
            case AggregateOp.Every:
                return (av: boolean, cv: boolean) => av === undefined ? cv : av && cv;
            case AggregateOp.Some:
                return (av: boolean, cv: boolean) => av === undefined ? cv : av || cv;
            default:
                throw new TypeError(`Unhandled aggregate operator '${aggregateOp}'`);
        }
    }

    private _getFilterMatcher(filter: DbObjectFilter) {
        if (!filter || !filter.conditions) {
            return undefined;
        }
        return (obj: CoatyObject) => ObjectMatcher.matchesFilter(obj, filter);
    }

    private _getFilterComparer(filter: DbObjectFilter) {
        if (!filter || !filter.orderByProperties || filter.orderByProperties.length === 0) {
            return undefined;
        }
        const baseComparer = (x, y) => {
            if (x === y) {
                return 0;
            }
            if (typeof x === "string" && typeof y === "string") {
                return ObjectMatcher.collator.compare(x, y);
            }
            if (typeof x === "number" && typeof y === "number") {
                return x - y;
            }
            if (typeof x === "boolean" && typeof y === "boolean") {
                return x === false ? -1 : 1;
            }
            if (x === undefined && y !== undefined) {
                return -1;
            }
            if (x !== undefined && y === undefined) {
                return 1;
            }
            return x === y ? 0 : (x < y ? -1 : 1);
        };
        return (a: CoatyObject, b: CoatyObject) => {
            for (const [prop, order] of filter.orderByProperties) {
                const result = order === "Asc" ? baseComparer(a[prop], b[prop]) : baseComparer(b[prop], a[prop]);
                if (result !== 0) {
                    return result;
                }
            }
            return 0;
        };
    }

    private _joinObjectProperties(obj: CoatyObject, joinConditions: DbJoinCondition | DbJoinCondition[]) {
        if (!joinConditions) {
            return;
        }
        if (!Array.isArray(joinConditions)) {
            joinConditions = [joinConditions];
        }

        joinConditions.forEach(jc => {
            const fromColl = this._db.collections.get(jc.fromCollection);
            if (!fromColl) {
                throw new Error(`failed to join from collection '${jc.fromCollection}': not existing`);
            }
            const joinedObjs: CoatyObject[] = [];
            let localValues: any[] = obj[jc.localProperty];
            if (!jc.isLocalPropertyArray) {
                localValues = [localValues];
            }

            for (const localValue of localValues) {
                if (localValue === undefined) {
                    continue;
                }
                // Optimize lookup of joined object ID properties
                if (jc.fromProperty === "objectId") {
                    const fo = fromColl.objects.get(localValue);
                    if (fo) {
                        joinedObjs.push(CoreTypes.clone(fo, true));
                    }
                    continue;
                }

                // When targeting ES6, use a for...of loop instead.
                // (in ES5, TS only accepts array and string types in for...of loops)
                const iter = fromColl.objects.values();
                let iterValue = iter.next();
                while (!iterValue.done) {
                    const fo = iterValue.value;
                    if (fo[jc.fromProperty] === localValue) {
                        joinedObjs.push(CoreTypes.clone(fo, true));
                        if (jc.isOneToOneRelation) {
                            break;
                        }
                    }
                    iterValue = iter.next();
                }
            }

            if (jc.isOneToOneRelation && !jc.isLocalPropertyArray) {
                if (joinedObjs.length === 0) {
                    delete obj[jc.asProperty];
                } else {
                    obj[jc.asProperty] = joinedObjs[0];
                }
            } else {
                obj[jc.asProperty] = joinedObjs;
            }
        });
    }

}
