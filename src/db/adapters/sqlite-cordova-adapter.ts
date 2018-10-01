/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { DbConnectionInfo } from "../db-connection-info";
import { DbLocalContext } from "../db-local-context";
import { SqlQueryBuilder, SqlQueryResultSet } from "../db-operations";

import { SqLiteBaseAdapter } from "./sqlite-base-adapter";

const win: any = window;

interface DbOptions {
    name: string;
    location?: "default";
    iosDatabaseLocation?: "default" | "Library" | "Documents";
}

/**
 * An SQLite adapter for the cordova-sqlite-storage plugin. Supports SQLite
 * databases on Android, iOS and Windows.
 *
 * This adapter supports SQL operations, transactions, and local
 * store operations exposed by a local database context (of class `DbLocalContext`).
 * The `iquery` operation is not supported.
 *
 * This adapter provides an extension method `deleteDatabase` for deleting the
 * local SQLite database file specified in the connection options.
 *
 * This adapter accepts the following connection info: `connectionString`
 * specifies the name of the database file. `connectionOptions` accepts a 
 * `location` option (defaults to `default`). To specify a different location,
 * (affects iOS only) use the `iosDatabaseLocation` option with one of the 
 * following choices: 
 * * `default`: stored in Library/LocalDatabase subdirectory, **not** visible to 
 * iTunes and **not** backed up by iCloud
 * * `Library`: stored in Library subdirectory, backed up by iCloud, **not** 
 * visible to iTunes
 * * `Documents`: stored in Documents subdirectory, visible to iTunes and backed 
 * up by iCloud
 *
 * Like with other Cordova plugins you must wait for the `deviceready` event
 * in your app before instantiating a local database context with this adapter.
 * Note that controllers and other service classes injected into Ionic/Angular
 * UI components are created before the `deviceready` event is fired. Thus, you
 * should never execute operations on a local database context on this adapter 
 * in the constructor of such a class.
 *
 * As a prerequisite you need to install the cordova plugin as explained here:
 * [cordova-sqlite-storage](https://www.npmjs.com/package/cordova-sqlite-storage)
 */
export class SqLiteCordovaAdapter extends SqLiteBaseAdapter {

    private _dbOptions: DbOptions;
    private _db: any;
    private _transaction: any;

    constructor(connectionInfo: DbConnectionInfo) {
        super(connectionInfo);

        this._dbOptions = this._getDbOptions();
        this._transaction = undefined;

        this.registerExtension("deleteDatabase");
    }

    /* IDbSqlOperations */

    query(sql: SqlQueryBuilder): Promise<SqlQueryResultSet> {
        const promise = (dbOrTx: any) =>
            new Promise<SqlQueryResultSet>((resolve, reject) => {
                const [text, params] = this.getSqlQuery(sql);
                dbOrTx.executeSql(text, params,
                    resultSet => resolve(this._extractRows(resultSet)),
                    err => {
                        reject(err);

                        // Signal transaction recovery immediately; do not fire
                        // remaining query callbacks.
                        return false;
                    });
            });

        if (this._transaction !== undefined) {
            return promise(this._transaction);
        }
        return this._getDatabase().then(db => promise(db));
    }

    /* IDbTransaction */

    transaction(action: (transactionContext: DbLocalContext) => Promise<any>): Promise<any> {
        return new Promise<void>((resolve, reject) => {
            this._getDatabase()
                .then(db => {
                    db.transaction(
                        tx => {
                            const ctx = new DbLocalContext(this.connectionInfo);
                            (ctx.adapter as SqLiteCordovaAdapter)._transaction = tx;
                            // Invokes error callback if action raised exception.
                            // Ignore returned promise because queries are executed on tx.
                            action(ctx)
                                .then(result => {
                                    (ctx.adapter as SqLiteCordovaAdapter)._transaction = undefined;
                                    return result;
                                })
                                .catch(err => {
                                    (ctx.adapter as SqLiteCordovaAdapter)._transaction = undefined;
                                    return Promise.reject(err);
                                });
                        },
                        err => {
                            // Transaction has been rolled back
                            reject(err);
                        },
                        () => {
                            // Transaction has been committed
                            resolve();
                        });
                })
                // Catch connection error
                .catch(error => reject(error));
        });
    }

    /* IDbLocalStore */

    close(): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            if (!this._db) {
                resolve();
            } else {
                this._db.close(
                    () => {
                        this._db = undefined;
                        resolve();
                    },
                    err => {
                        reject(err);
                    });
            }
        });
    }

    /* Extension methods */

    /**
     * Deletes the database specified by the connection info if it exists.
     * Returns a promise that is fullfilled if the database has been
     * deleted or didn't exist. The promise is rejected if an error occurs.
     */
    deleteDatabase(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            win.sqlitePlugin.deleteDatabase(this._dbOptions,
                () => resolve(),
                err => reject(err));
        });
    }

    /* Private */

    private _getDbOptions(): DbOptions {
        const options: DbOptions = {
            name: this.connectionInfo.connectionString,
            // Database location or iosDatabaseLocation is mandatory in openDatabase call.
            // If used on iOS, the iOS database location is now mandatory.
            // On other platforms, only 'default' is supported.
            location: "default",
        };
        const connOpts = this.connectionInfo.connectionOptions;
        if (connOpts) {
            if (connOpts.iosDatabaseLocation) {
                options.iosDatabaseLocation = connOpts.iosDatabaseLocation;
                options.location = undefined;
            } else if (connOpts.location) {
                options.location = connOpts.location;
            }
        }
        return options;
    }

    private _getDatabase(): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            if (this._db) {
                resolve(this._db);
                return;
            }
            win.sqlitePlugin.openDatabase(this._dbOptions,
                db => {
                    this._db = db;
                    // Create table for default key-value store
                    this.query(this.getStoreQuery("CREATE"))
                        .then(() => resolve(db))
                        .catch(error => reject(error));
                },
                err => reject(err));
        });
    }

    private _extractRows(resultSet: any): SqlQueryResultSet {
        const rows = [];
        const rowLen = resultSet.rows.length;
        for (let i = 0; i < rowLen; i++) {
            rows.push(resultSet.rows.item(i));
        }
        return { rows: rows };
    }
}
