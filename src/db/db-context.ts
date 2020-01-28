/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { CoatyObject, CoreTypes, DbConnectionInfo, ObjectJoinCondition, Uuid } from "..";
import { IDbAdapter, IDbAdapterConstructor, IDbAdapterExtension } from "./db-adapter";
import { DbAdapterFactory } from "./db-adapter-factory";
import {
    DbJoinCondition,
    DbObjectFilter,
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

/**
 * A database context provides a unified API for accessing data
 * in SQL and/or NoSQL databases. It features a promise-based interface for
 * asynchronous data flow control. A database context is a light-weight object
 * that can be used to perform a single operation or multiple operations
 * in sequence. A database context object can be short-lived but you
 * can also use it for the lifetime of your Coaty container by storing it as an
 * instance member in a controller.
 *
 * To invoke multiple asynchronous operations in sequence, it is best practice to
 * use composing promises and promise chaining. Avoid the common bad practice
 * pattern of nesting promises as if they were callbacks.
 *
 * Note that you can reuse a database context object even if an operation
 * performed on it fails or throws an error.
 *
 * If you invoke an operation on a database context that is not supported by
 * the associated database adapter, the returned promise is rejected with an
 * "operation not supported" error.
 */
export class DbContext implements IDbNoSqlOperations, IDbSqlOperations, IDbTransaction {

    protected _adapter: IDbAdapter & IDbAdapterExtension;

    /**
     * Create a new DbContext for the given connection info.
     *
     * You can optionally register the adapter constructor function to be used
     * by the given connection info.
     * 
     * @param connectionInfo the connection information
     * @param adapterType the adapter constructor function to be used (optional)
     */
    constructor(connectionInfo: DbConnectionInfo, adapterType?: IDbAdapterConstructor) {
        if (!connectionInfo) {
            throw new TypeError("Argument 'connectionInfo' not defined");
        }
        if (adapterType) {
            DbAdapterFactory.registerAdapter(connectionInfo.adapter, adapterType);
        }
        this._adapter = DbAdapterFactory.create(connectionInfo);
    }

    /**
     * @internal For internal use only. Do not use in your application code.
     */
    get adapter() {
        return this._adapter;
    }

    /* IDbAdapterExtension */

    /**
     * Invokes the extension method by the specified name.
     * Returns a rejected promise if the method invocation throws an error
     * or if the extension method of the given name is not defined.
     * 
     * @param name the name of the extension method
     * @param params the arguments of the extension methods
     */
    callExtension(name: string, ...params): Promise<any> {
        return this._adapter.callExtension(name, ...params);
    }

    /* IDbNoSqlOperations */

    /**
     * Add a new collection with the given name if it doesn't exist.
     *
     * Returns a promise that is fulfilled if the operation succeeded.
     * The promise is rejected if an error occurred.
     */
    addCollection(name: string): Promise<void> {
        return this._adapter.addCollection(name);
    }

    /**
     * Remove the collection with the given name if it exists.
     *
     * Returns a promise that is fulfilled if the operation succeeded.
     * The promise is rejected if an error occurred.
     */
    removeCollection(name: string): Promise<void> {
        return this._adapter.removeCollection(name);
    }

    /**
     * Clear all objects from the collection with the given name.
     *
     * Returns a promise that is fulfilled if the operation succeeded.
     * The promise is rejected if an error occurred.
     */
    clearCollection(name: string): Promise<void> {
        return this._adapter.clearCollection(name);
    }

    /**
     * Inserts a single object or multiple objects into the specified
     * collection. If an object with the same object ID is already contained
     * in the collection, the object to be inserted can be skipped 
     * or can replace the existing one, depending on the `shouldReplaceExisting`
     * option (defaults to true).
     *
     * If no error occurs a fullfilled promise is returned that yields an array
     * of object IDs of inserted or replaced objects. Otherwise, a rejected
     * promise is returned. In this case, it is guaranteed that none of the
     * specified objects has been inserted into the collection.
     */
    insertObjects(
        collectionName: string,
        objects: CoatyObject | CoatyObject[],
        shouldReplaceExisting: boolean = true): Promise<Uuid[]> {
        return Promise.resolve().then(() => {
            this._throwIfNotObjectType(objects);
            return this._adapter.insertObjects(collectionName, objects, shouldReplaceExisting);
        });
    }

    /**
     * Updates a single object or multiple objects on the specified
     * collection. If an object with the same object ID is not contained in the
     * collection, this object is ignored.
     *
     * If no error occurs a fullfilled promise is returned that yields an array
     * of object IDs of updated objects. Otherwise, a rejected
     * promise is returned. In this case, it is guaranteed that none of the
     * specified has been updated.
     */
    updateObjects(
        collectionName: string, objects: CoatyObject | CoatyObject[]): Promise<Uuid[]> {
        return Promise.resolve().then(() => {
            this._throwIfNotObjectType(objects);
            return this._adapter.updateObjects(collectionName, objects);
        });
    }

    /**
     * Updates or deletes the property value of a single object or multiple objects
     * with the given object IDs in the specified collection.
     * Objects which are not contained in the collection are ignored.
     * The `shouldCreateMissing` parameter controls whether the property value
     * pair is added to an object if the property does not exist (defaults to
     * true). Specify an `undefined` value to delete the property value pair
     * from the object(s).
     *
     * Returns a promise that is resolved if the update is successful.
     * The promise is rejected if an error occurred. In
     * this case it is guaranteed that none of the objects has been updated.
     */
    updateObjectProperty(
        collectionName: string,
        objectIds: Uuid | Uuid[],
        property: string,
        value: any,
        shouldCreateMissing = true): Promise<any> {
        return Promise.resolve().then(() => {
            this._throwIfNotUuids(objectIds);
            return this._adapter.updateObjectProperty(collectionName, objectIds, property, value, shouldCreateMissing);
        });
    }

    /**
     * Deletes an object or multiple objects with the given object IDs from the
     * collection. Objects which are not contained in the collection are
     * ignored.
     * Returns a promise that if fulfilled yields an array of object IDs
     * of deleted objects. The promise is rejected if an error occurred. In
     * this case it is guaranteed that none of the requested objects has been
     * deleted.
     */
    deleteObjectsById(collectionName: string, objectIds: Uuid | Uuid[]): Promise<Uuid[]> {
        return Promise.resolve().then(() => {
            this._throwIfNotUuids(objectIds);
            return this._adapter.deleteObjectsById(collectionName, objectIds);
        });
    }

    /**
     * Deletes objects from the collection which match the given filter.
     * If the filter is empty or not specified all objects in the collection are deleted.
     * Returns a promise that if fulfilled yields the number of objects deleted.
     * The promise is rejected if an error occurred. In this case it is
     * guaranteed that none of the requested objects has been deleted.
     */
    deleteObjects(collectionName: string, filter?: DbObjectFilter): Promise<number> {
        return Promise.resolve().then(() => {
            filter && this._throwIfObjectFilterInvalid(filter);
            return this._adapter.deleteObjects(collectionName, filter);
        });
    }

    /**
     * Finds the first object with the given object ID or external ID in the collection.
     * Returns a promise that if fulfilled yields the first found object or `undefined`
     * if no object with the given ID is contained in the collection.
     * The promise is rejected if an error occurred.
     * 
     * If the `isExternalId` parameter is not specified, the given id is interpreted as object ID.
     */
    findObjectById<T extends CoatyObject>(collectionName: string, id: string, isExternalId = false): Promise<T> {
        return Promise.resolve().then(() => {
            this._throwIfNotUuid(id);
            return this._adapter.findObjectById<T>(collectionName, id, isExternalId);
        });
    }

    /**
     * Finds objects in the collection which match the given object filter.
     * If the filter is empty or not specified all objects in the collection are retrieved.
     *
     * Optional join conditions can be specified to augment result objects
     * by resolving object references to related objects and storing
     * them as extra properties.
     *
     * The result can be iterated one by one or in batches to avoid
     * memory overrun when the result contains a large number of objects.
     * 
     * Returns a promise that if fulfilled yields an iterator for iterating
     * the resulting objects. The promise is rejected if an error occurred.
     */
    findObjects<T extends CoatyObject>(
        collectionName: string,
        filter?: DbObjectFilter,
        joinConditions?: DbJoinCondition | DbJoinCondition[]): Promise<IQueryIterator<T>> {
        return Promise.resolve().then(() => {
            filter && this._throwIfObjectFilterInvalid(filter);
            return this._adapter.findObjects<T>(collectionName, filter, joinConditions);
        });
    }

    /**
     * Counts objects in the collection which match the given filter.
     * If the filter is empty or not specified counts the total number of
     * objects in the collection.
     * Returns a promise that if fulfilled yields the number of matching objects.
     * The promise is rejected if an error occurred.
     */
    countObjects(collectionName: string, filter?: DbObjectFilter): Promise<number> {
        return Promise.resolve().then(() => {
            filter && this._throwIfObjectFilterInvalid(filter);
            return this._adapter.countObjects(collectionName, filter);
        });
    }

    /**
     * Aggregates values of the given object property in the collection
     * for objects which match the given filter. Depending on the aggregation
     * operator specified either numeric or boolean values are yielded. The
     * value type of the given object property must match the aggregation
     * operator specified.
     * 
     * If the filter is empty or not specified all objects are considered for
     * aggregation. If the filter matches no objects at all the aggregated value
     * returned is `undefined`.
     * Returns a promise that if fulfilled yields the aggregated value of
     * matching object properties. The promise is rejected if an error occurred.
     * 
     * The object property to be applied for aggregation is specified either
     * in dot notation or array notation. In dot notation, the name of the
     * object property is specified as a string (e.g. `"volume"`). It may
     * include dots (`.`) to access nested properties of subobjects (e.g.
     * `"message.size"`). If a single property name contains dots itself,
     * you obviously cannot use dot notation. Instead, specify the property
     * or nested properties as an array of strings (e.g.
     * `["property.with.dots", "subproperty.with.dots"]`).
     */
    aggregateObjects(
        collectionName: string,
        aggregateProps: AggregateProperties,
        aggregateOp: AggregateOp,
        filter?: DbObjectFilter): Promise<number | boolean> {
        return Promise.resolve().then(() => {
            filter && this._throwIfObjectFilterInvalid(filter);
            return this._adapter.aggregateObjects(
                collectionName,
                aggregateProps,
                aggregateOp,
                filter);
        });
    }

    /**
     * A utility method that computes the join conditions for a `findObjects` operation
     * from join conditions passed in by query events and from mappings that define how
     * their local properties map onto the collections and properties to be joined with.
     */
    getDbJoinConditionsFrom(
        joinConditions: ObjectJoinCondition | ObjectJoinCondition[],
        ...fromMappings: Array<{ localProperty: string, fromProperty: string, fromCollection: string }>):
        DbJoinCondition | DbJoinCondition[] {
        if (!joinConditions) {
            return undefined;
        }
        if (!Array.isArray(joinConditions)) {
            joinConditions = [joinConditions];
        }
        const dbJoinConds: DbJoinCondition[] = [];
        joinConditions.forEach(jc => {
            const map = fromMappings.find(m => m.localProperty === jc.localProperty);
            map && dbJoinConds.push(Object.assign(
                { fromCollection: map.fromCollection, fromProperty: map.fromProperty },
                jc));
        });

        return dbJoinConds;
    }

    /* IDbSqlOperations */

    /**
     * Execute an SQL query defined by the given query builder and
     * retrieve the results as one set of row data.
     *
     * Use the predefined query builder functions SQL or RAW to formulate
     * your parameterized SQL query.
     *
     * Returns a promise that if fulfilled yields all the query results as
     * one set of row data. The promise is rejected if the query yields an
     * error.
     *
     * Note that the query first retrieves all result rows and stores them in
     * memory. For queries that have potentially large result sets,
     * consider to use the `iquery` operation instead of this one.
     */
    query(sql: SqlQueryBuilder): Promise<SqlQueryResultSet> {
        return this._adapter.query(sql);
    }

    /**
     * Execute an SQL query defined by the given query builder and
     * retrieve the results iteratively.
     *
     * Use the predefined query builder functions SQL or RAW to formulate
     * your parameterized SQL query.
     *
     * The result can be iterated one by one or in batches to avoid
     * memory overrun when the result contains a large number of rows.
     * Usually, this is implemented by using a cursor. The fetch size of the
     * cursor can be adjusted in the specified query options.
     *
     * Returns a promise that if fulfilled yields an iterator for iterating
     * the resulting row data. The promise is rejected if an error occurred.
     *
     * If you know that a query only returns a very limited number of rows,
     * it might be more convenient to use the `query` operation to retrieve all
     * rows at once.
     *
     * Note that the `iquery` operation might not be supported by a
     * specific database adapter. In this case, the returned promise
     * yields an "operation not supported" error.
     */
    iquery(sql: SqlQueryBuilder, queryOptions?: SqlQueryOptions): Promise<IQueryIterator<any>> {
        return this._adapter.iquery(sql, queryOptions);
    }

    /* IDbTransaction */

    /**
     * Execute async operations in the given action callback inside a
     * database transaction block. The action callback must return a promise
     * that is fulfilled if all operations have executed without errors,
     * and that is rejected if any of the operations fail.
     * All transactional operations must be invoked on the transaction context
     * passed in the action callback.
     *
     * Returns a promise that if fulfilled signals that the transaction has
     * been committed. In this case, the promise resolves to the value of
     * the resolved action callback. The promise is rejected if the transaction
     * is rolled back because the action callback's returned promise
     * has been rejected.
     */
    transaction<T>(action: (transactionContext: DbContext) => Promise<T>): Promise<T> {
        return this._adapter.transaction(action);
    }

    /* Private */

    private _throwIfNotObjectType(objects: CoatyObject | CoatyObject[]) {
        if (Array.isArray(objects)) {
            if (!CoreTypes.isObjectArray(objects)) {
                throw new TypeError("specified array contains non-Coaty objects");
            }
        } else if (!CoreTypes.isObject(objects)) {
            throw new TypeError("specified argument is not a Coaty object");
        }
    }

    private _throwIfNotUuids(objectIds: Uuid | Uuid[]) {
        if (Array.isArray(objectIds)) {
            if (!CoreTypes.isStringArray(objectIds)) {
                throw new TypeError("specified array contains non-UUIDs");
            }
        } else if (typeof objectIds !== "string") {
            throw new TypeError("specified argument is not a UUID");
        }
    }

    private _throwIfNotUuid(objectId: Uuid) {
        if (typeof objectId !== "string") {
            throw new TypeError("specified argument is not a UUID");
        }
    }

    private _throwIfObjectFilterInvalid(filter: DbObjectFilter) {
        if (!filter || typeof filter !== "object" || Array.isArray(filter)) {
            throw new TypeError("specified argument is not an object filter");
        }
    }

}
