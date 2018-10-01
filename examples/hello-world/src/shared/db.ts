/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { DbAdapterFactory, DbContext } from "coaty/db";
import { PostgresAdapter } from "coaty/db-adapter-postgres";
import { DatabaseOptions } from "coaty/runtime";

/**
 * Defines static constants and functions for database initialization
 * and access.
 */
export class Db {

    public static readonly COLLECTION_LOG = "log";
    public static readonly COLLECTION_TASK = "task";

    private static readonly USER_NAME = "helloworld_user";
    private static readonly USER_PWD = "helloworld_user_pwd";
    private static readonly DB_NAME = "helloworld_db";

    public static getConnectionString() {
        return `postgres://${Db.USER_NAME}:${Db.USER_PWD}@localhost/${Db.DB_NAME}`;
    }

    public static getAdminConnectionString() {
        // Connect as admin user (postgres) with password (postgres) to admin database (postgres).
        return `postgres://postgres:postgres@localhost/postgres`;
    }

    public static initDatabaseAdapters() {
        DbAdapterFactory.registerAdapter("PostgresAdapter", PostgresAdapter);
    }

    public static initDatabase(options: DatabaseOptions, clearData: boolean = true): Promise<any> {
        const dbc = new DbContext(options["db"]);
        const dbcAdmin = new DbContext(options["admindb"]);

        return dbcAdmin.callExtension("createUser", Db.USER_NAME, Db.USER_PWD)
            .then(() => dbcAdmin.callExtension("createDatabase", Db.DB_NAME, Db.USER_NAME))

            // Add collections if they do not exist yet
            .then(() => dbc.addCollection(Db.COLLECTION_LOG))
            .then(() => dbc.addCollection(Db.COLLECTION_TASK))

            // If requested, clear all data from previous runs
            .then(() => clearData && dbc.clearCollection(Db.COLLECTION_LOG))
            .then(() => clearData && dbc.clearCollection(Db.COLLECTION_TASK));
    }
}
