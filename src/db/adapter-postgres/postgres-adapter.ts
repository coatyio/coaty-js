/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { Pool, PoolClient, PoolConfig, QueryResult, types } from "pg";
import { parse } from "pg-connection-string";

import { Async, CoatyObject, DbConnectionInfo, filterOp, ObjectFilterOperator, ObjectMatcher, Runtime, Uuid } from "../..";
import { DbAdapterBase } from "../db-adapter";
import { DbContext } from "../db-context";
import {
    AggregateProperties,
    DbJoinCondition,
    DbObjectFilter,
    IQueryIterator,
    QueryIterator,
    SqlQueryBuilder,
    SqlQueryOptions,
    SqlQueryResultSet,
} from "../db-operations";
import { AggregateOp } from "../db-operators";

/* Custom Type Parsers */

// The node-pg type parser returns bigint (int8, 64-bit integer with OID 20) as
// string. Since we don't support bigints and SELECT COUNT() returns bigint we
// always parse the bigint string as decimal integer.
types.setTypeParser(20, value => parseInt(value, 10));

/**
 * Provides access to a PostgreSQL 9.5 (or later) database server. Supports
 * connection pooling and query iteration. Supports SQL operations
 * as well as NoSQL operations using the JSONB data type.
 *
 * The Postgres connection string has the following general form:
 * `postgres://<user>:<password>@<hostname>:<port>/<database>?ssl=true&application_name=PGAPPNAME&fallback_application_name=false`
 *
 * PostgreSQL supports the following connection options (with the given default values):
 * ```
 * {
 *    // database host
 *    host: process.env.PGHOST || 'localhost',
 *
 *    // database user's name
 *    user: process.env.PGUSER || process.env.USER
 * 
 *    // name of database to connect
 *    database: process.env.PGDATABASE || process.env.USER
 *
 *    // database user's password
 *    password: process.env.PGPASSWORD || null,
 *
 *    // database port
 *    port: process.env.PGPORT || 5432,
 *
 *    // number of rows to return at a time from a prepared statement's
 *    // portal. 0 will return all rows at once
 *    rows: 0,
 *
 *    // binary result mode
 *    binary: false,
 *
 *    client_encoding: "",
 *
 *    ssl: false,
 * 
 *    // TCP keep alive: this should help with backends incorrectly considering 
 *    // idle clients to be dead and prematurely disconnecting them.
 *    keepAlive: false,
 *
 *    application_name: undefined,
 *
 *    fallback_application_name: undefined,
 *
 *    parseInputDatesAsUTC: false
 *
 *    // Pool Options (see also https://github.com/brianc/node-pg-pool and https://github.com/coopernurse/node-pool)
 *
 *    // maximum number of resources to create at any given time optional (default=1)
 *    max: 10
 *
 *    // minimum number of resources to keep in pool at any given time
 *    // if this is set >= max, the pool will silently set the min
 *    // to factory.max - 1 (Note: min==max case is expected to change in v3 release)
 *    // optional (default=0)
 *    min: 0
 *
 *    // max milliseconds a resource can go unused before it should be destroyed
 *    // (default 30000)
 *    idleTimeoutMillis: 30000
 * 
 *    // return an error after given milliseconds if connection could not be established
 *    connectionTimeoutMillis: 1000
 *
 *    // If true, logs pool activities to console; can also be a function.
 *    // Note: true doesn't work properly in a Node.js process, use a function instead.
 *    log: true/false or function(msg: string, level: string) => {}
 *
 * }
 * ```
 * 
 * This adapter supports the following adapter configuration options:
 * ```
 * {
 *    // The default chunk size of chunking fetch operations such as findObjects
 *    // or iquery (default 100). This value can be overridden in individual
 *    // fetch operations by specifying the DbObjectFilter.fetchSize property.
 *    defaultFetchSize: 100
 * }
 * ```
 * 
 * This adapter supports the following extensions for creating/deleting users and databases dynamically:
 * ```
 * createUser
 * deleteUser
 * initDatabase
 * createDatabase
 * deleteDatabase
 * ```
 * Note that these operations must be performed on a database context with administrative privileges, i.e.
 * the connection info must specify a user/pwd with administration rights.
 */
export class PostgresAdapter extends DbAdapterBase {

    // Long-lived pool objects used throughout the lifetime of the application
    private static readonly PG_POOLS = new Map<DbConnectionInfo, PoolItem>();

    private static readonly COLLECTION_SCHEMA = "collections";

    // Default and minimum fetch sizes for SQL cursor.
    private static readonly DEFAULT_FETCH_SIZE = 100;
    private static readonly MINIMUM_FETCH_SIZE = 10;

    // Client connection used for queries within the current transaction.
    // Transactions within PostgreSQL must be scoped to a single client. The
    // value is undefined if this context is not associated with a transaction.
    private _transactionClient: PooledClient;

    constructor(connectionInfo: DbConnectionInfo) {
        super(connectionInfo);

        this.registerExtension("initDatabase");
        this.registerExtension("createDatabase");
        this.registerExtension("deleteDatabase");
        this.registerExtension("createUser");
        this.registerExtension("deleteUser");
    }

    /* IDbNoSqlOperations */

    addCollection(name: string): Promise<void> {
        const tableId = this._getTableId(name);
        const indexId = asIdentifier(name + "_object_idx");

        // Use optimized and smaller "jsonb_path_ops" GIN index supporting only
        // the JSONB @>, @@, and @? operators during WHERE filtering, but
        // performing better when searching data and having a smaller on-disk
        // size than the default GIN operator index "jsonb_ops" on JSONB. Note
        // that for PostgreSQL database server versions less than 12 only @>
        // containment operations are optimized by this index (as jsonpath
        // operators @@ and @? did not exist yet). In PG server version 12 all
        // the JSONB containment, existence, and comparison operations are
        // expressed with the operators @>, @@, and @? to make efficient use of
        // the "jsonb_path_ops" index. However, in this version GIN indexing
        // only supports a subset of uses of @@ and @! operators (e.g. only
        // jsonpath filter expressions like equality comparison (==), but not
        // less-than or greather-than comparison). Starting with PG server
        // version 13, all jsonpath filter expressions make use of GIN indexing.
        //
        // Catch any unique_violation exceptions (error code 23505) due to
        // concurrent execution of CREATE SCHEMA and do nothing in this case.
        // (see
        // https://stackoverflow.com/questions/29900845/create-schema-if-not-exists-raises-duplicate-key-error)
        const sql = `do $$
                    BEGIN
                    CREATE SCHEMA IF NOT EXISTS ${PostgresAdapter.COLLECTION_SCHEMA};
                    EXCEPTION when unique_violation then
                    END;
                    $$ language 'plpgsql';
                    CREATE TABLE IF NOT EXISTS ${tableId} (
                       objectid uuid PRIMARY KEY,
                       object jsonb NOT NULL
                     );
                    CREATE INDEX IF NOT EXISTS ${indexId}
                       ON ${tableId} USING GIN(object jsonb_path_ops);`;

        /* tslint:disable-next-line:no-empty */
        return this._queryPooled(sql).then(result => { });
    }

    removeCollection(name: string): Promise<void> {
        const sql = `DROP TABLE IF EXISTS ${this._getTableId(name)};`;

        /* tslint:disable-next-line:no-empty */
        return this._queryPooled(sql).then(result => { });
    }

    clearCollection(name: string): Promise<void> {
        const sql = `TRUNCATE TABLE ${this._getTableId(name)};`;

        /* tslint:disable-next-line:no-empty */
        return this._queryPooled(sql).then(result => { });
    }

    insertObjects(
        collectionName: string,
        objects: CoatyObject | CoatyObject[],
        shouldReplaceExisting: boolean): Promise<Uuid[]> {
        const tableId = this._getTableId(collectionName);
        const text = `INSERT INTO ${tableId} (objectid, object)
                          SELECT (value->>'objectId')::uuid, value FROM jsonb_array_elements($1)
                          ON CONFLICT (objectid) ${shouldReplaceExisting ?
                "DO UPDATE SET object = EXCLUDED.object" :
                "DO NOTHING"}
                          RETURNING objectid;`;
        return this._queryOnObjects(objects, text);
    }

    updateObjects(collectionName: string, objects: CoatyObject | CoatyObject[]): Promise<Uuid[]> {
        const tableId = this._getTableId(collectionName);
        const text = `UPDATE ${tableId} 
                          SET object = objs.object
                          FROM (SELECT (value->>'objectId')::uuid as objectid, value as object FROM jsonb_array_elements($1)) as objs
                          WHERE ${tableId}.objectid = objs.objectid
                          RETURNING ${tableId}.objectid;`;
        return this._queryOnObjects(objects, text);
    }

    updateObjectProperty(
        collectionName: string,
        objectIds: Uuid | Uuid[],
        property: string,
        value: any,
        shouldCreateMissing = true): Promise<any> {
        const tableId = this._getTableId(collectionName);
        const values = this._getQueryValuesOnObjects(objectIds);

        if (values.length === 0) {
            return Promise.resolve();
        }

        values.push([property]);

        let text: string;
        if (value !== undefined) {
            const createMissing = shouldCreateMissing ? "true" : "false";
            text = `UPDATE ${tableId} 
                        SET object = jsonb_set(
                            object,
                            $2,
                            $3::jsonb,
                            ${createMissing})
                        WHERE ${tableId}.objectid in (SELECT value::uuid FROM jsonb_array_elements_text($1));`;
            values.push(JSON.stringify(value));
        } else {
            // Delete property value pair from object
            text = `UPDATE ${tableId} 
                        SET object = object - $2
                        WHERE ${tableId}.objectid in (SELECT value::uuid FROM jsonb_array_elements_text($1));`;
        }

        return this._queryPooled(text, values);
    }

    deleteObjectsById(collectionName: string, objectIds: Uuid | Uuid[]): Promise<Uuid[]> {
        const tableId = this._getTableId(collectionName);
        const text = `DELETE FROM ${tableId}
                          WHERE objectid in (SELECT value::uuid FROM jsonb_array_elements_text($1))
                          RETURNING objectid;`;
        return this._queryOnObjects(objectIds, text);
    }

    deleteObjects(collectionName: string, filter?: DbObjectFilter): Promise<number> {
        const createQuery: CreateQuery = info => {
            const tableId = this._getTableId(collectionName);
            const [whereClause, whereParams] = this._getWhereClauseAndParams(filter, this._supportsJsonpath(info));
            const text = `DELETE FROM ${tableId}
                              ${whereClause}
                              RETURNING objectid;`;
            return [text, whereParams];
        };
        return this._queryPooledLazy(createQuery).then(result => result.rows.length);
    }

    findObjectById<T extends CoatyObject>(collectionName: string, id: string, isExternalId = false): Promise<T> {
        const createQuery: CreateQuery = info => {
            const tableId = this._getTableId(collectionName);
            let text: string;
            let values: any[];
            if (isExternalId) {
                const filter: DbObjectFilter = { conditions: ["externalId", filterOp.equals(id)] };
                const [whereClause, whereParams] = this._getWhereClauseAndParams(filter, this._supportsJsonpath(info));
                text = `SELECT object FROM ${tableId} ${whereClause};`;
                values = whereParams;
            } else {
                text = `SELECT object FROM ${tableId} WHERE objectid = $1;`;
                values = [id];
            }
            return [text, values];
        };
        return this._queryPooledLazy(createQuery).then(result =>
            result.rows.length === 0 ? undefined : result.rows[0].object);
    }

    findObjects<T extends CoatyObject>(
        collectionName: string,
        filter?: DbObjectFilter,
        joinConditions?: DbJoinCondition | DbJoinCondition[]): Promise<IQueryIterator<T>> {
        const fetchInChunks = filter && filter.shouldFetchInChunks;
        const rowField = "object";
        const createQuery: CreateQuery = info => {
            const tableId = this._getTableId(collectionName);
            const [whereClause, whereParams] = this._getWhereClauseAndParams(filter, this._supportsJsonpath(info), fetchInChunks);
            const orderBy = this._getOrderByClause(filter);
            const limit = !fetchInChunks && filter ? (filter.take !== undefined ? Math.max(0, filter.take) : "ALL") : "ALL";
            const offset = !fetchInChunks && filter ? (filter.skip !== undefined ? Math.max(0, filter.skip) : 0) : 0;
            const text = `SELECT ${rowField} FROM ${tableId}
                              ${whereClause}
                              ${orderBy} LIMIT ${limit} OFFSET ${offset}`;
            const query = this._getJoinQuery(tableId, text, rowField, joinConditions, filter);
            return fetchInChunks ? [query] : [query, whereParams];
        };
        if (fetchInChunks) {
            const fetchSize = this._getFetchSize(filter && filter.fetchSize);
            return this._fetchInChunks<T>(createQuery, rowField, fetchSize, filter && filter.take, filter && filter.skip);
        } else {
            return this._fetchOnce<T>(createQuery, rowField);
        }
    }

    countObjects(collectionName: string, filter?: DbObjectFilter): Promise<number> {
        const createQuery: CreateQuery = info => {
            const tableId = this._getTableId(collectionName);
            const [whereClause, whereParams] = this._getWhereClauseAndParams(filter, this._supportsJsonpath(info));
            const text = `SELECT COUNT(objectid) FROM ${tableId} ${whereClause};`;
            return [text, whereParams];
        };
        return this._queryPooledLazy(createQuery).then(result => result.rows[0].count);
    }

    aggregateObjects(
        collectionName: string,
        aggregateProps: AggregateProperties,
        aggregateOp: AggregateOp,
        filter?: DbObjectFilter): Promise<number | boolean> {
        const createQuery: CreateQuery = info => {
            const propsArray = ObjectMatcher.getFilterProperties(aggregateProps);
            const tableId = this._getTableId(collectionName);
            const [aggFunc, aggType] = this._getAggregateParams(aggregateOp);
            const [whereClause, whereParams] = this._getWhereClauseAndParams(filter, this._supportsJsonpath(info));
            const text = `SELECT ${aggFunc}((${this._getObjectIndexer(propsArray, true)})::${aggType}) AS result
                              FROM ${tableId} ${whereClause};`;
            return [text, whereParams];
        };
        return this._queryPooledLazy(createQuery).then(result =>
            // If no rows have been selected by where clause, query returns SQL NULL
            /* tslint:disable-next-line:no-null-keyword */
            result.rows[0].result === null ? undefined : result.rows[0].result);
    }

    /* IDbSqlOperations */

    query(sql: SqlQueryBuilder): Promise<SqlQueryResultSet> {
        const [text, params] = sql("$", true, 0, id => asIdentifier(id), lit => asLiteral(lit));
        return this._queryPooled(text, params).then(result => result);
    }

    iquery(sql: SqlQueryBuilder, queryOptions?: SqlQueryOptions): Promise<IQueryIterator<any>> {
        const [text] = sql("$", true, 0, id => asIdentifier(id), lit => asLiteral(lit), true);
        const fetchSize = this._getFetchSize(queryOptions && queryOptions.fetchSize);
        return this._fetchInChunks<any>(
            () => [text],
            undefined,
            fetchSize,
            queryOptions && queryOptions.take,
            queryOptions && queryOptions.skip);
    }

    /* IDbTransaction */

    transaction<T>(action: (transactionContext: DbContext) => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const transact = (client: PooledClient) => {
                Promise.resolve()
                    .then(() => {
                        const ctx = new DbContext(this.connectionInfo);
                        (ctx.adapter as PostgresAdapter)._transactionClient = client;
                        return action(ctx)
                            .then(result => {
                                (ctx.adapter as PostgresAdapter)._transactionClient = undefined;
                                return result;
                            })
                            .catch(err => {
                                (ctx.adapter as PostgresAdapter)._transactionClient = undefined;
                                return Promise.reject(err);
                            });
                    })
                    .then(result => {
                        this._commitTransaction(
                            client,
                            () => resolve(result),
                            error => reject(error));
                    })
                    .catch(err => {
                        this._rollbackTransaction(
                            client,
                            err,
                            error => reject(error));
                    });
            };

            this._getPooledClient(true)
                .then(client => {
                    this._beginTransaction(
                        client,
                        clnt => transact(clnt),
                        error => reject(error));
                })
                // Catch connection or nested transaction error
                .catch(error => reject(error));
        });
    }

    /* Extension methods */

    /**
     * Initialize a database from the given connection info. The database and
     * database user is created if it not yet exists. Then, collections are
     * added if needed from the given collection names. Optionally, the
     * collections can be cleared initially. This can be useful in test
     * scenarios where collection data from a previous run should be removed.
     *
     * Returns a promise that is resolved if the database and collections have
     * been created successfully, and rejected if an error occurs.
     *
     * Note that the database context on which this extension method is invoked
     * must connect to the `postgres` database with superuser admin permissions.
     *
     * @param dbInfo connection info for database operations
     * @param collections an array of database collection names
     * @param clearCollections determines whether collection data should be
     * cleared initially
     */
    initDatabase(dbInfo: DbConnectionInfo, collections?: string[], clearCollections: boolean = false) {
        const dbc = new DbContext(dbInfo, PostgresAdapter);
        const dbConfig = this._getPoolOptions(dbInfo);

        return this.createUser(dbConfig.user, dbConfig.password as string)
            .then(() => this.createDatabase(dbConfig.database, dbConfig.user))

            // Add collections if they do not exist yet
            .then(() => Async.inSeries(collections, coll => dbc.addCollection(coll)))

            // If requested, clear all collection data initially
            .then(() => clearCollections && Async.inSeries(collections, coll => dbc.clearCollection(coll)));
    }

    /**
     * Create a new database of the given name if it doesn't already exist.
     *
     * Returns a promise that if fulfilled yields `true` if the database has
     * been created, `false` otherwise. The promise is rejected if an error
     * occurs. To create a database the specified owner must be a superuser. To
     * issue this command, the client should connect to the `postgres` database.
     *
     * Note that this operation cannot be executed inside a transaction block.
     *
     * @param name the name of the database to create
     * @param owner the owner (superuser) of the database, see `createUser`
     * extension
     * @param comment a comment to associate with the created database
     */
    createDatabase(name: string, owner: string, comment?: string): Promise<boolean> {
        const dbId = asIdentifier(name);

        let sql = `SELECT true FROM pg_database WHERE datname = ${asLiteral(name)};`;

        return this._queryPooled(sql).then(result => {
            if (result.rows.length === 1) {
                return false;
            }

            // UTF8 encoding is required for tables with JSONB column data type.
            // Note: CREATE DATABASE cannot be executed inside a transaction block. 
            sql = `CREATE DATABASE ${dbId}
                       WITH OWNER = ${asIdentifier(owner)}
                       ENCODING = 'UTF8';`;

            return this._queryPooled(sql).then(() => {
                if (comment) {
                    sql = `COMMENT ON DATABASE ${dbId} IS ${asLiteral(comment)};`;

                    /* tslint:disable-next-line:no-empty */
                    return this._queryPooled(sql).then(res => true);
                }
                return true;
            });
        });
    }

    /**
     * Drops the given database if it exists.
     *
     * Returns a promise that is fullfilled if the database has been deleted or
     * didn't exist. The promise is rejected if an error occurs. Note that an
     * error occurs if you try to delete a database that has active client
     * connections. This command can only be executed by the database owner. To
     * issue this command, the client should connect to the `postgres` database.
     *
     * Note that this operation cannot be executed inside a transaction block.
     *
     * @param name the name of the database to delete
     */
    deleteDatabase(name: string): Promise<void> {
        const sql = `DROP DATABASE IF EXISTS ${asIdentifier(name)};`;

        /* tslint:disable-next-line:no-empty */
        return this._queryPooled(sql).then(result => { });
    }

    /**
     * Create a user (role) with the given name if it doesn't already exist.
     *
     * Returns a promise that is fullfilled if the user has been created or
     * already exists. The promise is rejected if an error occurs. You must have
     * CREATEROLE privilege or be a database superuser to use this command. To
     * issue this command, the client should connect to the `postgres` database.
     *
     * @param name the name of the user to create
     * @param password the plain or md5 encoded password
     * @param comment a comment on the user
     */
    createUser(name: string, password: string, comment?: string): Promise<boolean> {
        const userId = asIdentifier(name);

        let sql = `SELECT true FROM pg_roles WHERE rolname = ${asLiteral(name)};`;

        return this._queryPooled(sql).then(result => {
            if (result.rows.length === 1) {
                return false;
            }

            sql = `CREATE ROLE ${userId} LOGIN
                       PASSWORD ${asLiteral(password)}
                       NOSUPERUSER INHERIT CREATEDB NOCREATEROLE NOREPLICATION;`;

            return this._queryPooled(sql).then(() => {
                if (comment) {
                    const cSql = `COMMENT ON ROLE ${userId} IS ${asLiteral(comment)};`;

                    /* tslint:disable-next-line:no-empty */
                    return this._queryPooled(cSql).then(res => true);
                }
                return true;
            });
        });
    }

    /**
     * Drop the given user (role).
     *
     * Returns a promise that is fullfilled if the user has been deleted. The
     * promise is rejected if an error occurs. You must have CREATEROLE
     * privilege or be a database superuser to use this command. To issue this
     * command, the client should connect to the `postgres` database.
     *
     * @param name the name of the user to remove
     */
    deleteUser(name: string): Promise<void> {
        const sql = `DROP ROLE IF EXISTS ${asIdentifier(name)};`;

        /* tslint:disable-next-line:no-empty */
        return this._queryPooled(sql).then(result => { });
    }

    /* Query Builders */

    private _queryOnObjects(objects: CoatyObject | CoatyObject[] | Uuid | Uuid[], text: string): Promise<Uuid[]> {
        const values = this._getQueryValuesOnObjects(objects);
        if (values.length === 0) {
            return Promise.resolve([]);
        }
        return this._queryPooled(text, values).then(result => result.rows.map(row => row.objectid));
    }

    private _getQueryValuesOnObjects(objects: CoatyObject | CoatyObject[] | Uuid | Uuid[]): any[] {
        if (Array.isArray(objects)) {
            return [JSON.stringify(objects)];
        }
        return [JSON.stringify([objects])];
    }

    private _getWhereClauseAndParams(filter: DbObjectFilter, supportsJsonpath: boolean, embedParams = false): [string, any[]] {
        if (!filter || !filter.conditions) {
            return ["", []];
        }
        if (Array.isArray(filter.conditions)) {
            filter.conditions = { and: [filter.conditions] };
        }

        const combineAnd = !filter.conditions.or;
        const clauses: string[] = [];
        const params = [];
        const contains: Array<[string[], any]> = [];
        const notContains: Array<[string[], any]> = [];
        let pi = 1;
        let p1;
        let p2;

        const para = (param: any, index: number, isJsonpathFilterExpression = false) => {
            // jsonpath filter expressions cannot refer to query parameter variables; values must always be embedded.
            return isJsonpathFilterExpression ? asJsonpathLiteral(param, true) : (embedParams ? asLiteral(param) : `$${index}`);
        };

        const checkExistence = (propsArray: string[], isNegated = false) => {
            if (supportsJsonpath) {
                clauses.push(`(object @@ '${isNegated ? "!" : ""}exists(${this._getJsonpathKeys(propsArray)})')`);
            } else {
                if (propsArray.length === 0) {
                    if (isNegated) {
                        clauses.push(`(false)`);
                    }
                    return;
                }
                let clause = `object ? ${asLiteral(propsArray[0])}`;
                for (let ip = 1; ip < propsArray.length; ip++) {
                    clause += ` AND ${this._getObjectIndexer(propsArray.slice(0, ip))} ? ${asLiteral(propsArray[ip])}`;
                }
                clauses.push(`(${isNegated ? "NOT (" : ""}${clause}${isNegated ? ")" : ""})`);
            }
        };

        const checkContainments = (containment: Array<[string[], any]>, isNegated = false) => {
            for (const [propsArray, opnd] of containment) {
                const obj = Object.create(null);
                let subobj = obj;
                propsArray.forEach((prop, index) => {
                    if (index === propsArray.length - 1) {
                        subobj[prop] = opnd;
                        return;
                    }
                    subobj[prop] = Object.create(null);
                    subobj = subobj[prop];
                });
                p1 = JSON.stringify(obj);
                clauses.push(`(${isNegated ? "NOT " : ""}object @> ${para(p1, pi++)}::jsonb)`);
                params.push(p1);
            }
        };

        for (const cond of (combineAnd ? filter.conditions.and : filter.conditions.or)) {
            const [props, expr] = cond;
            const propsArray = ObjectMatcher.getFilterProperties(props);
            const op = expr[0];
            const opnd1 = expr[1];
            const opnd2 = expr[2];

            switch (op) {
                case ObjectFilterOperator.LessThan:
                    p1 = JSON.stringify(opnd1);
                    if (supportsJsonpath) {
                        clauses.push(`(object @@ '${this._getJsonpathKeys(propsArray)} < ${para(p1, pi, true)}')`);
                    } else {
                        clauses.push(`(${this._getObjectIndexer(propsArray)} < ${para(p1, pi++)}::jsonb)`);
                        params.push(p1);
                    }
                    break;
                case ObjectFilterOperator.LessThanOrEqual:
                    p1 = JSON.stringify(opnd1);
                    if (supportsJsonpath) {
                        clauses.push(`(object @@ '${this._getJsonpathKeys(propsArray)} <= ${para(p1, pi, true)}')`);
                    } else {
                        clauses.push(`(${this._getObjectIndexer(propsArray)} <= ${para(p1, pi++)}::jsonb)`);
                        params.push(p1);
                    }
                    break;
                case ObjectFilterOperator.GreaterThan:
                    p1 = JSON.stringify(opnd1);
                    if (supportsJsonpath) {
                        clauses.push(`(object @@ '${this._getJsonpathKeys(propsArray)} > ${para(p1, pi, true)}')`);
                    } else {
                        clauses.push(`(${this._getObjectIndexer(propsArray)} > ${para(p1, pi++)}::jsonb)`);
                        params.push(p1);
                    }
                    break;
                case ObjectFilterOperator.GreaterThanOrEqual:
                    p1 = JSON.stringify(opnd1);
                    if (supportsJsonpath) {
                        clauses.push(`(object @@ '${this._getJsonpathKeys(propsArray)} >= ${para(p1, pi, true)}')`);
                    } else {
                        clauses.push(`(${this._getObjectIndexer(propsArray)} >= ${para(p1, pi++)}::jsonb)`);
                        params.push(p1);
                    }
                    break;
                case ObjectFilterOperator.Between:
                    p1 = JSON.stringify(opnd1);
                    p2 = JSON.stringify(opnd2);
                    if (supportsJsonpath) {
                        // String comparison assumes identical lexical ordering used in JavaScript and PG server.
                        const swapOpnds = ObjectMatcher.matchesFilter({ value: opnd1 } as any as CoatyObject,
                            { conditions: ["value", filterOp.greaterThan(opnd2)] });
                        if (swapOpnds) {
                            const ptmp = p1;
                            p1 = p2;
                            p2 = ptmp;
                        }
                        clauses.push(`(object @? '${this._getJsonpathKeys(propsArray)} ? (@ >= ${para(p1, pi, true)} && @ <= ${para(p2, pi + 1, true)})')`);
                    } else {
                        clauses.push(`(${this._getObjectIndexer(propsArray)} BETWEEN SYMMETRIC ${para(p1, pi)}::jsonb AND ${para(p2, pi + 1)}::jsonb)`);
                        pi += 2;
                        params.push(p1);
                        params.push(p2);
                    }
                    break;
                case ObjectFilterOperator.NotBetween:
                    p1 = JSON.stringify(opnd1);
                    p2 = JSON.stringify(opnd2);
                    if (supportsJsonpath) {
                        // String comparison assumes identical lexical ordering used in JavaScript and PG server.
                        const swapOpnds = ObjectMatcher.matchesFilter({ value: opnd1 } as any as CoatyObject,
                            { conditions: ["value", filterOp.greaterThan(opnd2)] });
                        if (swapOpnds) {
                            const ptmp = p1;
                            p1 = p2;
                            p2 = ptmp;
                        }
                        clauses.push(`(object @? '${this._getJsonpathKeys(propsArray)} ? (@ < ${para(p1, pi, true)} || @ > ${para(p2, pi + 1, true)})')`);
                    } else {
                        clauses.push(`(${this._getObjectIndexer(propsArray)} NOT BETWEEN SYMMETRIC ${para(p1, pi)}::jsonb AND ${para(p2, pi + 1)}::jsonb)`);
                        pi += 2;
                        params.push(p1);
                        params.push(p2);
                    }
                    break;
                case ObjectFilterOperator.Like:
                    p1 = opnd1;
                    if (supportsJsonpath) {
                        const likeRegex = like2PosixRegex(p1);
                        clauses.push(`(object @@ '${this._getJsonpathKeys(propsArray)} like_regex ${para(JSON.stringify(likeRegex), pi, true)}')`);
                    } else {
                        clauses.push(`(${this._getObjectIndexer(propsArray, true)} LIKE ${para(p1, pi++)})`);
                        params.push(p1);
                    }
                    break;
                case ObjectFilterOperator.Equals:
                    if (opnd1 === undefined) {
                        checkExistence(propsArray, true);
                    } else {
                        if (typeof opnd1 === "number" ||
                            typeof opnd1 === "string" ||
                            typeof opnd1 === "boolean" ||
                            !opnd1) {
                            // Using @> or @@ == operators for primitive types is faster than
                            // using -> operator because GIN index jsonb_path_ops is applied.
                            if (supportsJsonpath) {
                                // Comparison of JSON primitive values by jsonpath operator
                                // @@ with filter expression == is faster than using @>
                                // although both are using the defined GIN index.
                                p1 = JSON.stringify(opnd1);
                                clauses.push(`(object @@ '${this._getJsonpathKeys(propsArray)} == ${para(p1, pi, true)}')`);
                            } else {
                                contains.push([propsArray, opnd1]);
                            }
                        } else {
                            p1 = JSON.stringify(opnd1);
                            clauses.push(`(${this._getObjectIndexer(propsArray)} = ${para(p1, pi++)}::jsonb)`);
                            params.push(p1);
                        }
                    }
                    break;
                case ObjectFilterOperator.NotEquals:
                    if (opnd1 === undefined) {
                        checkExistence(propsArray, false);
                    } else {
                        if (typeof opnd1 === "number" ||
                            typeof opnd1 === "string" ||
                            typeof opnd1 === "boolean" ||
                            !opnd1) {
                            // Using NOT @> or @@ != operators for primitive types is faster than
                            // using -> operator because GIN index jsonb_path_ops is applied.
                            if (supportsJsonpath) {
                                // Comparison of JSON primitive values by jsonpath operator
                                // @@ with filter expression != is faster than using NOT @>
                                // although both are using the defined GIN index.
                                p1 = JSON.stringify(opnd1);
                                clauses.push(`(object @@ '${this._getJsonpathKeys(propsArray)} != ${para(p1, pi, true)}')`);
                            } else {
                                notContains.push([propsArray, opnd1]);
                            }
                        } else {
                            p1 = JSON.stringify(opnd1);
                            clauses.push(`(${this._getObjectIndexer(propsArray)} <> ${para(p1, pi++)}::jsonb)`);
                            params.push(p1);
                        }
                    }
                    break;
                case ObjectFilterOperator.Exists:
                    checkExistence(propsArray, false);
                    break;
                case ObjectFilterOperator.NotExists:
                    checkExistence(propsArray, true);
                    break;
                case ObjectFilterOperator.Contains:
                    contains.push([propsArray, opnd1]);
                    break;
                case ObjectFilterOperator.NotContains:
                    notContains.push([propsArray, opnd1]);
                    break;
                case ObjectFilterOperator.In:
                case ObjectFilterOperator.NotIn:
                    if (!Array.isArray(opnd1)) {
                        throw new TypeError(`operand for filter operator ${op} must be an array`);
                    }
                    const sqlOp = op === ObjectFilterOperator.In ? "in" : "not in";
                    p1 = JSON.stringify(opnd1);
                    clauses.push(`(${this._getObjectIndexer(propsArray)} ${sqlOp} (SELECT value FROM jsonb_array_elements(${para(p1, pi++)}::jsonb)))`);
                    params.push(p1);
                    break;
                default:
                    throw new TypeError(`unknown filter operator: ${op}`);
            }
        }

        checkContainments(notContains, true);
        checkContainments(contains, false);

        if (clauses.length === 0) {
            return ["", []];
        }
        return ["WHERE " + clauses.join(combineAnd ? " AND " : " OR "), params];
    }

    private _getOrderByClause(filter: DbObjectFilter, tableId?: string) {
        if (!filter || !filter.orderByProperties) {
            return "";
        }
        tableId = tableId ? tableId + "." : "";

        return "ORDER BY " + filter.orderByProperties
            .map((order, i) => `${tableId}${this._getObjectIndexer(ObjectMatcher.getFilterProperties(order[0]))} ${this._getSortOrder(order[1])}`)
            .join(", ");
    }

    private _getObjectIndexer(propsChain: string[], asText = false) {
        return propsChain.length === 1 ?
            `object ->${asText ? ">" : ""}${asLiteral(propsChain[0])}` :
            `object #>${asText ? ">" : ""}array[${propsChain.map(p => asLiteral(p)).join(",")}]`;
    }

    private _getJsonpathKeys(propsChain: string[]) {
        const keys = propsChain.map(p => asJsonpathLiteral(p, false)).join(".");
        return keys === "" ? `$` : `$.${keys}`;
    }

    private _getSortOrder(order: "Asc" | "Desc") {
        return order === "Asc" ? "ASC" : "DESC";
    }

    private _getAggregateParams(aggregateOp: AggregateOp) {
        switch (aggregateOp) {
            case AggregateOp.Avg:
                return ["avg", "float"];
            case AggregateOp.Sum:
                return ["sum", "float"];
            case AggregateOp.Max:
                return ["max", "float"];
            case AggregateOp.Min:
                return ["min", "float"];
            case AggregateOp.Every:
                return ["bool_and", "boolean"];
            case AggregateOp.Some:
                return ["bool_or", "boolean"];
            default:
                throw new TypeError(`Unhandled aggregate operator ${aggregateOp}`);
        }
    }

    private _getJoinQuery(
        tableId: string,
        query: string,
        resultColumn: string,
        joinConditions: DbJoinCondition | DbJoinCondition[],
        filter: DbObjectFilter): string {
        if (!joinConditions) {
            return query + ";";
        }
        if (!Array.isArray(joinConditions)) {
            joinConditions = [joinConditions];
        }
        if (joinConditions.length === 0) {
            return query + ";";
        }

        const local = "local";
        const joinedSelectList = joinConditions.map((c, i) => {
            const isSingleResult = c.isOneToOneRelation && !c.isLocalPropertyArray;
            /* tslint:disable-next-line:max-line-length */
            let aggExpr = `COALESCE(jsonb_agg(DISTINCT from${i}.object ORDER BY from${i}.object ASC) FILTER (WHERE from${i}.object IS NOT NULL), '[]'::jsonb)`;
            if (isSingleResult) {
                aggExpr += "->0";
            }
            const buildExpr = `jsonb_build_object(${asLiteral(c.asProperty)}, ${aggExpr})`;
            return isSingleResult ? `jsonb_strip_nulls(${buildExpr})` : buildExpr;
        });
        const joinClauses = joinConditions.map((c, i) => {
            const localExpr = c.isLocalPropertyArray ?
                `IN (SELECT value FROM jsonb_array_elements(${local}.object->${asLiteral(c.localProperty)}))` :
                `= ${local}.object->${asLiteral(c.localProperty)}`;
            return `LEFT OUTER JOIN ${this._getTableId(c.fromCollection)} AS from${i}
                ON (from${i}.object->${asLiteral(c.fromProperty)} ${localExpr})`;
        });

        // The orderBy clause must also be applied to the joined result set to ensure desired ordering.
        const orderBy = this._getOrderByClause(filter, local);
        return `SELECT (${local}.object || ${joinedSelectList.join(" || ")}) as ${resultColumn} 
                            FROM (${query}) as ${local}
                            ${joinClauses.join("\n")}
                            GROUP BY ${local}.object ${orderBy};`;
    }

    /* Fetching results by in chunks or at once */

    private _fetchInChunks<T>(
        createQuery: CreateQuery,
        rowField: string,
        fetchSize: number,
        take: number,
        skip: number): Promise<IQueryIterator<T>> {
        return new Promise<IQueryIterator<T>>((resolve, reject) => {
            let resultIndex = 0;
            let currentBatch: T[] = [];

            take = take !== undefined ? Math.max(0, take) : -1;
            skip = skip !== undefined ? Math.max(0, skip) : 0;

            // Read from cursor sequentially, read the next chunk after the current one
            // yielded all results. Multiple cursors can be opened and read from
            // simultaneously on the same client, e.g. when using a transaction client.
            const fetchNextChunk = (
                client: PooledClient,
                cursor: string,
                fetchCount: number,
                skipCount: number,
                iter: QueryIterator<T>,
                resolveDone: (value?: [number, boolean]) => void,
                rejectDone: (reason?: any) => void) => {
                client.readCursor(cursor, fetchCount, skipCount)
                    .then(results => {
                        let isBreakInvoked = false;
                        let allTaken = false;
                        let result: QueryResult;

                        if (Array.isArray(results)) {
                            // Array consists of two results: one for MOVE command (to be ignored)
                            // and one for FETCH command. Note: even if there is nothing to fetch
                            // any more, the FETCH result is present with an empty rowset.
                            result = results.find(res => res.command === "FETCH");
                        } else {
                            // This is a FETCH command result only.
                            result = results;
                        }
                        const rowLen = result.rows.length;
                        let i = 0;
                        while (i < rowLen) {
                            const obj = (rowField ? result.rows[i][rowField] : result.rows[i]) as T;
                            let dontBreak: void | boolean = true;

                            // Yield a single item
                            if (iter.forEachAction) {
                                dontBreak = iter.forEachAction(obj, resultIndex);
                            }
                            // Yield current batch if enough items have accumulated
                            if (iter.forBatchAction) {
                                currentBatch.push(obj);
                                if (iter.batchSize > 0 && currentBatch.length === iter.batchSize) {
                                    dontBreak = iter.forBatchAction(currentBatch);
                                    currentBatch = [];
                                }
                            }

                            resultIndex++;

                            if (dontBreak === false) {
                                isBreakInvoked = true;
                                break;
                            }

                            if (take > 0 && resultIndex >= take) {
                                allTaken = true;
                                break;
                            }
                            i++;
                        }

                        const readCompletely = rowLen < fetchCount;
                        if (isBreakInvoked || allTaken || readCompletely) {
                            // Yield last batch if needed. If query yields no results at all, also 
                            // submit the first (empty) batch.
                            if (iter.forBatchAction &&
                                (currentBatch.length > 0 || resultIndex === 0)) {
                                if (iter.forBatchAction(currentBatch) === false) {
                                    isBreakInvoked = true;
                                }
                            }

                            client.closeCursor(cursor, undefined, (errc) => {
                                client.releaseIfNotTx(errc);
                                resolveDone([resultIndex, isBreakInvoked]);
                            });

                            return;
                        }

                        fetchNextChunk(client, cursor, fetchSize, 0, iter, resolveDone, rejectDone);
                    })
                    .catch(error => {
                        client.closeCursor(cursor, error, (errc) => {
                            client.releaseIfNotTx(errc);
                            rejectDone(error);
                        });
                    });
            };

            const iterator = new QueryIterator<T>();
            const donePromise = new Promise<[number, boolean]>((resolveDone, rejectDone) => {
                iterator.setStarter(() => {
                    const cpromise = this._transactionClient ? Promise.resolve(this._transactionClient) : this._getPooledClient();
                    let pc: PooledClient;
                    cpromise
                        .then(poolClient => {
                            pc = poolClient;
                            return poolClient.queryCursorLazy(createQuery);
                        })
                        .then(cursor => {
                            if (take === 0) {
                                resolveDone([0, false]);
                                return;
                            }
                            fetchNextChunk(pc, cursor, fetchSize, skip, iterator, resolveDone, rejectDone);
                        })
                        // Catch connection and cursor errors
                        .catch(error => rejectDone(error));
                });
            });
            iterator.setDonePromise(donePromise);
            resolve(iterator);
        });
    }

    private _fetchOnce<T>(
        createQuery: CreateQuery,
        rowField: string): Promise<IQueryIterator<T>> {
        return new Promise<IQueryIterator<T>>((resolve, reject) => {
            const iterator = new QueryIterator<T>();
            const donePromise = new Promise<[number, boolean]>((resolveDone, rejectDone) => {
                iterator.setStarter(() => {
                    this._queryPooledLazy(createQuery)
                        .then(result => {
                            const rows = result.rows;
                            let resultIndex = 0;
                            let currentBatch: T[] = [];
                            let isBreakInvoked = false;
                            const rowLen = rows.length;
                            let i = 0;
                            while (i < rowLen) {
                                const obj = (rowField ? rows[i][rowField] : rows[i]) as T;
                                let dontBreak: void | boolean = true;

                                // Yield a single item
                                if (iterator.forEachAction) {
                                    dontBreak = iterator.forEachAction(obj, resultIndex);
                                }
                                // Yield current batch if enough items have accumulated
                                if (iterator.forBatchAction) {
                                    currentBatch.push(obj);
                                    if (iterator.batchSize > 0 && currentBatch.length === iterator.batchSize) {
                                        dontBreak = iterator.forBatchAction(currentBatch);
                                        currentBatch = [];
                                    }
                                }

                                resultIndex++;

                                if (dontBreak === false) {
                                    isBreakInvoked = true;
                                    break;
                                }
                                i++;
                            }

                            // Yield last batch if needed. If query yields no
                            // results at all, also submit the first (empty) batch.
                            if (iterator.forBatchAction &&
                                (currentBatch.length > 0 || resultIndex === 0)) {
                                if (iterator.forBatchAction(currentBatch) === false) {
                                    isBreakInvoked = true;
                                }
                            }
                            resolveDone([resultIndex, isBreakInvoked]);
                        })
                        .catch(error => rejectDone(error));
                });
            });
            iterator.setDonePromise(donePromise);
            resolve(iterator);
        });
    }

    /* Transaction Management */

    private _beginTransaction(
        client: PooledClient,
        action: (client: PooledClient) => void,
        errorAction: (error: Error) => void) {
        if (this._transactionClient !== undefined) {
            client.release();
            throw new Error("Nested transactions (subtransactions or savepoints) are not supported.");
        }

        client.query("BEGIN").then(
            () => action(client),
            err => {
                // If there was a problem beginning the transaction something is
                // seriously messed up. Return the error to the release function
                // to close and remove this client from the pool.
                client.release(err);
                errorAction(err);
            });
    }

    private _commitTransaction(
        client: PooledClient,
        action: () => void,
        errorAction: (error: Error) => void) {
        client.query("COMMIT").then(
            () => {
                client.release();
                action();
            },
            err => {
                // If there was a problem committing the query something is
                // seriously messed up. Return the error to the release function
                // to close and remove this client from the pool.
                client.release(err);
                errorAction(err);
            });
    }

    private _rollbackTransaction(
        client: PooledClient,
        error: Error,
        errorAction: (error: Error) => void) {
        client.query("ROLLBACK")
            .then(
                () => {
                    client.release();
                    errorAction(error);
                },
                err => {
                    // If there was a problem rolling back the query something
                    // is seriously messed up. Return the error to the release
                    // function to close and remove this client from the pool.
                    // If you leave a client in the pool with an unaborted
                    // transaction weird, hard to diagnose problems might
                    // happen.
                    client.release(err);
                    errorAction(error);
                });
    }

    /* Helpers */

    private _getTableId(name: string) {
        return PostgresAdapter.COLLECTION_SCHEMA + "." + asIdentifier(name);
    }

    private _getFetchSize(filterFetchSize) {
        return Math.max(
            PostgresAdapter.MINIMUM_FETCH_SIZE,
            filterFetchSize ||
            (this.connectionInfo.adapterOptions && this.connectionInfo.adapterOptions.defaultFetchSize) ||
            PostgresAdapter.DEFAULT_FETCH_SIZE);
    }

    private _supportsJsonpath(info: ServerInfo) {
        // Note: JSONB jsonpath operators were introduced in PG database server
        // version 12. However, in this version GIN indexing with
        // "jsonb_path_ops" only supports a subset of uses of @@ and @!
        // operators (e.g. only jsonpath filter expressions like equality
        // comparison (==), but not less-than or greather-than comparison).
        // Starting with PG server version 13, all jsonpath filter expressions
        // make use of GIN indexing.
        return info.majorVersion >= 12;
    }

    /* Connection Pooling */

    private _queryPooled(text: string, values?: any[]): Promise<QueryResult> {
        if (this._transactionClient) {
            return this._transactionClient.query(text, values);
        }
        return this._getPoolItem().then(item => item.pool.query(text, values));
    }

    private _queryPooledLazy(createQuery: CreateQuery): Promise<QueryResult> {
        if (this._transactionClient) {
            return this._transactionClient.query(...createQuery(this._transactionClient.poolItem.serverInfo));
        }
        return this._getPoolItem().then(item => item.pool.query(...createQuery(item.serverInfo)));
    }

    private _getPooledClient(isTransactionClient = false) {
        return this._getPoolItem().then(item => item.pool.connect().then(client => new PooledClient(client, item, isTransactionClient)));
    }

    private _getPoolItem() {
        let poolItem = PostgresAdapter.PG_POOLS.get(this.connectionInfo);
        if (poolItem !== undefined) {
            return Promise.resolve(poolItem);
        }

        poolItem = {
            pool: new Pool(this._getPoolOptions(this.connectionInfo)),
            serverInfo: { majorVersion: 0, minorVersion: 0 },
        };

        // Emitted whenever an idle client in the pool encounters an error.
        // This is common when your PostgreSQL server shuts down, reboots,
        // or a network partition otherwise causes it to become unavailable
        // while your pool has connected clients.
        poolItem.pool.on("error", (error, client) => {
            // Handle this in the same way you would treat
            // process.on('uncaughtException'). It is supplied the error as
            // well as the idle client which received the error.
            console.log(`PostgresAdapter: pool idle client error: ${error.message}`);
        });

        return poolItem.pool.query("show server_version")
            .then(result => {
                const [major, minor] = (result.rows[0].server_version as string).split(".");
                poolItem.serverInfo.majorVersion = parseInt(major, 10);
                poolItem.serverInfo.minorVersion = parseInt(minor, 10);
                PostgresAdapter.PG_POOLS.set(this.connectionInfo, poolItem);
                return poolItem;
            });
    }

    private _getPoolOptions(connectionInfo: DbConnectionInfo): PoolConfig {
        const connString = connectionInfo.connectionString;
        let config: PoolConfig = {};

        // First extract options from connection string
        if (connString && connString.length > 0) {
            config = parse(connString);
        }

        // Then merge with options from connectionOptions
        if (connectionInfo.connectionOptions) {
            Object.assign(config, connectionInfo.connectionOptions);
        }

        return config as PoolConfig;
    }

}

type CreateQuery = (info: ServerInfo) => [text: string, values?: any[]];

interface ServerInfo {
    majorVersion: number;
    minorVersion: number;
}

interface PoolItem {
    pool: Pool;
    serverInfo: ServerInfo;
}

class PooledClient {

    constructor(private _client: PoolClient, public poolItem: PoolItem, public isTransactionClient: boolean = false) {
    }

    query(text: string, values?: any[]): Promise<QueryResult> {
        return new Promise<QueryResult>((resolve, reject) => {
            const callback = (err, result) => {
                err ? reject(err) : resolve(result);
            };
            this._client.query(text, values || [], callback);
        });
    }

    queryCursorLazy(createQuery: CreateQuery): Promise<string> {
        const [text] = createQuery(this.poolItem.serverInfo);

        // We provide an explicit cursor implementation using Postgres SQL
        // statements. We do not use the pg-cursor library for reasons explained
        // next.
        //
        // The pg-cursor library exhibits an issue when closing cursors for
        // which all results have been fetched. A cursor must be closed if not
        // all cursor results have been fetched. Otherwise subsequent queries on
        // the same client connection will hang.
        //
        // Calling Cursor.close() on a completed cursor produces sporadic query
        // result issues that are not reproducible. For example, queries return
        // unexpected values that do not conform to the data in the database,
        // such as returning `undefined` for a `findObjectById` operation or
        // returning `undefined` array elements in batch results from
        // `findObjects` operations.
        //
        // The problem is that we cannot detect reliably whether all values of a
        // cursor query have been fetched in case of a premature break.
        const cursor = asIdentifier(Runtime.newUuid());

        // Cursor declaration and execution must be inside a transaction block
        const txQuery = this.isTransactionClient ? Promise.resolve({} as QueryResult) : this._client.query("BEGIN");
        return txQuery
            .then(() => this._client.query(`DECLARE ${cursor} NO SCROLL CURSOR WITHOUT HOLD FOR ${text}`))
            .then(() => cursor);
    }

    readCursor(cursor: string, take: number, skip?: number) {
        let text = `FETCH ${take} FROM ${cursor};`;
        if (skip) {
            text = `MOVE ${skip} FROM ${cursor}; ` + text;
        }
        return this._client.query(text);
    }

    closeCursor(cursor: string, error: any, closeAction: (err?) => void) {
        // On end of transaction open cursors are automatically closed.
        const p = this.isTransactionClient ?
            this._client.query(`CLOSE ${cursor};`) :
            this._client.query(error ? "ROLLBACK;" : "COMMIT;");
        return p
            .then(() => closeAction())
            .catch(err => closeAction(err));
    }

    /**
     * Release the client to the pool. This is equivalent to calling the `done`
     * DoneCallback if Pool.connect is used with a connect callback instead of a
     * promise.
     *
     * If the error parameter is specified, the client instance is destroyed
     * instead of being returned back to the pool. This is e.g. useful if a
     * transaction error occurs on rollback. In this case the client instance
     * should no longer be used.
     */
    release(err?: any) {
        this._client.release(err);
    }

    /**
     * Release the client to the pool if not inside a transaction block. Note
     * that open cursors (see _fetchWithCursor) are implicitly closed at
     * transaction end by the database server. Hopefully, this also affects
     * cursors that yielded an error on reading or closing. Internally, the
     * connection is kept from hanging when a cursor operation fails.
     * 
     */
    releaseIfNotTx(err?: any) {
        if (!this.isTransactionClient) {
            this.release(err);
        }
    }
}

/**
 * Convert an SQL LIKE pattern to a POSIX regular expression.
 *
 * @remarks As of PG server version 12, SQL/JSON jsonpath expressions with
 * the `like_regex` filter use POSIX reguar expressions to match text.
 *
 * @param like an SQL LIKE expression string
 * @returns an equivalent POSIX regular expression string
 */
function like2PosixRegex(likePattern: string): string {
    let regexStr = "^";
    let isEscaped = false;
    for (const c of likePattern) {
        if (c === "\\") {
            if (isEscaped) {
                isEscaped = false;
                regexStr += "\\\\";
            } else {
                isEscaped = true;
            }
            continue;
        }
        if (".*+?^${}()|[]".indexOf(c) !== -1) {
            regexStr += "\\" + c;
            isEscaped = false;
            continue;
        }
        if (c === "_" && !isEscaped) {
            regexStr += ".";
            continue;
        }
        if (c === "%" && !isEscaped) {
            regexStr += ".*";
            continue;
        }
        regexStr += c;
        isEscaped = false;
    }
    regexStr += "$";
    return regexStr;
}

/**
 * Returns the given string suitably quoted to be used as an identifier in a
 * PostgreSQL statement string. Quotes are always added to disable case folding.
 * Embedded quotes are properly doubled. (see Postgres string function
 * _quoteIdent).
 *
 * @param text a value to be used as identifier
 */
function asIdentifier(text: any) {
    if (typeof text !== "string") {
        text = JSON.stringify(text);
    }

    const escape = "\"";
    const len = text.length;
    let escaped = escape;
    for (let i = 0; i < len; i++) {
        const c = text[i];
        if (c === escape) {
            escaped += c + c;
        } else {
            escaped += c;
        }
    }

    escaped += escape;

    return escaped;
}

/**
 * Returns the given string suitably quoted to be used as a string literal in a
 * PostgreSQL statement string. Embedded single-quotes and backslashes are
 * properly doubled. (see Postgres string function _quoteLiteral).
 *
 * @param text a value to be used as literal
 */
function asLiteral(text: any) {
    if (typeof text !== "string") {
        text = JSON.stringify(text);
    }

    const escape = "'";
    const len = text.length;
    let hasBackslash = false;
    let escaped = escape;

    for (let i = 0; i < len; i++) {
        const c = text[i];
        if (c === escape) {
            escaped += c + c;
        } else if (c === "\\") {
            escaped += c + c;
            hasBackslash = true;
        } else {
            escaped += c;
        }
    }

    escaped += escape;

    // The Postgres escape string processor E removes one level of backslashes
    if (hasBackslash === true) {
        escaped = " E" + escaped;
    }

    return escaped;
}

/**
 * Returns the given string suitably double quoted to be used as a string
 * literal in a PostgreSQL jsonpath expression. Embedded single-quotes are
 * properly doubled. Embedded double-quotes and backslashes are escaped by a
 * backslash for a jsonpath accessor key or a `like-regex` pattern.
 *
 * @param text a value to be used as jsonpath literal
 * @param isFilterExpression `true` if text value is a jsonpath filter
 * expression as a stringified JSON value; `false` if text value denotes a
 * jsonpath accessor key or a `like_regex` pattern
 */
function asJsonpathLiteral(text: string, isFilterExpression: boolean) {
    const escape = "\"";
    const backslash = "\\";
    const len = text.length;
    let escaped = isFilterExpression ? "" : escape;

    for (let i = 0; i < len; i++) {
        const c = text[i];
        if (c === "'") {
            escaped += c + c;
        } else if (!isFilterExpression && (c === backslash || c === escape)) {
            // Note: special JSON backslash sequences including \b, \f, \n, \r,
            // \t, \v, \uNNNN, \xNN, and \u{N...(1-6)} are never used as
            // literals by this adapter, so they need not be treated specially.
            escaped += backslash + c;
        } else {
            escaped += c;
        }
    }

    if (!isFilterExpression) {
        escaped += escape;
    }

    return escaped;
}
