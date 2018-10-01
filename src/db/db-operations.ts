/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { CoatyObject, Uuid } from "../model/object";
import { ObjectFilter } from "../model/object-filter";
import { ObjectJoinCondition } from "../model/object-join";
import { DbContext } from "./db-context";
import { DbLocalContext } from "./db-local-context";
import { AggregateOp } from "./db-operators";

/**
 * Defines NoSQL operations on Coaty objects.
 */
export interface IDbNoSqlOperations {

    /**
     * Add a new collection with the given name if it doesn't exist.
     *
     * Returns a promise that is fulfilled if the operation succeeded.
     * The promise is rejected if an error occurred.
     */
    addCollection(name: string): Promise<void>;

    /**
     * Remove the collection with the given name if it exists.
     *
     * Returns a promise that is fulfilled if the operation succeeded.
     * The promise is rejected if an error occurred.
     */
    removeCollection(name: string): Promise<void>;

    /**
     * Clear all objects from the collection with the given name.
     *
     * Returns a promise that is fulfilled if the operation succeeded.
     * The promise is rejected if an error occurred.
     */
    clearCollection(name: string): Promise<void>;

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
        shouldReplaceExisting?: boolean): Promise<Uuid[]>;

    /**
     * Updates a single object or multiple objects on the specified
     * collection. If an object with the same object ID is not contained in the
     * collection, this object is ignored.
     *
     * Returns a promise that if fulfilled yields an array of object IDs
     * of updated objects. The promise is rejected if an error occurred. In
     * this case it is guaranteed that none of the objects has been updated.
     */
    updateObjects(collectionName: string, objects: CoatyObject | CoatyObject[]): Promise<Uuid[]>;

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
        shouldCreateMissing?: boolean): Promise<any>;

    /**
     * Deletes an object or multiple objects with the given object IDs from the
     * collection. Objects which are not contained in the collection are
     * ignored.
     * Returns a promise that if fulfilled yields an array of object IDs
     * of deleted objects. The promise is rejected if an error occurred. In
     * this case it is guaranteed that none of the requested objects has been
     * deleted.
     */
    deleteObjectsById(collectionName: string, objectIds: Uuid | Uuid[]): Promise<Uuid[]>;

    /**
     * Deletes objects from the collection which match the given filter.
     * If the filter is empty or not specified all objects in the collection are deleted.
     * Returns a promise that if fulfilled yields the number of objects deleted.
     * The promise is rejected if an error occurred. In this case it is
     * guaranteed that none of the requested objects has been deleted.
     */
    deleteObjects(collectionName: string, filter?: DbObjectFilter): Promise<number>;

    /**
     * Finds the first object with the given object ID or external ID in the collection.
     * Returns a promise that if fulfilled yields the first found object or `undefined`
     * if no object with the given ID is contained in the collection.
     * The promise is rejected if an error occurred.
     *
     * If the `isExternalId` parameter is not specified, the given id is interpreted as object ID.
     */
    findObjectById<T extends CoatyObject>(collectionName: string, id: string, isExternalId?: boolean): Promise<T>;

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
        joinConditions?: DbJoinCondition | DbJoinCondition[]): Promise<IQueryIterator<T>>;

    /**
     * Counts objects in the collection which match the given filter.
     * If the filter is empty or not specified counts the total number of
     * objects in the collection.
     * Returns a promise that if fulfilled yields the number of matching objects.
     * The promise is rejected if an error occurred.
     */
    countObjects(collectionName: string, filter?: DbObjectFilter): Promise<number>;

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
     */
    aggregateObjects(
        collectionName: string,
        aggregateProp: string,
        aggregateOp: AggregateOp,
        filter?: DbObjectFilter): Promise<number | boolean>;

    //// interface ObjectSearchFilter { props: [ "title", "name" ], term: "a full text search term" }
    // searchObjects<T extends CoatyObject>(collectionName: string, searchFilter: ObjectSearchFilter): Promise<IQueryIterator<T>>;

}

/**
 * Defines criteria for selecting and ordering a result set of
 * Coaty objects. It is used by the `findObjects`, `deleteObjects`, `aggregateObjects`, and
 * `countObjects` retrieval methods.
 */
export interface DbObjectFilter extends ObjectFilter {

    /**
     * Determines whether the whole query should be executed at once or
     * whether to fetch the query result a chunk of rows at a time to avoid 
     * memory problems. This provides an efficient way to process large query result 
     * sets. The default value of this property is false.
     * 
     * Note that fetching query results in chunks is significantly slower than 
     * fetching the whole query at once when the query contains not significantly
     * more or even less items than the size of a chunk as specified by `fetchSize`.
     * 
     * Fetching results in chunks is especially beneficial in combination with the 
     * `skip` and `take` options. This is the preferred way of paging through a
     * large result set by retrieving only a specific subset.
     */
    shouldFetchInChunks?: boolean;

    /**
     * Maximum number of rows to be retrieved from the database on a chunking
     * fetch operation. If a value is specified on an individual query it 
     * overrides the default adapter-specific value given in the adapter options.
     * This property is only used if the value of `shouldFetchInChunks`
     * is true. If not specified or specified as 0, all rows will be fetched.
     */
    fetchSize?: number;
}

/**
 * Defines a condition for joining related objects from another collection
 * into Coaty objects retrieved from the local collection.
 * The join condition is used by the `findObjects` method. Result objects 
 * are augmented by resolving object references to related objects and by storing 
 * them in an extra property on the result object.
 */
export interface DbJoinCondition extends ObjectJoinCondition {

    /**
     * Specifies the collection in the *same* database to perform the join with.
     */
    fromCollection: string;

    /** 
     * Specifies the property name of the related object from the `fromCollection` 
     * to perform the join with.
     * 
     * An equality match is performed on the `fromProperty` to the local property.
     * 
     * If a related object does not contain the `fromProperty` the value is ignored for 
     * matching purposes.
     */
    fromProperty: string;
}

/**
 * Defines SQL operations.
 */
export interface IDbSqlOperations {

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
    query(sql: SqlQueryBuilder): Promise<SqlQueryResultSet>;

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
     * the resulting row data. The promise is rejected if an error occurs.
     *
     * If you know that a query only returns a very limited number of rows,
     * it might be more convenient to use the `query` operation to retrieve all
     * rows at once.
     *
     * Note that the `iquery` operation might not be supported by a
     * specific database adapter. In this case, the returned promise
     * yields an "operation not supported" error.
     */
    iquery(sql: SqlQueryBuilder, queryOptions?: SqlQueryOptions): Promise<IQueryIterator<any>>;

}

/**
 * Options for SQL queries.
 */
export interface SqlQueryOptions {

    /**
     * If a take count is given, no more than that many objects will be returned
     * (but possibly less, if the request itself yields less objects).
     * Typically, this option is only useful if an ORDER BY clause is also
     * specified to ensure consistent ordering of paginated results.
     * If not specified or specified as 0, all available objects will be returned.
     * 
     * This property is only used for the `ìquery` operation, but not for the `query`
     * operation. For `query` operations use SQL LIMIT clause in the SELECT statement.
     */
    take?: number;

    /**
     * If skip count is given that many objects are skipped before beginning to
     * return result objects.
     * Typically, this option is only useful if an ORDER BY clause is also
     * specified to ensure consistent ordering of paginated results.
     * If not specified or specified as 0, no objects will be skipped.
     * 
     * This property is only used for the `ìquery` operation, but not for the `query`
     * operation. For `query` operations use SQL OFFSET clause in the SELECT statement.
     */
    skip?: number;

    /**
     * Maximum number of rows to be retrieved from the database on a chunking
     * fetch operation. If a value is specified on an individual query it 
     * overrides the default adapter-specific value given in the adapter options.
     * If not specified or specified as 0, all available objects will be fetched.
     * 
     * This property is only used for the `ìquery` operation, but not for the `query`
     * operation.
     */
    fetchSize?: number;

}

/**
 * Collects result data of an SQL query as an array of row data.
 */
export interface SqlQueryResultSet {
    rows: any[];
}

/**
 * A universal SQL query builder function to be called by a specific database adapter
 * to yield a database specific SQL query tuple, consisting of a parameterized
 * SQL query text and an array of bound parameter values.
 *
 * The DB API provides two predefined functions that create and return SQL query 
 * builder functions: `SQL` and `RAW`.
 */
export type SqlQueryBuilder = (
    placeholder: string,
    appendIndex: boolean,
    startIndex: number,
    asIdentifier: (id: string) => string,
    asLiteral: (literal: string) => string,
    embedParams?: boolean) => [string, any[]];

/**
 * Tag function for defining universal SQL queries by template literals.
 *
 * Template placeholder ${...} are treated as bound
 * parameters supplied to the query and are substituted by the appropriate SQL
 * parameter placeholder (e.g. $1, $2, etc. in Postgres, ? in mySQL, SQLite).
 *
 * Template placeholders can be annotated: Use ${...}{IDENT} or ${...}{LIT}
 * to escape the values and insert them as SQL identifiers or literals in the
 * query text. Note that annotated placeholders are not treated as bound
 * parameters of the query.
 *
 * You can also use the SQL tag within a template placeholder to
 * (recursively) insert another SQL query into the current one.
 * This is useful if you want to conditionally insert or append subqueries.
 *
 * Example query: 
 * ```
 * SQL`SELECT * FROM ${myTable}{IDENT} WHERE name = ${myName};`
 * ```
 * 
 * @param parts the text parts between the placeholders
 * @param values the evaluated expressions of all template placeholders.
 */
export function SQL(parts: TemplateStringsArray, ...values: any[]): SqlQueryBuilder {
    "use strict";

    // Template placeholder annotations
    const IDENT = "{IDENT}";
    const LITERAL = "{LIT}";

    return (
        placeholder: string,
        appendIndex: boolean,
        startIndex: number,
        asIdentifier: (id: string) => string,
        asLiteral: (literal: string) => string,
        embedParams = false) => {
        const texts: string[] = [parts[0]];
        const params = [];
        values.forEach((value, i) => {
            const nextPart = parts[i + 1];
            if (nextPart.startsWith(IDENT)) {
                texts.push(asIdentifier(value), nextPart.substr(IDENT.length));
            } else if (nextPart.startsWith(LITERAL)) {
                texts.push(asLiteral(value), nextPart.substr(LITERAL.length));
            } else if (typeof value === "function") {
                const [text, innerParams] = (value as SqlQueryBuilder)(
                    placeholder,
                    appendIndex,
                    startIndex,
                    asIdentifier,
                    asLiteral,
                    embedParams);
                startIndex += innerParams.length;
                params.push(...innerParams);
                texts.push(text, nextPart);
            } else {
                startIndex++;
                params.push(value);
                if (embedParams) {
                    texts.push(asLiteral(value), nextPart);
                } else {
                    texts.push(appendIndex ? placeholder + startIndex : placeholder, nextPart);
                }
            }
        });

        return [texts.join(""), params];
    };
}

/**
 * Use this function to build a query from raw text and the given bound
 * parameters. Raw text has SQL placeholders already in place. No substitutions 
 * take place; the text is passed to the database as is.
 *
 * Use of the SQL tag function is preferred over RAW, because RAW SQL text is
 * database specific due to the non-uniform parameter placeholder conventions
 * of different SQL dialects.
 * 
 * @param text the raw query text with SQL parameter placeholders applied
 * @param params the bound parameters supplied to the query
 */
export function RAW(text: string, ...params: any[]): SqlQueryBuilder {
    "use strict";

    return (
        placeholder: string,
        appendIndex: boolean,
        startIndex: number,
        asIdentifier: (id: string) => string,
        asLiteral: (literal: string) => string) => {
        return [text, params];
    };
}

/**
 * Defines transaction operations.
 */
export interface IDbTransaction {

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
    transaction<T>(action: (transactionContext: DbContext | DbLocalContext) => Promise<T>): Promise<T>;

}

/**
 * Defines local key-value storage operations for JSON objects.
 */
export interface IDbLocalStore {

    /**
     * Add a new store with the given name if it doesn't exist.
     *
     * Returns a promise that is fulfilled if the operation succeeded.
     * The promise is rejected if an error occurred.
     */
    addStore(name: string): Promise<any>;

    /**
     * Remove a store with the given name if it exists.
     *
     * Returns a promise that is fulfilled if the operation succeeded.
     * The promise is rejected if an error occurred.
     */
    removeStore(name: string): Promise<any>;

    /**
     * Gets the value for the given key in the default store or the
     * store specified.
     *
     * Returns a promise that if fulfilled yields the value for the key.
     * If the given key doesn't exist, the promise yields `undefined`.
     * The promise is rejected if an error occurred.
     */
    getValue(key: string, store?: string): Promise<any>;

    /**
     * Gets an object with all key-value pairs in the default store or the 
     * store specified.
     *
     * Returns a promise that if fulfilled yields an object of key-value pairs.
     * The promise is rejected if an error occurred.
     */
    getValues(store?: string): Promise<any>;

    /**
     * Sets the value for the given key in the default store or the
     * store specified.
     *
     * You can pass in any JavaScript object that can be represented in JSON
     * format.
     *
     * Returns a promise that is fulfilled if the set operation succeeded.
     * The promise is rejected if an error occurred.
     */
    setValue(key: string, value: any, store?: string): Promise<any>;

    /**
     * Deletes the key-value pair for the given key in the default store or the
     * store specified.
     *
     * Returns a promise that is fulfilled if the delete operation succeeded.
     * The promise is rejected if an error occurred.
     */
    deleteValue(key: string, store?: string): Promise<any>;

    /**
     * Deletes all key-value pairs in the default store or the
     * store specified.
     *
     * Returns a promise that is fulfilled if the delete operation succeeded.
     * The promise is rejected if an error occurred.
     */
    clearValues(store?: string): Promise<any>;

    /**
     * Closes the local database. 
     * By closing, any file locks on the database file are removed.
     * The database is reopened again when operations are invoked after 
     * the database has been closed.
     *
     * Returns a promise that is fulfilled if the close operation succeeded.
     * The promise is rejected if an error occurred.
     */
    close(): Promise<any>;

}

/**
 * Used to iterate the query results of the given type.
 * The results can be iterated either one by one or in batches.
 * Use the promise returned by the iterator functions to await completion
 * or failure of the iteration.
 */
export interface IQueryIterator<T> {

    /**
     * Registers a synchronous action to be invoked on each result of the
     * iterated sequence.
     *
     * To break out of the iteration prematurely return `false` from the action
     * callback. Return no value (i.e `undefined`) any non `false` value to continue iteration.
     *
     * Returns a promise that is fulfilled when the iteration has finished
     * successfully. In this case the promise yields a tuple whose first value
     * specifies the total number of iterations performed (i.e. total number of
     * action callback invocations, may be 0) and whose second value is true
     * if the iteration has been stopped in the action callback; false otherwise.
     * The promise is rejected if the iteration yields an error.
     */
    forEach(action: (result: T, index: number) => void | boolean): Promise<[number, boolean]>;

    /**
     * Registers a synchronous action to be invoked on each batch of results
     * of the iterated sequence. Note that the last batch array passed to
     * the action callback may have less elements than specified by batchSize.
     * If batchSize is not specified, zero or negative, all the results are accumulated in
     * one batch.
     *
     * To break out of the iteration prematurely return `false` from the action
     * callback. Return no value (i.e `undefined`), or any non `false` value to continue iteration.
     *
     * Returns a promise that is fulfilled when the iteration has finished
     * successfully. In this case the promise yields a tuple whose first value
     * specifies the total number of results submitted in batches (may be 0) and
     * whose second value is true if the iteration has been stopped in the
     * action callback; false otherwise.
     * The promise is rejected if the iteration yields an error.
     */
    forBatch(action: (batch: T[]) => void | boolean, batchSize?: number): Promise<[number, boolean]>;

}

/**
 * Implementation class for IQueryIterator that may be used by
 * custom database adapters.
 */
export class QueryIterator<T> implements IQueryIterator<T> {

    forEachAction: (result: T, index: number) => void | boolean;
    forBatchAction: (batch: T[]) => void | boolean;
    batchSize: number;

    private _starter: () => void;
    private _donePromise: Promise<[number, boolean]>;

    setStarter(starter: () => void) {
        this._starter = starter;
    }

    setDonePromise(donePromise: Promise<[number, boolean]>) {
        this._donePromise = donePromise;
    }

    forEach(action: (result: T, index: number) => void | boolean): Promise<[number, boolean]> {
        if (this.forBatchAction) {
            throw new Error("forBatch action already registered with query iterator");
        }
        if (this.forEachAction) {
            throw new Error("forEach action already registered with query iterator");
        }
        this.forEachAction = action;
        this._starter();
        return this._donePromise;
    }

    forBatch(action: (batch: T[]) => void | boolean, batchSize = 0): Promise<[number, boolean]> {
        if (this.forEachAction) {
            throw new Error("forEach action already registered with query iterator");
        }
        if (this.forBatchAction) {
            throw new Error("forBatch action already registered with query iterator");
        }
        this.batchSize = batchSize;
        this.forBatchAction = action;
        this._starter();
        return this._donePromise;
    }

}
