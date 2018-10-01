/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

/**
 * Test suite for framework SQL local store access using SqliteNodeAdapter.
 */

import { DbConnectionInfo, DbLocalContext, SQL } from "../../db";
import { SqLiteNodeAdapter } from "../../db-adapter-sqlite-node";
import { Components, Configuration, Container } from "../../runtime";

import { failTest } from "./utils";

describe("Local Store Access", () => {

    const TEST_TIMEOUT = 5000;

    const components: Components = {
    };

    const configuration: Configuration = {
        common: {},
        communication: {
            shouldAutoStart: false,
            brokerUrl: "mqtt://localhost:1898",
        },
        controllers: {
        },
        databases: {
            localdb: {
                adapter: "SqLiteNodeAdapter",
                connectionString: "test/db/coatytestlocal.db",
            },
        },
    };

    let container: Container;
    let connectionInfo: DbConnectionInfo;
    let dbContext: DbLocalContext;

    beforeAll(
        done => {
            container = Container.resolve(components, configuration);
            connectionInfo = container.getRuntime().databaseOptions["localdb"];
            dbContext = new DbLocalContext(connectionInfo, SqLiteNodeAdapter);

            dbContext.callExtension("deleteDatabase", connectionInfo.connectionString)
                .then(() => done())
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

    afterAll(
        done => {
            container.shutdown();

            // Do not use delayAction timeout function in afterAll. jasmine 
            // will not wait until the done action is called asynchronously 
            // in the timeout handler but will terminate permaturely.
            dbContext.callExtension("deleteDatabase", connectionInfo.connectionString)
                .then(() => done())
                .catch(error => done());
        },
        TEST_TIMEOUT);

    it("Simple query converts to uppercase",
        done => {
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

    it("Close database",
        done => {
            dbContext.close()
                .then(() => done())
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

    it("Reopen database, then set, get, delete, and clear values in the default store",
        done => {
            dbContext.setValue("username", "Fred")
                .then(() => dbContext.setValue("userrole", "123456"))
                .then(() => dbContext.getValue("username"))
                .then(value => expect(value).toBe("Fred"))
                .then(() => dbContext.getValue("userrole"))
                .then(value => expect(value).toBe("123456"))
                .then(() => dbContext.deleteValue("userrole"))
                .then(() => dbContext.getValue("userrole"))
                .then(value => expect(value).toBeUndefined())
                .then(() => dbContext.getValues())
                .then(values => expect(values).toEqual({ username: "Fred" }))
                .then(() => dbContext.clearValues())
                .then(() => dbContext.getValues())
                .then(values => expect(values).toEqual({}))
                .then(() => done())
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

    it("Set, get, delete, and clear values in a custom store",
        done => {
            const store = "credentials";
            dbContext.addStore(store)
                .then(() => dbContext.setValue("username", "Fred", store))
                .then(() => dbContext.setValue("userrole", "123456", store))
                .then(() => dbContext.getValue("username", store))
                .then(value => expect(value).toBe("Fred"))
                .then(() => dbContext.getValue("userrole", store))
                .then(value => expect(value).toBe("123456"))
                .then(() => dbContext.deleteValue("userrole", store))
                .then(() => dbContext.getValue("userrole", store))
                .then(value => expect(value).toBeUndefined())
                .then(() => dbContext.getValues(store))
                .then(values => expect(values).toEqual({ username: "Fred" }))
                .then(() => dbContext.clearValues(store))
                .then(() => dbContext.getValues(store))
                .then(values => expect(values).toEqual({}))
                .then(() => done())
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

    it("Remove custom store",
        done => {
            const store = "credentials";
            dbContext.removeStore(store)
                .then(() => dbContext.getValue("username", store))
                .then(value => failTest(new Error("query should throw an error"), done))
                .catch(error => done());
        },
        TEST_TIMEOUT);

    it("Query results iteratively",
        done => {
            const store = "testvalues";
            dbContext.addStore(store)
                .then(() => dbContext.setValue("key1", "val1", store))
                .then(() => dbContext.setValue("key2", "val2", store))
                .then(() => dbContext.setValue("key3", "val3", store))
                .then(() => dbContext.setValue("key4", "val4", store))
                .then(() => dbContext.setValue("key5", "val5", store))
                .then(() => dbContext.setValue("key6", "val6", store))
                .then(() => dbContext.iquery(SQL`SELECT * FROM ${store}{IDENT} ORDER BY key`))
                .then(iterator => iterator.forEach((result, i) => {
                    expect(result.key).toBe("key" + (i + 1));
                    expect(JSON.parse(result.value)).toBe("val" + (i + 1));
                }))
                .then(([count, isBreak]) => {
                    expect(count).toBe(6);
                    expect(isBreak).toBe(false);
                    done();
                })
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

    it("Store operations are committed inside a transaction",
        done => {
            const store = "testvalues";
            dbContext
                .transaction(txCtx => txCtx.setValue("key1", "val1.1", store))
                .then(() => dbContext.getValue("key1", store))
                .then(value => expect(value).toBe("val1.1"))
                .then(() => done())
                .catch(rollbackError => failTest(rollbackError, done));
        },
        TEST_TIMEOUT);

    it("Store operations are rolled back inside a transaction",
        done => {
            const store = "testvalues";
            dbContext
                .transaction(txCtx => {
                    return txCtx.setValue("key1", "val1.2", store)
                        .then(value => {
                            // Force transaction to roll back
                            throw new Error("forcing transaction rollback");
                        });
                })
                .then(() => failTest(new Error("transaction not rolled back"), done))
                .catch(rollbackError => {
                    dbContext.getValue("key1", store)
                        .then(value => expect(value).toBe("val1.1"))
                        .then(() => done())
                        .catch(error => failTest(error, done));
                });
        },
        TEST_TIMEOUT);

    it("Nested transactions are not supported",
        done => {
            const store = "testvalues";
            dbContext
                .transaction(txCtx => {
                    return txCtx.setValue("key1", "val1.3", store)
                        .then(value => {
                            // Attempt to invoke nested transaction will 
                            // roll back the outer transaction
                            return txCtx.transaction(txCtx1 => Promise.resolve());
                        });
                })
                .then(() => failTest(new Error("transaction not rolled back"), done))
                .catch(rollbackError => {
                    dbContext.getValue("key1", store)
                        .then(value => expect(value).toBe("val1.1"))
                        .then(() => done())
                        .catch(error => failTest(error, done));
                });
        },
        TEST_TIMEOUT);

    it("Close database",
        done => {
            dbContext.close()
                .then(() => done())
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

});
