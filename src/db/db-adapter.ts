/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { CoatyObject, DbConnectionInfo, Uuid } from "..";
import { DbContext } from "./db-context";
import { DbLocalContext } from "./db-local-context";
import {
    DbJoinCondition,
    DbObjectFilter,
    IDbLocalStore,
    IDbNoSqlOperations,
    IDbSqlOperations,
    IDbTransaction,
    IQueryIterator,
    SqlQueryBuilder,
    SqlQueryOptions,
    SqlQueryResultSet,
} from "./db-operations";
import { AggregateProperties } from "./db-operations";
import { AggregateOp } from "./db-operators";

export type DbAdapterExtension = (...args) => Promise<any>;

export interface IDbAdapterExtension {

    /**
     * Invoke the extension method by the given name and returns the result
     * as a promise. Returns a rejected promise if the extension method
     * doesn't exist or throws an error.
     * @param name name of registered extension method
     * @param params parameters to be applied to extension method
     */
    callExtension(name: string, ...params): Promise<any>;
}

export interface IDbAdapter extends
    IDbNoSqlOperations,
    IDbSqlOperations,
    IDbTransaction,
    IDbLocalStore {
}

export type IDbAdapterConstructor = new (connectionInfo: DbConnectionInfo) => IDbAdapter & IDbAdapterExtension;

/**
 * The base class for deriving custom database adapters and managing extensions.
 */
export abstract class DbAdapterBase implements IDbAdapter, IDbAdapterExtension {

    private _extensions: Set<string>;

    constructor(protected connectionInfo: DbConnectionInfo) {
        this._extensions = new Set();
    }

    /* IDbNoSqlOperations*/

    addCollection(name: string): Promise<void> {
        return this.rejectNotSupported("addCollection");
    }

    removeCollection(name: string): Promise<void> {
        return this.rejectNotSupported("removeCollection");
    }

    clearCollection(name: string): Promise<void> {
        return this.rejectNotSupported("clearCollection");
    }

    insertObjects(
        collectionName: string,
        objects: CoatyObject | CoatyObject[],
        shouldReplaceExisting?: boolean): Promise<Uuid[]> {
        return this.rejectNotSupported("insertObjects");
    }

    updateObjects(collectionName: string, objects: CoatyObject | CoatyObject[]): Promise<Uuid[]> {
        return this.rejectNotSupported("updateObjects");
    }

    updateObjectProperty(
        collectionName: string,
        objectIds: Uuid | Uuid[],
        property: string,
        value: any,
        shouldCreateMissing?: boolean): Promise<any> {
        return this.rejectNotSupported("updateObjectProperty");
    }

    deleteObjectsById(collectionName: string, objectIds: Uuid | Uuid[]): Promise<Uuid[]> {
        return this.rejectNotSupported("deleteObjects");
    }

    deleteObjects(collectionName: string, filter?: DbObjectFilter): Promise<number> {
        return this.rejectNotSupported("deleteObjectsBy");
    }

    findObjectById<T extends CoatyObject>(collectionName: string, id: string, isExternalId = false): Promise<T> {
        return this.rejectNotSupported("findObject");
    }

    findObjects<T extends CoatyObject>(
        collectionName: string,
        filter?: DbObjectFilter,
        joinConditions?: DbJoinCondition | DbJoinCondition[]): Promise<IQueryIterator<T>> {
        return this.rejectNotSupported("findObjects");
    }

    countObjects(collectionName: string, filter?: DbObjectFilter): Promise<number> {
        return this.rejectNotSupported("countObjects");
    }

    aggregateObjects(
        collectionName: string,
        aggregateProps: AggregateProperties,
        aggregateOp: AggregateOp,
        filter?: DbObjectFilter): Promise<number | boolean> {
        return this.rejectNotSupported("aggregateObjects");
    }

    /* IDbSqlOperations */

    query(sql: SqlQueryBuilder): Promise<SqlQueryResultSet> {
        return this.rejectNotSupported("query");
    }

    iquery(sql: SqlQueryBuilder, queryOptions?: SqlQueryOptions): Promise<IQueryIterator<any>> {
        return this.rejectNotSupported("iquery");
    }

    /* IDbTransaction */

    transaction<T>(action: (transactionContext: DbContext | DbLocalContext) => Promise<T>): Promise<T> {
        return this.rejectNotSupported("transaction");
    }

    /* IDbLocalStore */

    addStore(name: string): Promise<any> {
        return this.rejectNotSupported("addStore");
    }

    removeStore(name: string): Promise<any> {
        return this.rejectNotSupported("removeStore");
    }

    getValue(key: string, store?: string): Promise<any> {
        return this.rejectNotSupported("getValue");
    }

    getValues(store?: string): Promise<any> {
        return this.rejectNotSupported("getValues");
    }

    setValue(key: string, value: any, store?: string): Promise<any> {
        return this.rejectNotSupported("setValue");
    }

    deleteValue(key: string, store?: string): Promise<any> {
        return this.rejectNotSupported("deleteValue");
    }

    clearValues(store?: string): Promise<any> {
        return this.rejectNotSupported("clearValues");
    }

    close(): Promise<any> {
        return this.rejectNotSupported("close");
    }

    /* IDbAdapterExtension */

    /**
     * Invoke the extension method by the given name and returns the result
     * as a promise. Returns a rejected promise if the extension method
     * doesn't exist or throws an error.
     * @param name name of registered extension method
     * @param params parameters to be applied to extension method
     */
    callExtension(name: string, ...params): Promise<any> {
        const ext = this._extensions.has(name) ? this[name] as DbAdapterExtension : undefined;
        if (ext) {
            return Promise.resolve().then(() => {
                return ext.apply(this, params);
            });
        }
        return Promise.reject(new Error(`Undefined extension '${name}'`));
    }

    /**
     * Register an extension method of the given name.
     * @param name name of registered extension method
     */
    protected registerExtension(extensionName: string) {
        this._extensions.add(extensionName);
    }

    protected rejectNotSupported(operationName: string): Promise<any> {
        return Promise.reject(new Error(`Operation '${operationName}' not supported by adapter`));
    }
}
