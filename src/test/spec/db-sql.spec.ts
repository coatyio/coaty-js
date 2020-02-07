/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

/**
 * Test suite for framework SQL database access using PostgresAdapter.
 */

import { Components, Configuration, Container, DbConnectionInfo } from "../..";
import { DbAdapterFactory, DbContext, RAW, SQL, SqlQueryBuilder } from "../../db";
import { PostgresAdapter } from "../../db/adapter-postgres";

import { failTest, skipTestIf } from "./utils";

const isDebugTestDbMode = process.env.jasmineDebug === "true";

describe("SQL Database Access", () => {

    const TEST_TIMEOUT = 10000;

    const PG_ADAPTER_NAME = "PostgresAdapter";

    const components: Components = {
    };

    const configuration: Configuration = {
        communication: {
            shouldAutoStart: false,
            brokerUrl: "mqtt://localhost:1898",
        },
        controllers: {
        },
        databases: {
            testdb: {
                adapter: PG_ADAPTER_NAME,
                connectionString: "postgres://coatyjstestuser:coatyjstestuserpwd@localhost/coatyjstestdb",
                connectionOptions: {

                    // Reduced for testing purpose only!
                    // Otherwise it takes too long (30sec) to wait for the 
                    // last client to go idle before trying to destroy the 
                    // test database after the tests are finished.
                    // (the db server cannot drop the database while there
                    // are open client connections)
                    // Better solution: skip drop db/user commands in afterAll
                    // idleTimeoutMillis: 2000,

                    // Log pool activities in debug mode
                    log: (msg, level) => {
                        isDebugTestDbMode && console.log(msg);
                    },
                },
            },
            testdbserver: {
                adapter: PG_ADAPTER_NAME,

                // Connect as admin user (postgres) to admin database (postgres)
                connectionString: "postgres://postgres:postgres@localhost/postgres",
                connectionOptions: {
                    // Log pool activities in debug mode
                    log: (msg, level) => {
                        isDebugTestDbMode && console.log(msg);
                    },
                },
            },
        },
    };

    // Register database adapter before creating database contexts.
    DbAdapterFactory.registerAdapter(PG_ADAPTER_NAME, PostgresAdapter);

    let container: Container;
    let serverConnectionInfo: DbConnectionInfo;
    let serverDbCtx: DbContext;

    let connectionInfo: DbConnectionInfo;
    let dbContext: DbContext;

    let testData: any[];
    let testDataTable: string;

    let isDbAvailable = false;

    beforeAll(
        done => {
            container = Container.resolve(components, configuration);
            serverConnectionInfo = container.runtime.databaseOptions["testdbserver"];
            serverDbCtx = new DbContext(serverConnectionInfo);

            // Continue in case database/user cannot be deleted because client connections
            // are still open from previous tests
            serverDbCtx.callExtension("deleteDatabase", "coatyjstestdb")
                .then(
                () => serverDbCtx.callExtension("deleteUser", "coatyjstestuser"),
                (error) => true)
                .then(() => serverDbCtx.callExtension("createUser",
                    "coatyjstestuser", "coatyjstestuserpwd", "Commenting coatyjstestuser"))
                .then(() => serverDbCtx.callExtension("createDatabase",
                    "coatyjstestdb", "coatyjstestuser", "Commenting coatyjstestdb"))
                .then(() => { isDbAvailable = true; done(); })
                .catch(error => {
                    isDbAvailable = false;
                    isDebugTestDbMode && console.log(error);
                    done();
                });

            connectionInfo = container.runtime.databaseOptions["testdb"];
            dbContext = new DbContext(connectionInfo);

            testData = [];

            for (let i = 1; i <= 100; i++) {
                const data = {
                    id: i,
                    name: "Test Object " + i,
                    value: 10 * i,
                };
                testData.push(data);
            }

            testDataTable = "testData";
        },
        TEST_TIMEOUT);

    afterAll(
        done => {
            container.shutdown();

            // Do not use delayAction timeout function in afterAll. jasmine 
            // will not wait until the done action is called asynchronously 
            // in the timeout handler but will terminate permaturely.
            if (isDbAvailable) {
                // Do not drop db/user because there might still be open client
                // connections in the pool.
                done();
            } else {
                done();
            }
        },
        TEST_TIMEOUT);

    it("Checking availability of database server", () => {
        skipTestIf(!isDbAvailable, "No database server");
        expect(isDbAvailable).toBe(isDbAvailable);
    });

    it("Building SQL queries", () => {
        skipTestIf(!isDbAvailable, "No database server");

        const buildQuery = (builder: SqlQueryBuilder, forPostgres: boolean) => {
            return builder(
                forPostgres ? "$" : "?",
                forPostgres,
                0,
                ident => `"${typeof ident === "string" ? ident : JSON.stringify(ident)}"`,
                literal => `'${typeof literal === "string" ? literal : JSON.stringify(literal)}'`);
        };

        const tableName = "myTable";
        const firstNameColumn = "first name";
        const firstNameFred = "Fred";

        expect(buildQuery(SQL``, true)).toEqual(["", []]);
        expect(buildQuery(SQL``, false)).toEqual(["", []]);
        expect(buildQuery(SQL``, false)).toEqual(["", []]);
        expect(buildQuery(SQL` plain text `, true)).toEqual([" plain text ", []]);
        expect(buildQuery(SQL`${20}`, true)).toEqual(["$1", [20]]);
        expect(buildQuery(SQL`${20}`, false)).toEqual(["?", [20]]);
        expect(buildQuery(SQL`${20}{IDENT}foo`, true)).toEqual([`"20"foo`, []]);
        expect(buildQuery(SQL`${20}{LIT}foo`, true)).toEqual([`'20'foo`, []]);
        expect(buildQuery(SQL`${1} ${20}{IDENT} ${2}`, true)).toEqual([`$1 "20" $2`, [1, 2]]);
        expect(buildQuery(SQL`${1} ${20}{IDENT} ${2}`, false)).toEqual([`? "20" ?`, [1, 2]]);
        expect(buildQuery(SQL`SELECT * FROM ${tableName}{IDENT} WHERE ${firstNameColumn}{LIT} = ${firstNameFred};`, true))
            .toEqual([`SELECT * FROM "myTable" WHERE 'first name' = $1;`, ["Fred"]]);
        expect(buildQuery(SQL`SELECT * FROM ${tableName}{IDENT} WHERE ${firstNameColumn}{LIT} = ${firstNameFred};`, false))
            .toEqual([`SELECT * FROM "myTable" WHERE 'first name' = ?;`, ["Fred"]]);

        const firstQuery = SQL`${1}`;
        const secondQuery = SQL`${2}${SQL`.${1}`}`;
        const thirdQuery = SQL`${3}`;
        const fourthQuery = SQL`${4}`;

        expect(buildQuery(SQL`${firstQuery}|${secondQuery}|${fourthQuery}`, true)).toEqual([`$1|$2.$3|$4`, [1, 2, 1, 4]]);
        expect(buildQuery(SQL`${firstQuery}|${thirdQuery}|${fourthQuery}`, true)).toEqual([`$1|$2|$3`, [1, 3, 4]]);

        const rawText = `SELECT * FROM "myTable" WHERE name = $1;`;
        expect(buildQuery(RAW(rawText), true)).toEqual([rawText, []]);
    });

    it("Simple query converts to uppercase",
        done => {
            skipTestIf(!isDbAvailable, "No database server");

            const text = "Some TEXt";
            dbContext
                .query(SQL`SELECT upper(${text}) as uppertext;`)
                .then(result => {
                    expect(result.rows[0].uppertext).toBe(text.toUpperCase());
                    done();
                })
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

    it("Query inserts data items into table",
        done => {
            skipTestIf(!isDbAvailable, "No database server");

            const insertData = [...testData];
            const insertNextItem = () => {
                const item = insertData.pop();
                if (!item) {
                    return Promise.resolve();
                }
                return dbContext
                    .query(SQL`INSERT INTO ${testDataTable}{IDENT} (id, name, value)
                                 VALUES (${item.id}, ${item.name}, ${item.value});`)
                    .then(result => {
                        return insertNextItem();
                    })
                    .catch(error => Promise.reject(error));
            };

            dbContext
                .query(SQL`CREATE TABLE ${testDataTable}{IDENT} 
                             (id Integer, name Varchar, value Float);`)
                .then(result => insertNextItem())
                .then(() => done())
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

    it("Query retrieves the first 10 data items at once",
        done => {
            skipTestIf(!isDbAvailable, "No database server");
            const maxId = 10;
            dbContext
                .query(SQL`SELECT * FROM ${testDataTable}{IDENT}
                             WHERE id <= ${maxId}
                             ORDER BY id ASC;`)
                .then(result => {
                    result.rows.forEach((r, i) => expect(r.id).toBe(i + 1));
                    done();
                })
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

    it("Query retrieves the first 10 data items in chunks",
        done => {
            skipTestIf(!isDbAvailable, "No database server");
            const maxId = 10;
            dbContext
                .iquery(SQL`SELECT * FROM ${testDataTable}{IDENT}
                             WHERE id <= ${maxId}{LIT}
                             ORDER BY id DESC;`)
                .then(iterator => iterator
                    .forEach((r, i) => expect(r.id).toBe(maxId - i)))
                .then(([count, isBreak]) => {
                    expect(count).toBe(maxId);
                    expect(isBreak).toBe(false);
                    done();
                })
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

    it("Query retrieves empty result set in chunks",
        done => {
            skipTestIf(!isDbAvailable, "No database server");
            const maxId = -10;
            dbContext
                .iquery(SQL`SELECT * FROM ${testDataTable}{IDENT}
                             WHERE id <= ${maxId}{LIT}
                             ORDER BY id DESC;`)
                .then(iterator => iterator
                    .forEach((r, i) => false))
                .then(([count, isBreak]) => {
                    expect(count).toBe(0);
                    expect(isBreak).toBe(false);
                    done();
                })
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

});
