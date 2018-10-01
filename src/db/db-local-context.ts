/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { IDbAdapter, IDbAdapterConstructor, IDbAdapterExtension } from "./db-adapter";
import { DbAdapterFactory } from "./db-adapter-factory";
import { DbConnectionInfo } from "./db-connection-info";
import {
    IDbLocalStore,
    IDbSqlOperations,
    IDbTransaction,
    IQueryIterator,
    SqlQueryBuilder,
    SqlQueryOptions,
    SqlQueryResultSet,
} from "./db-operations";

/**
 * A local database context persists data in a local database file without using 
 * a database server. It is usually adequate for storing small amounts of data
 * in the local file system of a device or service. SQLite is a typical example of 
 * such a database. Typically, a local database context is used to persist
 * application or service settings. For example, a local database context can be
 * used in a Node.js environment as well as in a Cordova app (utilizing specific
 * built-in SQLite database adapters).
 * 
 * Besides SQL operations and transactions, a local database context supports
 * local storage of pairs of keys and values. Keys are strings and values are
 * any JSON objects. Values can be retrieved when a key is known or by mapping
 * through all key value pairs.
 * 
 * The local database context features a promise-based interface for
 * asynchronous data flow control. A local database context is a light-weight object
 * that can be used to perform a single operation or multiple operations
 * in sequence. A local database context object can be short-lived but you
 * can also use it for the lifetime of your Coaty container by storing it as an
 * instance member in a controller.
 *
 * To invoke multiple asynchronous operations in sequence, it is best practice to
 * use composing promises and promise chaining. Avoid the common bad practice
 * pattern of nesting promises as if they were callbacks.
 *
 * Note that you can reuse a local database context object even if an operation
 * performed on it fails or throws an error.
 *
 * If you invoke an operation on a local database context that is not supported by
 * the associated database adapter, the returned promise is rejected with an
 * "operation not supported" error.
 */
export class DbLocalContext implements IDbSqlOperations, IDbTransaction, IDbLocalStore {

    protected _adapter: IDbAdapter & IDbAdapterExtension;

    /**
     * Create a new DbLocalContext for the given connection info.
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
     * For internal use only. Do not use in your application code.
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

    /* IDbSqlOperations */

    /**
     * Execute an SQL query defined by the given query builder and
     * retrieve the results as one set of row data.
     *
     * Use the predefined query builder functions SQL or RAW to formulate
     * your query.
     *
     * Returns a promise that if fulfilled yields all the query results as
     * one set of row data. The promise is rejected if the query yields an
     * error.
     *
     * If your query potentially yields a large set of results, you should
     * consider using the `iquery` operation instead of this one.
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
     * If your query yields a rather small result set, you should
     * consider using the `query` operation instead of this one.
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
     * Execute the async operations in the given action callback inside a
     * database transaction block. The action callback must return a promise
     * that is fulfilled if all operations have executed without errors,
     * and that is rejected if any of the operations fail.
     *
     * Returns a promise that if fulfilled signals that the transaction has
     * been committed. The promise is rejected if the transaction has been
     * rolled back.
     */
    transaction(action: (transactionContext: DbLocalContext) => Promise<any>): Promise<any> {
        return this._adapter.transaction(action);
    }

    /**
     * Add a new store with the given name if it doesn't exist.
     *
     * Returns a promise that is fulfilled if the operation succeeded.
     * The promise is rejected if an error occurred.
     */
    addStore(name: string): Promise<any> {
        return this._adapter.addStore(name);
    }

    /**
     * Remove a store with the given name if it exists.
     *
     * Returns a promise that is fulfilled if the operation succeeded.
     * The promise is rejected if an error occurred.
     */
    removeStore(name: string): Promise<any> {
        return this._adapter.removeStore(name);
    }

    /**
     * Gets the value for the given key in the default store or the
     * store specified.
     *
     * Returns a promise that if fulfilled yields the value for the key.
     * If the given key doesn't exist, the promise yields `undefined`.
     * The promise is rejected if an error occurred.
     */
    getValue(key: string, store?: string): Promise<any> {
        return this._adapter.getValue(key, store);
    }

    /**
     * Gets an object with all key-value pairs in the default store or the 
     * store specified.
     *
     * Returns a promise that if fulfilled yields an object of key-value pairs.
     * The promise is rejected if an error occurred.
     */
    getValues(store?: string): Promise<any> {
        return this._adapter.getValues(store);
    }

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
    setValue(key: string, value: any, store?: string): Promise<any> {
        return this._adapter.setValue(key, value, store);
    }

    /**
     * Deletes the key-value pair for the given key in the default store or the
     * store specified.
     *
     * Returns a promise that is fulfilled if the delete operation succeeded.
     * The promise is rejected if an error occurred.
     */
    deleteValue(key: string, store?: string): Promise<any> {
        return this._adapter.deleteValue(key, store);
    }

    /**
     * Deletes all key-value pairs in the default store or the
     * store specified.
     *
     * Returns a promise that is fulfilled if the delete operation succeeded.
     * The promise is rejected if an error occurred.
     */
    clearValues(store?: string): Promise<any> {
        return this._adapter.clearValues(store);
    }

    /**
     * Closes the local database. 
     * By closing, any file locks on the database file are removed.
     * The database is reopened again when operations are invoked after 
     * the database has been closed.
     *
     * Returns a promise that is fulfilled if the close operation succeeded.
     * The promise is rejected if an error occurred.
     */
    close(): Promise<any> {
        return this._adapter.close();
    }

}
