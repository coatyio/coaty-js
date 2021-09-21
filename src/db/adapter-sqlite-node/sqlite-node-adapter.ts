/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import * as fs from "fs";
import * as path from "path";

import { Database, OPEN_CREATE, OPEN_READWRITE } from "sqlite3";

import { DbConnectionInfo } from "../..";
import { SqLiteBaseAdapter } from "../adapter-sqlite-base/sqlite-base-adapter";
import { DbLocalContext } from "../db-local-context";
import {
    IQueryIterator,
    QueryIterator,
    SqlQueryBuilder,
    SqlQueryOptions,
    SqlQueryResultSet,
} from "../db-operations";

/**
 * An SQLite 3 adapter for Node.js that uses the sqlite3 npm module.
 *
 * This adapter supports SQL operations, transactions, and local
 * store operations exposed by a local database context (of class `DbLocalContext`).
 * For the `ìquery` operation the `fetchSize` option is ignored.
 *
 * The SQLite database file path is specified as connection string in the
 * connection info object. If you specify an absolute or relative file path
 * ensure that the path exists and is accessible by the process, otherwise
 * the database file cannot be created or opened. The database file name should
 * include the extension, if desired, e.g. `"db/myservice.db"`.
 *
 * No further connection options are supported.
 *
 * As a prerequisite you need to install the npm module `sqlite3` as explained
 * here: [sqlite3](https://www.npmjs.com/package/sqlite3)
 */
export class SqLiteNodeAdapter extends SqLiteBaseAdapter {

    private _dbFile: string;
    private _db: Database;
    private _transactionDb: Database;

    constructor(connectionInfo: DbConnectionInfo) {
        super(connectionInfo);

        // Ensure database file path is absolute for caching.
        this._dbFile = path.resolve(connectionInfo.connectionString);

        this.registerExtension("deleteDatabase");
    }

    /* IDbSqlOperations */

    query(sql: SqlQueryBuilder): Promise<SqlQueryResultSet> {
        return this._getDatabase()
            .then(db =>
                new Promise<SqlQueryResultSet>((resolve, reject) => {
                    const [text, params] = this.getSqlQuery(sql);
                    db.all(text, params, (err, rows) =>
                        err ? reject(err) : resolve({ rows: rows }));
                }));
    }

    iquery(sql: SqlQueryBuilder, queryOptions?: SqlQueryOptions): Promise<IQueryIterator<any>> {
        return new Promise<IQueryIterator<any>>((resolve, reject) => {
            const iterator = new QueryIterator<any>();
            const donePromise = new Promise<[number, boolean]>((resolveDone, rejectDone) => {
                iterator.setStarter(() => {
                    this._getDatabase()
                        .then(db => {
                            const [text, params] = this.getSqlQuery(sql);
                            let resultIndex = 0;
                            let currentBatch: any[] = [];
                            let isBreakInvoked = false;
                            let iterationError;
                            db.each(
                                text,
                                params,
                                (err, row) => {
                                    if (iterationError || isBreakInvoked) {
                                        return;
                                    }

                                    if (err) {
                                        // Skip all pending rows
                                        iterationError = err;
                                        rejectDone(err);
                                        return;
                                    }

                                    let dontBreak: void | boolean = true;
                                    try {
                                        // Yield a single item
                                        if (iterator.forEachAction) {
                                            dontBreak = iterator.forEachAction(row, resultIndex);
                                        }
                                        // Yield current batch if enough items have accumulated
                                        if (iterator.forBatchAction) {
                                            currentBatch.push(row);
                                            if (iterator.batchSize > 0 && currentBatch.length === iterator.batchSize) {
                                                dontBreak = iterator.forBatchAction(currentBatch);
                                                currentBatch = [];
                                            }
                                        }
                                    } catch (error) {
                                        // Skip all pending rows
                                        iterationError = error;
                                        rejectDone(error);
                                        return;
                                    }

                                    resultIndex++;

                                    if (dontBreak === false) {
                                        // Skip all pending rows
                                        isBreakInvoked = true;
                                    }
                                },
                                (err, count) => {
                                    if (err) {
                                        rejectDone(err);
                                        return;
                                    }

                                    // Yield last batch if needed.
                                    // If query yields no results at all, also 
                                    // submit the current (empty) batch!
                                    let batchError;
                                    if (currentBatch.length > 0 || resultIndex === 0) {
                                        try {
                                            if (iterator.forBatchAction(currentBatch) === false) {
                                                isBreakInvoked = true;
                                            }
                                        } catch (error) {
                                            batchError = error;
                                        }
                                    }

                                    if (batchError) {
                                        rejectDone(batchError);
                                    } else {
                                        resolveDone([resultIndex, isBreakInvoked]);
                                    }
                                });
                        })
                        // Catch connection error
                        .catch(error => rejectDone(error));
                });
            });
            iterator.setDonePromise(donePromise);
            resolve(iterator);
        });
    }

    /* IDbTransaction */

    transaction(action: (transactionContext: DbLocalContext) => Promise<any>): Promise<any> {
        return new Promise<void>((resolve, reject) => {
            const transact = (db: Database) => {
                Promise.resolve()
                    .then(() => {
                        const ctx = new DbLocalContext(this.connectionInfo);
                        (ctx.adapter as SqLiteNodeAdapter)._transactionDb = db;
                        return action(ctx)
                            .then(result => {
                                (ctx.adapter as SqLiteNodeAdapter)._transactionDb = undefined;
                                return result;
                            })
                            .catch(err => {
                                (ctx.adapter as SqLiteNodeAdapter)._transactionDb = undefined;
                                return Promise.reject(err);
                            });
                    })
                    .then(() => {
                        this._commitTransaction(
                            db,
                            () => resolve(),
                            error => reject(error));
                    })
                    .catch(err => {
                        this._rollbackTransaction(
                            db,
                            err,
                            error => reject(error));
                    });
            };

            this._getDatabase()
                .then(db => {
                    this._beginTransaction(
                        db,
                        database => transact(database),
                        error => reject(error));
                })
                // Catch connection or nested transaction error
                .catch(error => reject(error));
        });
    }

    /* IDbLocalStore */

    close(): Promise<any> {
        return new Promise<void>((resolve, reject) => {
            if (!this._db) {
                resolve();
            } else {
                this._db.close(err => {
                    if (err) {
                        reject(err);
                    } else {
                        this._db = undefined;
                        resolve();
                    }
                });
            }
        });
    }

    /* Extension methods */

    /**
     * Deletes the given database file if it exists.
     * Returns a promise that is fullfilled if the database file has been
     * deleted or didn't exist. The promise is rejected if an error occurs.
     *
     * Note that this operation cannot be executed while a database is open,
     * i.e. in use, because the database file is locked.
     *
     * @param name the file path of the database to delete
     */
    deleteDatabase(file: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const filePath = path.resolve(file);
            if (!fs.existsSync(filePath)) {
                resolve();
                return;
            }
            fs.unlink(filePath, err => {
                err ? reject(err) : resolve();
            });
        });
    }

    /* Transaction Management */

    private _beginTransaction(
        db: Database,
        action: (db: Database) => void,
        errorAction: (error: Error) => void) {
        if (this._transactionDb !== undefined) {
            throw new Error("Nested transactions (savepoints) are not supported.");
        }

        db.run("BEGIN", err => {
            if (err) {
                this._rollbackTransaction(db, err, errorAction);
            } else {
                action(db);
            }
        });
    }

    private _commitTransaction(
        db: Database,
        action: () => void,
        errorAction: (error: Error) => void) {
        db.run("COMMIT", err => {
            if (err) {
                errorAction(err);
            } else {
                action();
            }
        });
    }

    private _rollbackTransaction(
        db: Database,
        error: Error,
        errorAction: (error: Error) => void) {
        db.run("ROLLBACK", err => {
            errorAction(error);
        });
    }

    /* Database access */

    private _getDatabase(): Promise<Database> {
        return new Promise<Database>((resolve, reject) => {
            if (this._transactionDb) {
                resolve(this._transactionDb);
                return;
            }
            if (this._db) {
                resolve(this._db);
                return;
            }
            /* tslint:disable-next-line:no-bitwise */
            const db = new Database(this._dbFile, OPEN_READWRITE | OPEN_CREATE);
            db.once("open", () => {
                this._db = db;
                // Create table for default key-value store
                this.query(this.getStoreQuery("CREATE"))
                    .then(() => resolve(db))
                    .catch(error => reject(error));
            }).once("error", err => {
                reject(err);
            });
        });
    }

}
