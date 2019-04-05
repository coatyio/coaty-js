/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

/**
 * Test suite for framework NoSQL database access using PostgresAdapter
 */

import { take, timeout } from "rxjs/operators";

import {
    AggregateOp,
    DbAdapterFactory,
    DbConnectionInfo,
    DbContext,
    DbJoinCondition,
    DbObjectFilter,
} from "../../db";
import { PostgresAdapter } from "../../db-adapter-postgres";
import { CoatyObject, CoreTypes, filterOp, ObjectFilter, ObjectJoinCondition } from "../../model";
import { Components, Configuration, Container } from "../../runtime";
import { Async } from "../../util";

import {
    DbTestObject,
    DbTestObjectManagementController,
    MockQueryingController,
    OBJECT_TYPE_NAME_DB_TEST_OBJECT,
} from "./db.mocks";
import { failTest, skipTestIf } from "./utils";

const isDebugTestDbMode = process.env.jasmineDebug === "true";

describe("Postgres NoSQL Database Access", () => {

    const TEST_TIMEOUT = 30000;

    const PG_ADAPTER_NAME = "PostgresAdapter";

    const components: Components = {
        controllers: {
            DbTestObjectManagementController,
            MockQueryingController,
        },
    };

    const configuration: Configuration = {
        common: {},
        communication: {
            shouldAutoStart: true,
            brokerUrl: "mqtt://localhost:1898",
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
            testdbadmin: {
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
    let connectionInfo: DbConnectionInfo;
    let serverConnectionInfo: DbConnectionInfo;
    let serverDbCtx: DbContext;

    let dbContext: () => DbContext;
    let sharedDbContext: DbContext;
    let shouldShareDbContext: boolean;

    let testObjects: DbTestObject[];
    let testObjectsCount: number;

    let isDbAvailable = false;

    beforeAll(
        done => {
            container = Container.resolve(components, configuration);
            connectionInfo = container.getRuntime().databaseOptions["testdb"];
            sharedDbContext = new DbContext(connectionInfo);
            shouldShareDbContext = true;

            dbContext = () => {
                // This is just for testing shared and unshared db contexts.
                // In a real application, you can and should always use a shared context.
                return shouldShareDbContext ? sharedDbContext : new DbContext(connectionInfo);
            };

            testObjects = [];
            testObjectsCount = 100;

            for (let i = 1; i <= testObjectsCount; i++) {
                const obj: DbTestObject = {
                    "objectId": container.getRuntime().newUuid(),
                    "name": "Test Object " + i,
                    "coreType": "CoatyObject",
                    "objectType": OBJECT_TYPE_NAME_DB_TEST_OBJECT,
                    "externalId": "" + (testObjectsCount + i),
                    "testId": i,
                    "testValue": [i, i + 1, i + 2, "foo"],
                    "testText": `${i}`,
                    "testBool": (i % 2) === 0 ? true : false,
                    "testObj": {
                        "": i,
                        "name": "Test SubObject " + i,
                        "testId": i,
                        "testValue": [i, i + 1, i + 2, "foo"],
                        "testText": `${i}`,
                        "testBool": (i % 2) === 0 ? true : false,
                    },
                    " ": "blank",
                    "": { "": { "": i } },
                    ".": { ".": { ".": i } },
                };
                testObjects.push(obj);
            }

            serverConnectionInfo = container.getRuntime().databaseOptions["testdbadmin"];
            serverDbCtx = new DbContext(serverConnectionInfo);

            serverDbCtx.callExtension("deleteDatabase", "coatyjstestdb")
                .then(() => serverDbCtx.callExtension("deleteUser", "coatyjstestuser"))
                .then(() => serverDbCtx.callExtension("createUser",
                    "coatyjstestuser", "coatyjstestuserpwd", "Commenting coatyjstestuser"))
                .then(() => serverDbCtx.callExtension("createDatabase",
                    "coatyjstestdb", "coatyjstestuser", "Commenting coatyjstestdb"))
                .then(() => {
                    isDbAvailable = true;
                    done();
                })
                .catch(error => {
                    // Drop database failed because other pool clients (from previous historian.spec tests) 
                    // are still connected to it; just continue...
                    isDbAvailable = true;
                    isDebugTestDbMode && console.log(error);
                    done();
                });
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
                // serverDbCtx.callExtension("deleteDatabase", "coatyjstestdb")
                //     .then(() => serverDbCtx.callExtension("deleteUser", "coatyjstestuser"))
                //     .then(() => { done(); })
                //     .catch(error => {
                //         isDebugTestDbMode && console.log(error);
                //         done();
                //     });
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

    it("New collection is created",
        done => {
            skipTestIf(!isDbAvailable, "No database server");
            dbContext().addCollection("testobjects")
                .then(() => done())
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

    it("New objects are inserted",
        done => {
            skipTestIf(!isDbAvailable, "No database server");
            dbContext().insertObjects("testobjects", testObjects, false)
                .then(insertedIds => {
                    expect(insertedIds.length).toBe(testObjects.length);
                    done();
                })
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

    it("Existing collection is kept",
        done => {
            skipTestIf(!isDbAvailable, "No database server");
            dbContext().addCollection("testobjects")
                .then(() => dbContext().countObjects("testobjects"))
                .then(count => expect(count).toBe(testObjects.length))
                .then(() => done())
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

    it("Inserted object replaces existing one",
        done => {
            skipTestIf(!isDbAvailable, "No database server");
            testObjects[0].name += ".1";
            dbContext().insertObjects("testobjects", testObjects[0], true)
                .then(insertedIds => {
                    expect(insertedIds.length).toBe(1);
                    expect(insertedIds[0]).toBe(testObjects[0].objectId);
                    done();
                })
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

    it("Inserted object is skipped",
        done => {
            skipTestIf(!isDbAvailable, "No database server");
            testObjects[0].name += ".2";
            dbContext().insertObjects("testobjects", testObjects[0], false)
                .then(insertedIds => {
                    expect(insertedIds.length).toBe(0);
                    done();
                })
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

    it("Updating existing objects",
        done => {
            skipTestIf(!isDbAvailable, "No database server");
            testObjects.forEach(obj => obj.name += ".updated");
            dbContext().updateObjects("testobjects", testObjects)
                .then(updatedIds => {
                    expect(updatedIds.length).toBe(testObjects.length);
                    done();
                })
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

    it("Updating property value of existing objects",
        done => {
            skipTestIf(!isDbAvailable, "No database server");
            const newValue = "set";
            dbContext().updateObjectProperty(
                "testobjects",
                testObjects.map(o => o.objectId),
                "testUpdate",
                newValue)
                .then(() => {
                    dbContext().findObjects<DbTestObject>("testobjects")
                        .then(iterator => iterator
                            .forEach((obj, index) => {
                                expect(obj.testUpdate).toBe(newValue);
                            }))
                        .then(([count]) => {
                            expect(count).toBe(testObjects.length);
                            done();
                        })
                        .catch(error => failTest(error, done));
                })
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

    it("No update of non-existing objects",
        done => {
            skipTestIf(!isDbAvailable, "No database server");
            const nonExisting: CoatyObject = {
                name: "Test object xxxxx",
                objectId: "00102092-5869-4e2d-ad3f-1d7a161f419c",
                coreType: "CoatyObject",
                objectType: CoreTypes.OBJECT_TYPE_OBJECT,
            };
            const nonExistings = [];
            for (let i = 0; i < 1; i++) {
                nonExisting.name += i;
                nonExistings.push(nonExisting);
            }
            dbContext().updateObjects("testobjects", nonExistings)
                .then(updatedIds => {
                    expect(updatedIds.length).toBe(0);
                    done();
                })
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

    it("Object is found by object ID",
        done => {
            skipTestIf(!isDbAvailable, "No database server");
            dbContext().findObjectById<DbTestObject>("testobjects", testObjects[0].objectId)
                .then(found => {
                    expect(found.objectId).toBe(testObjects[0].objectId);
                    expect(found.coreType).toBe(testObjects[0].coreType);
                    expect(found.objectType).toBe(testObjects[0].objectType);
                    expect(found.testId).toBe(testObjects[0].testId);
                    done();
                })
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

    it("Object is found by external ID",
        done => {
            skipTestIf(!isDbAvailable, "No database server");
            dbContext().findObjectById<DbTestObject>("testobjects", testObjects[0].externalId, true)
                .then(found => {
                    expect(found.objectId).toBe(testObjects[0].objectId);
                    expect(found.externalId).toBe(testObjects[0].externalId);
                    expect(found.coreType).toBe(testObjects[0].coreType);
                    expect(found.objectType).toBe(testObjects[0].objectType);
                    expect(found.testId).toBe(testObjects[0].testId);
                    done();
                })
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

    it("Found all objects",
        done => {
            skipTestIf(!isDbAvailable, "No database server");

            let resultIndex = 0;
            dbContext().findObjects<DbTestObject>("testobjects")
                // Full iteration without break
                .then(iterator => iterator
                    .forEach((obj, index) => {
                        expect(resultIndex++).toBe(index);
                    }))
                .then(([count, isBreak]) => {
                    expect(isBreak).toBe(false);
                    expect(count).toBe(testObjects.length);
                    done();
                })
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

    it("Join related objects",
        done => {
            skipTestIf(!isDbAvailable, "No database server");

            const filter: DbObjectFilter = {
                conditions: { and: [["testId", filterOp.between(10, 20)]] },
                orderByProperties: [["testObj.testId", "Asc"]],
                take: 3,
            };

            /**
             * Note that the following join conditions perform a self join
             * on the same collection for the sake of keeping the test simple.
             * In real world applications self joins are used seldomly. 
             * For example, they could be used to resolve all direct subobjects
             * related to a superordinate object.
             */
            const joinConditions: DbJoinCondition[] = [
                {
                    fromCollection: "testobjects",
                    fromProperty: "testId",
                    localProperty: "testId",
                    asProperty: "resolvedTestObjects",
                },
                {
                    fromCollection: "testobjects",
                    fromProperty: "externalId",
                    localProperty: "externalId",
                    asProperty: "resolvedExternalObject",
                    isOneToOneRelation: true,
                },
                {
                    fromCollection: "testobjects",
                    fromProperty: "testId",
                    localProperty: "testValue",
                    isLocalPropertyArray: true,
                    asProperty: "resolvedTestValues",
                },
            ];

            dbContext().findObjects<DbTestObject>("testobjects", filter, joinConditions)
                .then(iterator => iterator
                    .forEach((obj, index) => {
                        expect(obj.testId).toBe(10 + index);

                        expect(Array.isArray(obj[joinConditions[0].asProperty])).toBe(true);
                        expect(obj[joinConditions[0].asProperty].length).toBe(1);
                        expect(obj[joinConditions[0].asProperty][0].objectId).toBe(obj.objectId);
                        expect(obj[joinConditions[0].asProperty][0].testId).toBe(obj.testId);

                        expect(obj[joinConditions[1].asProperty].objectId).toBe(obj.objectId);
                        expect(obj[joinConditions[1].asProperty].testId).toBe(obj.testId);

                        expect(Array.isArray(obj[joinConditions[2].asProperty])).toBe(true);
                        expect(obj[joinConditions[2].asProperty].length).toBe(3);
                        expect((<DbTestObject[]>obj[joinConditions[2].asProperty]).some(o => o.objectId === obj.objectId))
                            .toBe(true);
                        expect((<DbTestObject[]>obj[joinConditions[2].asProperty]).some(o => o.testId === obj.testId))
                            .toBe(true);
                    }))
                .then(([count, isBreak]) => {
                    expect(isBreak).toBe(false);
                    expect(count).toBe(3);
                    done();
                })
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

    it("Found objects are fetched in chunks and iterated one by one",
        done => {
            skipTestIf(!isDbAvailable, "No database server");
            let resultIndex = 0;
            const firstTestId = testObjects.length - 20 - 1;
            const filter: DbObjectFilter = {
                conditions: { and: [["testId", filterOp.between(firstTestId, 0)]] },
                orderByProperties: [["testId", "Desc"]],
                skip: 10,
                take: 50,
                shouldFetchInChunks: true,
                fetchSize: 20,      // reduced just for testing
            };

            dbContext().findObjects<DbTestObject>("testobjects", filter)
                // Full iteration without break
                .then(iterator => iterator
                    .forEach((obj, index) => {
                        expect(obj.testId).toBe(firstTestId - filter.skip - index);
                        expect(resultIndex++).toBe(index);
                    }))
                .then(([count, isBreak]) => {
                    expect(isBreak).toBe(false);
                    expect(count).toBe(filter.take);
                    expect(resultIndex).toBe(filter.take);
                })

                // Iteration with break after reading first item
                .then(() => {
                    resultIndex = 0;

                    return dbContext().findObjects<DbTestObject>("testobjects", filter);
                })
                .then(iterator => iterator
                    .forEach((obj, index) => {
                        expect(obj.testId).toBe(firstTestId - filter.skip - index);
                        expect(resultIndex++).toBe(index);
                        return false;
                    }))
                .then(([count, isBreak]) => {
                    expect(isBreak).toBe(true);
                    expect(count).toBe(1);
                    expect(resultIndex).toBe(1);
                    done();
                })
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

    it("Found objects are fetched in chunks and iterated as batch",
        done => {
            skipTestIf(!isDbAvailable, "No database server");
            let resultIndex = 0;
            let batchCount = 0;
            const batchSize = 13;
            const firstTestId = testObjects.length - 20 - 1;
            const filter: DbObjectFilter = {
                conditions: { and: [["testId", filterOp.between(firstTestId, 0)]] },
                orderByProperties: [["testId", "Desc"]],
                skip: 10,
                take: 50,
                shouldFetchInChunks: true,
                fetchSize: 20,      // reduced just for testing
            };

            dbContext().findObjects<DbTestObject>("testobjects", filter)
                // Full iteration without break
                .then(iterator => iterator
                    .forBatch(batch => {
                        batchCount++;
                        batch.forEach((obj, index) => expect(obj.testId)
                            .toBe(firstTestId - filter.skip - resultIndex - index));
                        resultIndex += batch.length;
                    }, batchSize))
                .then(([count, isBreak]) => {
                    expect(isBreak).toBe(false);
                    expect(count).toBe(resultIndex);
                    expect(resultIndex).toBe(filter.take);
                    expect(batchCount).toBe(Math.ceil(filter.take / batchSize));
                })

                // Iteration with break after reading first batch
                .then(() => {
                    resultIndex = 0;
                    batchCount = 0;
                    return dbContext().findObjects<DbTestObject>("testobjects", filter);
                })
                .then(iterator => iterator
                    .forBatch(batch => {
                        batchCount++;
                        batch.forEach((obj, index) => expect(obj.testId)
                            .toBe(firstTestId - filter.skip - resultIndex - index));
                        resultIndex += batch.length;
                        return false;
                    }, batchSize))
                .then(([count, isBreak]) => {
                    expect(isBreak).toBe(true);
                    expect(count).toBe(resultIndex);
                    expect(resultIndex).toBe(batchSize);
                    expect(batchCount).toBe(1);
                    done();
                })
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

    it("Empty result set is fetched in chunks and iterated as empty batch",
        done => {
            skipTestIf(!isDbAvailable, "No database server");
            const filter: DbObjectFilter = {
                conditions: { and: [["testId", filterOp.between(100000, 200000)]] },
                shouldFetchInChunks: true,
            };

            dbContext().findObjects<DbTestObject>("testobjects", filter)
                // Full iteration without break
                .then(iterator => iterator
                    .forBatch(batch => {
                        expect(batch.length).toBe(0);
                    }))
                .then(([count, isBreak]) => {
                    expect(isBreak).toBe(false);
                    expect(count).toBe(0);
                    done();
                })
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

    it("Empty result set is fetched at once and iterated as empty batch",
        done => {
            skipTestIf(!isDbAvailable, "No database server");
            const filter: DbObjectFilter = {
                conditions: { and: [["testId", filterOp.between(100000, 200000)]] },
                shouldFetchInChunks: false,
            };

            dbContext().findObjects<DbTestObject>("testobjects", filter)
                // Full iteration without break
                .then(iterator => iterator
                    .forBatch(batch => {
                        expect(batch.length).toBe(0);
                    }))
                .then(([count, isBreak]) => {
                    expect(isBreak).toBe(false);
                    expect(count).toBe(0);
                    done();
                })
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

    xit("Performance of chunking fetch vs. fetch at once for default fetch size",
        done => {
            skipTestIf(!isDbAvailable, "No database server");
            const filter: DbObjectFilter = {
                shouldFetchInChunks: true,
                fetchSize: 100,
            };

            const iterations = new Array(1000);
            let chunkTime;
            let noChunkTime;
            let startTime = Date.now();
            Async.inSeries(iterations, () =>
                dbContext().findObjects<DbTestObject>("testobjects", filter)
                    .then(iterator => iterator
                        .forBatch(batch => {
                            expect(batch.length).toBe(testObjects.length);
                        }))
                    .then(([count, isBreak]) => {
                        chunkTime = Date.now() - startTime;
                        expect(isBreak).toBe(false);
                        expect(count).toBe(testObjects.length);
                    }))
                .then(() => {
                    startTime = Date.now();
                    return Async.inSeries(iterations, () =>
                        dbContext().findObjects<DbTestObject>("testobjects")
                            .then(iterator => iterator
                                .forBatch(batch => {
                                    expect(batch.length).toBe(testObjects.length);
                                }))
                            .then(([count, isBreak]) => {
                                noChunkTime = Date.now() - startTime;
                                expect(isBreak).toBe(false);
                                expect(count).toBe(testObjects.length);

                            }));
                })
                .then(() => {
                    // iterations x testObjects.length: (in milliseconds)
                    // 10.000 x 100: time chunking fetch     (ms): 26772
                    // 10.000 x 100: time non-chunking fetch (ms): 16646
                    // 10.000 x 1000: time chunking fetch     (ms): 165657
                    // 10.000 x 1000: time non-chunking fetch (ms): 116503
                    // 10.000 x 10000: time chunking fetch     (ms): 1667335
                    // 10.000 x 10000: time non-chunking fetch (ms): 1140963
                    // 1000 x 10000: skip 9000, time chunking fetch     (ms): 20214
                    // 1000 x 10000: skip 9000: time non-chunking fetch (ms): 13706
                    console.log("  time chunking fetch     (ms): " + chunkTime);
                    console.log("  time non-chunking fetch (ms): " + noChunkTime);
                    done();
                })
                .catch(error => failTest(error, done));
        },
        3 * TEST_TIMEOUT);

    it("Objects are queried by Query-Retrieve event pattern",
        done => {
            skipTestIf(!isDbAvailable, "No database server");

            const firstTestId = testObjects.length - 20 - 1;
            const objectFilter: ObjectFilter = {
                conditions: { and: [["testId", filterOp.between(firstTestId, 0)]] },
                orderByProperties: [["testObj.testId", "Desc"]],
                skip: 10,
                take: 50,
            };

            /**
             * Note that the following join conditions perform a self join
             * on the same collection for the sake of keeping the test simple.
             */
            const objectJoinConditions: ObjectJoinCondition[] = [
                {
                    localProperty: "testId",
                    asProperty: "resolvedTestObjects",
                },
                {
                    localProperty: "externalId",
                    asProperty: "resolvedExternalObject",
                    isOneToOneRelation: true,
                },
                {
                    localProperty: "testValue",
                    isLocalPropertyArray: true,
                    asProperty: "resolvedTestValues",
                },
            ];

            container.getController<MockQueryingController>("MockQueryingController")
                .query(objectFilter, objectJoinConditions)
                .pipe(
                    take(1),
                    // Issues an Rx.TimeoutError if no event is emitted within the given interval.
                    timeout(2000),
                )
                .subscribe(event => {
                    const result = event.eventData.objects as DbTestObject[];
                    expect(result.length).toBe(objectFilter.take);
                    if (result.length === objectFilter.take) {
                        let i = 0;
                        let id = firstTestId - objectFilter.skip;
                        let count = 0;
                        while (count < result.length) {
                            expect(result[i].testId).toBe(id);
                            expect(result[i][objectJoinConditions[0].asProperty].length).toBe(1);
                            expect(result[i][objectJoinConditions[0].asProperty][0].objectId).toBe(result[i].objectId);
                            expect(result[i][objectJoinConditions[0].asProperty][0].testId).toBe(result[i].testId);
                            expect(result[i][objectJoinConditions[1].asProperty].objectId).toBe(result[i].objectId);
                            expect(result[i][objectJoinConditions[1].asProperty].externalId).toBe(result[i].externalId);
                            expect(result[i][objectJoinConditions[2].asProperty].length).toBe(3);
                            i++;
                            id--;
                            count++;
                        }
                    }
                    done();
                },
                    error => failTest(error, done));
        },
        TEST_TIMEOUT);

    it("All objects are counted",
        done => {
            skipTestIf(!isDbAvailable, "No database server");
            const filter = {};
            dbContext().countObjects("testobjects", filter)
                .then(count => {
                    expect(count).toBe(testObjects.length);
                    done();
                })
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

    it("Objects are counted by filters",
        done => {
            skipTestIf(!isDbAvailable, "No database server");
            let filter: DbObjectFilter = {
                conditions: {
                    and: [
                        ["testId", filterOp.between(10, 15)],
                        ["testObj.testId", filterOp.between(10, 15)],
                    ],
                },
            };
            dbContext().countObjects("testobjects", filter)
                .then(count => {
                    expect(count).toBe(6);
                })
                .then(() => {
                    filter = {
                        // Matches "20", "21", ..., "29", "30"
                        conditions: ["testText", filterOp.between("3", "20")],
                    };
                    return dbContext().countObjects("testobjects", filter);
                })
                .then(count => {
                    expect(count).toBe(11);
                })
                .then(() => {
                    filter = {
                        // Matches "20", "21", ..., "29", "30"
                        conditions: {
                            and: [
                                ["testText", filterOp.between("3", "20")],
                                ["testObj.testText", filterOp.between("3", "20")],
                            ],
                        },
                    };
                    return dbContext().countObjects("testobjects", filter);
                })
                .then(count => {
                    expect(count).toBe(11);
                })
                .then(() => {
                    filter = {
                        conditions: {
                            and: [
                                ["testObj.noname", filterOp.notEquals(6)],
                                ["testObj.noname", filterOp.equals(undefined)],
                                ["testObj.noname", filterOp.notEquals(undefined)],
                                ["testObj.noname", filterOp.notEquals({ foo: 42 })],
                                ["testObj.noname", filterOp.notEquals([1, 2, 3])],
                                ["testobj.name", filterOp.notEquals(6)],
                                ["testobj.name", filterOp.equals(undefined)],
                                ["testobj.name", filterOp.notEquals(undefined)],
                                ["testobj.name", filterOp.notEquals({ foo: 42 })],
                                ["testobj.name", filterOp.notEquals([1, 2, 3])],
                            ],
                        },
                    };
                    return dbContext().countObjects("testobjects", filter);
                })
                .then(count => {
                    expect(count).toBe(0);
                })
                .then(() => {
                    filter = {
                        conditions: {
                            and: [
                                ["name", filterOp.like("Test % 1_.%")],
                                ["unknown", filterOp.notExists()],
                                ["testObj.name", filterOp.like("Test SubObject %")],
                                [["testObj", "name"], filterOp.like("Test SubObject %")],
                                ["testObj.", filterOp.exists()],
                                ["testobj.name", filterOp.notExists()],
                                ["testObj.noname.noname", filterOp.notExists()],
                                [" ", filterOp.exists()],
                                [" ", filterOp.equals("blank")],
                                ["", filterOp.exists()],
                                [".", filterOp.exists()],
                                ["..", filterOp.exists()],
                                ["..", filterOp.between(10, 19)],
                                [["."], filterOp.exists()],
                                [[".", "."], filterOp.exists()],
                                [[".", ".", "."], filterOp.exists()],
                                [[".", ".", "."], filterOp.between(10, 19)],
                            ],
                        },
                    };
                    return dbContext().countObjects("testobjects", filter);
                })
                .then(count => {
                    expect(count).toBe(10);
                })
                .then(() => {
                    filter = {
                        conditions: {
                            and: [
                                ["testValue", filterOp.equals([10, 11, 12, "foo"])],
                                ["testObj.testValue", filterOp.equals([10, 11, 12, "foo"])],
                            ],
                        },
                    };
                    return dbContext().countObjects("testobjects", filter);
                })
                .then(count => {
                    expect(count).toBe(1);
                })
                .then(() => {
                    filter = {
                        conditions: {
                            and: [
                                ["testValue", filterOp.contains(["foo"])],
                                ["testValue", filterOp.equals([13, 14, 15, "foo"])],
                                ["testId", filterOp.equals(13)],
                                ["testId", filterOp.notEquals(undefined)],
                                ["testObj.testValue", filterOp.contains(["foo"])],
                                ["testObj.testValue", filterOp.equals([13, 14, 15, "foo"])],
                                ["testObj.testId", filterOp.equals(13)],
                                ["testObj.testId", filterOp.notEquals(undefined)],
                            ],
                        },
                    };
                    return dbContext().countObjects("testobjects", filter);
                })
                .then(count => {
                    expect(count).toBe(1);
                })
                .then(() => {
                    filter = {
                        conditions: {
                            and: [
                                ["testValue", filterOp.contains([12, 11, "foo"])],
                                ["testId", filterOp.equals(11)],
                                ["testObj.testValue", filterOp.contains([12, 11, "foo"])],
                                ["testObj.testId", filterOp.equals(11)],
                            ],
                        },
                    };
                    return dbContext().countObjects("testobjects", filter);
                })
                .then(count => {
                    expect(count).toBe(1);
                })
                .then(() => {
                    filter = {
                        conditions: {
                            and: [
                                ["testValue", filterOp.notContains([12, 11])],
                                ["testId", filterOp.notBetween(1, 3)],
                                ["testObj.testValue", filterOp.notContains([12, 11])],
                                ["testObj.testId", filterOp.notBetween(1, 3)],
                            ],
                        },
                    };
                    return dbContext().countObjects("testobjects", filter);
                })
                .then(count => {
                    expect(count).toBe(testObjects.length - 2 - 3);
                })
                .then(() => {
                    filter = {
                        conditions: {
                            or: [
                                ["testValue", filterOp.contains([12, 11])],
                                ["testId", filterOp.between(1, 3)],
                                ["testObj.testValue", filterOp.contains([12, 11])],
                                ["testObj.testId", filterOp.between(1, 3)],
                            ],
                        },
                    };
                    return dbContext().countObjects("testobjects", filter);
                })
                .then(count => {
                    expect(count).toBe(2 + 3);
                })
                .then(() => {
                    filter = {
                        conditions: {
                            and: [
                                ["testId", filterOp.in([1, "2", 4, 3])],
                                ["testId", filterOp.in([3, 4, "5"])],
                                ["testId", filterOp.notIn([4, 5])],
                                ["testObj.testId", filterOp.in([1, "2", 4, 3])],
                                ["testObj.testId", filterOp.in([3, 4, "5"])],
                                ["testObj.testId", filterOp.notIn([4, 5])],
                            ],
                        },
                    };
                    return dbContext().countObjects("testobjects", filter);
                })
                .then(count => {
                    expect(count).toBe(1);
                    done();
                })
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

    it("Object properties are aggregated",
        done => {
            skipTestIf(!isDbAvailable, "No database server");
            let filter: DbObjectFilter = {
                conditions: {
                    and: [
                        ["testId", filterOp.between(10, 20)],
                        ["testObj.testId", filterOp.between(10, 20)],
                    ],
                },
            };
            dbContext().aggregateObjects("testobjects", "testId", AggregateOp.Sum, filter)
                .then(value => {
                    expect(value).toBe(165);
                })
                .then(() => dbContext().aggregateObjects("testobjects", "testObj.testId", AggregateOp.Sum, filter))
                .then(value => {
                    expect(value).toBe(165);
                })
                .then(() => dbContext().aggregateObjects("testobjects", "..", AggregateOp.Sum, filter))
                .then(value => {
                    expect(value).toBe(165);
                })
                .then(() => dbContext().aggregateObjects("testobjects", [".", ".", "."], AggregateOp.Sum, filter))
                .then(value => {
                    expect(value).toBe(165);
                })
                .then(() => {
                    filter = {
                        conditions: {
                            and: [
                                ["testId", filterOp.between(10, 20)],
                                ["testObj.testId", filterOp.between(10, 20)],
                            ],
                        },
                    };
                    return dbContext().aggregateObjects("testobjects", "testId", AggregateOp.Max, filter);
                })
                .then(value => {
                    expect(value).toBe(20);
                })
                .then(() => {
                    filter = {
                        conditions: {
                            and: [
                                ["testid", filterOp.between(10, 20)],
                                ["testobj.testId", filterOp.between(10, 20)],
                            ],
                        },
                    };
                    return dbContext().aggregateObjects("testobjects", "testId", AggregateOp.Max, filter);
                })
                .then(value => {
                    expect(value).toBe(undefined);
                })
                .then(() => {
                    filter = {
                        conditions: {
                            and: [
                                ["testBool", filterOp.equals(true)],
                                ["testObj.testBool", filterOp.equals(true)],
                            ],
                        },
                    };
                    return dbContext().aggregateObjects("testobjects", "testBool", AggregateOp.Every, filter);
                })
                .then(value => {
                    expect(value).toBe(true);
                })
                .then(() => {
                    filter = {
                        conditions: {
                            and: [
                                ["testBool", filterOp.notEquals(true)],
                                ["testObj.testBool", filterOp.notEquals(true)],
                            ],
                        },
                    };
                    return dbContext().aggregateObjects("testobjects", "testBool", AggregateOp.Some, filter);
                })
                .then(value => {
                    expect(value).toBe(false);
                })
                .then(() => {
                    filter = {
                        conditions: {
                            and: [
                                ["testId", filterOp.equals(-1)],
                                ["testObj.testId", filterOp.equals(-1)],
                            ],
                        },
                    };
                    return dbContext().aggregateObjects("testobjects", "testBool", AggregateOp.Avg, filter);
                })
                .then(value => {
                    expect(value).toBe(undefined);
                    done();
                })
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

    it("Objects are deleted by object ID",
        done => {
            skipTestIf(!isDbAvailable, "No database server");
            const deleteIds = [
                testObjects[testObjects.length - 1].objectId,
                testObjects[testObjects.length - 2].objectId,
            ];
            dbContext().deleteObjectsById("testobjects", deleteIds)
                .then(deletedIds => {
                    expect(deletedIds.length).toBe(deleteIds.length);
                    for (const deletedId of deletedIds) {
                        expect(deleteIds.some(id => id === deletedId)).toBe(true);
                    }
                })
                .then(() => dbContext().countObjects("testobjects"))
                .then(count => {
                    expect(count).toBe(testObjects.length - 2);
                    done();
                })
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

    it("Objects are deleted by filter",
        done => {
            skipTestIf(!isDbAvailable, "No database server");
            const filter: DbObjectFilter = {
                conditions: {
                    and: [
                        ["testId", filterOp.equals(testObjects.length - 3)],
                        ["testObj.testId", filterOp.equals(testObjects.length - 3)],
                    ],
                },
            };
            dbContext().deleteObjects("testobjects", filter)
                .then(deletedCount => {
                    expect(deletedCount).toBe(1);
                })
                .then(() => dbContext().countObjects("testobjects"))
                .then(count => {
                    expect(count).toBe(testObjects.length - 3);
                    done();
                })
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

    it("Object operations are committed inside a transaction",
        done => {
            skipTestIf(!isDbAvailable, "No database server");

            const currentName = testObjects[0].name;

            dbContext()
                .transaction(txCtx => {
                    testObjects[0].name += ".x";
                    return txCtx.insertObjects("testobjects", testObjects[0], true)
                        .then(insertedIds => {
                            expect(insertedIds.length).toBe(1);
                        })
                        .then(() => {
                            testObjects[0].name = currentName;
                            return txCtx.updateObjects("testobjects", testObjects[0]);
                        });
                })
                .then(() => dbContext().findObjectById("testobjects", testObjects[0].objectId))
                .then(obj => expect(obj.name).toBe(currentName))
                .then(() => done())
                .catch(rollbackError => failTest(rollbackError, done));
        },
        TEST_TIMEOUT);

    it("Object operations are rolled back inside a transaction",
        done => {
            skipTestIf(!isDbAvailable, "No database server");

            const currentName = testObjects[1].name;

            dbContext()
                .transaction(txCtx => {
                    testObjects[1].name += ".y";
                    return txCtx.insertObjects("testobjects", testObjects[1], true)
                        .then(insertedIds => {
                            expect(insertedIds.length).toBe(1);

                            // Force transaction to roll back
                            throw new Error("forcing transaction rollback");
                        });
                })
                .then(() => failTest(new Error("transaction not rolled back"), done))
                .catch(rollbackError => {
                    dbContext().findObjectById("testobjects", testObjects[1].objectId)
                        .then(obj => {
                            expect(obj.name).toBe(currentName);
                            done();
                        })
                        .catch(error => failTest(error, done));
                });
        },
        TEST_TIMEOUT);

    it("Nested transactions are not supported",
        done => {
            skipTestIf(!isDbAvailable, "No database server");

            const currentName = testObjects[2].name;

            dbContext()
                .transaction(txCtx => {
                    testObjects[2].name += ".z";
                    return txCtx.insertObjects("testobjects", testObjects[2], true)
                        .then(insertedIds => {
                            expect(insertedIds.length).toBe(1);

                            // Attempt to invoke nested transaction will 
                            // roll back the outer transaction
                            return txCtx.transaction(txCtx1 => Promise.resolve());
                        });
                })
                .then(() => failTest(new Error("transaction not rolled back"), done))
                .catch(rollbackError => {
                    dbContext().findObjectById("testobjects", testObjects[2].objectId)
                        .then(obj => {
                            expect(obj.name).toBe(currentName);
                            done();
                        })
                        .catch(error => failTest(error, done));
                });
        },
        TEST_TIMEOUT);

    it("Parallel transactions are supported",
        done => {
            skipTestIf(!isDbAvailable, "No database server");

            const currentName = testObjects[3].name;

            const trans1 = dbContext()
                .transaction(txCtx => {
                    testObjects[3].name = currentName + ".z1";
                    return txCtx.insertObjects("testobjects", testObjects[3], true)
                        .then(insertedIds => {
                            expect(insertedIds.length).toBe(1);
                        });
                });

            const trans2 = dbContext()
                .transaction(txCtx => {
                    testObjects[3].name = currentName + ".z2";
                    return txCtx.insertObjects("testobjects", testObjects[3], true)
                        .then(insertedIds => {
                            expect(insertedIds.length).toBe(1);
                        });
                });

            Promise.all([trans1, trans2])
                .then(() => dbContext().findObjectById("testobjects", testObjects[3].objectId))
                .then(obj => expect((obj.name === currentName + ".z1") ||
                    (obj.name === currentName + ".z2")).toBe(true))
                .then(() => done())
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

    it("Collection is cleared",
        done => {
            skipTestIf(!isDbAvailable, "No database server");
            dbContext().clearCollection("testobjects")
                .then(() => dbContext().countObjects("testobjects"))
                .then(count => {
                    expect(count).toBe(0);
                    done();
                })
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

});
