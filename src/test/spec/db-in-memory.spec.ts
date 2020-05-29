/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

/**
 * Test suite for framework NoSQL database access using InMemoryAdapter
 */

import { take, timeout } from "rxjs/operators";

import {
    CoatyObject,
    Components,
    Configuration,
    Container,
    CoreTypes,
    DbConnectionInfo,
    filterOp,
    ObjectFilter,
    ObjectJoinCondition,
} from "../..";
import {
    AggregateOp,
    DbAdapterFactory,
    DbContext,
    DbJoinCondition,
    DbObjectFilter,
} from "../../db";
import { InMemoryAdapter } from "../../db/adapter-in-memory";

import {
    DbTestObject,
    DbTestObjectManagementController,
    MockQueryingController,
    OBJECT_TYPE_NAME_DB_TEST_OBJECT,
} from "./db.mocks";
import { failTest } from "./utils";

describe("In-Memory NoSQL Database Access", () => {

    const TEST_TIMEOUT = 10000;

    const ADAPTER_NAME = "InMemoryAdapter";

    const components: Components = {
        controllers: {
            DbTestObjectManagementController,
            MockQueryingController,
        },
    };

    const configuration: Configuration = {
        communication: {
            shouldAutoStart: true,
            binding: global["test_binding"],
        },
        databases: {
            testdb: {
                adapter: ADAPTER_NAME,
                connectionString: "in-memory://inmemorytestdb",
            },
        },
    };

    // Register database adapter before creating database contexts.
    DbAdapterFactory.registerAdapter(ADAPTER_NAME, InMemoryAdapter);

    let container: Container;
    let connectionInfo: DbConnectionInfo;
    let dbContext: DbContext;
    let testObjects: DbTestObject[];
    let testObjectsCount: number;

    beforeAll(
        done => {
            container = Container.resolve(components, configuration);
            connectionInfo = container.runtime.databaseOptions["testdb"];
            dbContext = new DbContext(connectionInfo);
            testObjects = [];
            testObjectsCount = 100;

            for (let i = 1; i <= testObjectsCount; i++) {
                const obj: DbTestObject = {
                    "objectId": container.runtime.newUuid(),
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

            done();
        },
        TEST_TIMEOUT);

    afterAll(
        done => {
            container.shutdown();
            done();
        },
        TEST_TIMEOUT);

    it("New collection is created",
        done => {
            dbContext.addCollection("testobjects")
                .then(() => done())
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

    it("New objects are inserted",
        done => {
            dbContext.insertObjects("testobjects", testObjects, false)
                .then(insertedIds => {
                    expect(insertedIds.length).toBe(testObjects.length);
                    done();
                })
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

    it("Existing collection is kept",
        done => {
            dbContext.addCollection("testobjects")
                .then(() => dbContext.countObjects("testobjects"))
                .then(count => expect(count).toBe(testObjects.length))
                .then(() => done())
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

    it("Inserted object replaces existing one",
        done => {
            testObjects[0].name += ".1";
            dbContext.insertObjects("testobjects", testObjects[0], true)
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
            testObjects[0].name += ".2";
            dbContext.insertObjects("testobjects", testObjects[0], false)
                .then(insertedIds => {
                    expect(insertedIds.length).toBe(0);
                    done();
                })
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

    it("Updating existing objects",
        done => {
            testObjects.forEach(obj => obj.name += ".updated");
            dbContext.updateObjects("testobjects", testObjects)
                .then(updatedIds => {
                    expect(updatedIds.length).toBe(testObjects.length);
                    done();
                })
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

    it("Updating property value of existing objects",
        done => {
            const newValue = "set";
            dbContext.updateObjectProperty(
                "testobjects",
                testObjects.map(o => o.objectId),
                "testUpdate",
                newValue)
                .then(() => {
                    dbContext.findObjects<DbTestObject>("testobjects")
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
            dbContext.updateObjects("testobjects", nonExistings)
                .then(updatedIds => {
                    expect(updatedIds.length).toBe(0);
                    done();
                })
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

    it("Object is found by object ID",
        done => {
            dbContext.findObjectById<DbTestObject>("testobjects", testObjects[0].objectId)
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
            dbContext.findObjectById<DbTestObject>("testobjects", testObjects[0].externalId, true)
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
            let resultIndex = 0;
            dbContext.findObjects<DbTestObject>("testobjects")
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

            dbContext.findObjects<DbTestObject>("testobjects", filter, joinConditions)
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

    it("Found objects are iterated one by one",
        done => {
            let resultIndex = 0;
            const firstTestId = testObjects.length - 20 - 1;
            const filter: DbObjectFilter = {
                conditions: { and: [["testId", filterOp.between(firstTestId, 0)]] },
                orderByProperties: [["testId", "Desc"]],
                skip: 10,
                take: 50,
            };

            dbContext.findObjects<DbTestObject>("testobjects", filter)
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

                    done();
                })

                // Iteration with break after reading first item
                .then(() => {
                    resultIndex = 0;
                    return dbContext.findObjects<DbTestObject>("testobjects", filter);
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

    it("Found objects are iterated as batch",
        done => {
            let resultIndex = 0;
            let batchCount = 0;
            const batchSize = 13;
            const firstTestId = testObjects.length - 20 - 1;
            const filter: DbObjectFilter = {
                conditions: { and: [["testId", filterOp.between(firstTestId, 0)]] },
                orderByProperties: [["testId", "Desc"]],
                skip: 10,
                take: 50,
            };

            dbContext.findObjects<DbTestObject>("testobjects", filter)
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
                    return dbContext.findObjects<DbTestObject>("testobjects", filter);
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

    it("Empty result set is iterated as empty batch",
        done => {
            const filter: DbObjectFilter = {
                conditions: { and: [["testId", filterOp.between(100000, 200000)]] },
            };

            dbContext.findObjects<DbTestObject>("testobjects", filter)
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

    it("Objects are queried by Query-Retrieve event pattern",
        done => {
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
                    const result = event.data.objects as DbTestObject[];
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
            const filter = {};
            dbContext.countObjects("testobjects", filter)
                .then(count => {
                    expect(count).toBe(testObjects.length);
                    done();
                })
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

    it("Objects are counted by filters",
        done => {
            let filter: DbObjectFilter = {
                conditions: {
                    and: [
                        ["testId", filterOp.between(10, 15)],
                        ["testObj.testId", filterOp.between(10, 15)],
                    ],
                },
            };
            dbContext.countObjects("testobjects", filter)
                .then(count => {
                    expect(count).toBe(6);
                })
                .then(() => {
                    filter = {
                        // Matches "20", "21", ..., "29", "30"
                        conditions: ["testText", filterOp.between("3", "20")],
                    };
                    return dbContext.countObjects("testobjects", filter);
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
                    return dbContext.countObjects("testobjects", filter);
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
                    return dbContext.countObjects("testobjects", filter);
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
                    return dbContext.countObjects("testobjects", filter);
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
                    return dbContext.countObjects("testobjects", filter);
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
                    return dbContext.countObjects("testobjects", filter);
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
                    return dbContext.countObjects("testobjects", filter);
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
                    return dbContext.countObjects("testobjects", filter);
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
                    return dbContext.countObjects("testobjects", filter);
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
                    return dbContext.countObjects("testobjects", filter);
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
            let filter: DbObjectFilter = {
                conditions: {
                    and: [
                        ["testId", filterOp.between(10, 20)],
                        ["testObj.testId", filterOp.between(10, 20)],
                    ],
                },
            };
            dbContext.aggregateObjects("testobjects", "testId", AggregateOp.Sum, filter)
                .then(value => {
                    expect(value).toBe(165);
                })
                .then(() => dbContext.aggregateObjects("testobjects", "testObj.testId", AggregateOp.Sum, filter))
                .then(value => {
                    expect(value).toBe(165);
                })
                .then(() => dbContext.aggregateObjects("testobjects", "..", AggregateOp.Sum, filter))
                .then(value => {
                    expect(value).toBe(165);
                })
                .then(() => dbContext.aggregateObjects("testobjects", [".", ".", "."], AggregateOp.Sum, filter))
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
                    return dbContext.aggregateObjects("testobjects", "testId", AggregateOp.Max, filter);
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
                    return dbContext.aggregateObjects("testobjects", "testId", AggregateOp.Max, filter);
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
                    return dbContext.aggregateObjects("testobjects", "testBool", AggregateOp.Every, filter);
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
                    return dbContext.aggregateObjects("testobjects", "testBool", AggregateOp.Some, filter);
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
                    return dbContext.aggregateObjects("testobjects", "testBool", AggregateOp.Avg, filter);
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
            const deleteIds = [
                testObjects[testObjects.length - 1].objectId,
                testObjects[testObjects.length - 2].objectId,
            ];
            dbContext.deleteObjectsById("testobjects", deleteIds)
                .then(deletedIds => {
                    expect(deletedIds.length).toBe(deleteIds.length);
                    for (const deletedId of deletedIds) {
                        expect(deleteIds.some(id => id === deletedId)).toBe(true);
                    }
                })
                .then(() => dbContext.countObjects("testobjects"))
                .then(count => {
                    expect(count).toBe(testObjects.length - 2);
                    done();
                })
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

    it("Objects are deleted by filter",
        done => {
            const filter: DbObjectFilter = {
                conditions: {
                    and: [
                        ["testId", filterOp.equals(testObjects.length - 3)],
                        ["testObj.testId", filterOp.equals(testObjects.length - 3)],
                    ],
                },
            };
            dbContext.deleteObjects("testobjects", filter)
                .then(deletedCount => {
                    expect(deletedCount).toBe(1);
                })
                .then(() => dbContext.countObjects("testobjects"))
                .then(count => {
                    expect(count).toBe(testObjects.length - 3);
                    done();
                })
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

    it("Collection is cleared",
        done => {
            dbContext.clearCollection("testobjects")
                .then(() => dbContext.countObjects("testobjects"))
                .then(count => {
                    expect(count).toBe(0);
                    done();
                })
                .catch(error => failTest(error, done));
        },
        TEST_TIMEOUT);

    it("Transactions are not supported",
        done => {
            dbContext.transaction(txCtx => undefined)
                .then(() => failTest(new Error("transaction implemented incorrectly"), done))
                .catch(error => done());
        },
        TEST_TIMEOUT);

});
