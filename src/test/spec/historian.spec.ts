/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

/**
 * Test suite for historian.
 */

import {
    CoatyObject,
    Components,
    Configuration,
    Container,
    Snapshot,
} from "../..";
import { DbAdapterFactory, HistorianController } from "../../db";
import { InMemoryAdapter } from "../../db/adapter-in-memory";

import * as mocks from "./historian.mocks";
import { delayAction, failTest } from "./utils";

describe("Historian", () => {

    const TEST_TIMEOUT = 10000;
    const ADAPTER_NAME = "InMemoryAdapter";
    const USE_READABLE_TOPICS = true;

    const components: Components = {
        controllers: {
            MockSnapshotController: mocks.MockSnapshotController,
            HistorianController,
        },
    };

    const configuration: Configuration = {
        common: {},
        communication: {
            brokerUrl: "mqtt://localhost:1898",
            shouldAutoStart: true,
            useReadableTopics: USE_READABLE_TOPICS,
        },
        controllers: {
            HistorianController: {
                shouldAdvertiseSnapshots: true,
                shouldPersistLocalSnapshots: true,
                shouldPersistObservedSnapshots: false,
                shouldReplyToQueries: true,
                database: {
                    key: "testdb",
                    collection: "historian",
                },
            },
        },
        databases: {
            testdb: {
                adapter: ADAPTER_NAME,
                connectionString: "in-memory://coatyjstestdb",
            },
        },
    };

    // Register database adapter before creating database contexts.
    DbAdapterFactory.registerAdapter(ADAPTER_NAME, InMemoryAdapter);

    let container: Container;
    let snapshotController;
    let objectToSnapshot;

    const snapshotCount = 4;

    beforeAll(done => {
        container = Container.resolve(components, configuration);
        snapshotController = container.getController<mocks.MockSnapshotController>("MockSnapshotController");
        objectToSnapshot = {
            objectId: snapshotController.runtime.newUuid(),
            objectType: "com.mydomain.mypackage.MyCustomObjectType",
            coreType: "CoatyObject",
            name: "",
        } as CoatyObject;

        done();
    });

    afterAll(
        done => {
            container.shutdown();

            delayAction(1000, done, () => {
                // give broker time to log output messages
            });
        },
        TEST_TIMEOUT);

    it("all Advertise events on snapshots are received", (done) => {
        const logger: mocks.AdvertiseEventLogger = {
            count: 0,
            eventData: [],
        };

        snapshotController.watchForAdvertiseEvents(logger);

        delayAction(500, undefined, () => {
            for (let i = 1; i <= snapshotCount; i++) {
                objectToSnapshot.name = "mycustomobject_" + i;
                container
                    .getController<HistorianController>("HistorianController")
                    .generateSnapshot(objectToSnapshot, "TAG_MY_CUSTOM_OBJECT");
            }

            delayAction(5000, done, () => {
                expect(logger.count).toBe(snapshotCount);
                expect(logger.eventData.length).toBe(snapshotCount);
                for (let i = 1; i <= snapshotCount; i++) {
                    const snapshot = logger.eventData[i - 1].object as Snapshot;
                    expect(snapshot.name).toBe(
                        `${snapshot.object.objectType} ${snapshot.object.name}`);
                    expect(snapshot.tags.length).toBe(1);
                    expect(snapshot.tags[0]).toBe("TAG_MY_CUSTOM_OBJECT");
                }
            });
        });
    }, TEST_TIMEOUT);

    it("find snapshot objects in database", (done) => {
        const historianController = container.getController<HistorianController>("HistorianController");
        historianController.findSnapshotsByParentId(objectToSnapshot.objectId)
            .then(snapshots => {
                expect(snapshots.length).toBe(snapshotCount);
                for (let i = 0, ts = snapshots[0].creationTimestamp; i < snapshotCount; i++) {
                    const snapshot = snapshots[i];
                    // Note: timestamps of two different adjacent snapshots might be equal!
                    expect(snapshot.creationTimestamp).toBeLessThanOrEqual(ts);
                    ts = snapshot.creationTimestamp;
                    expect(snapshot.name).toBe(
                        `${snapshot.object.objectType} ${snapshot.object.name}`);
                    expect(snapshot.tags.length).toBe(1);
                    expect(snapshot.tags[0]).toBe("TAG_MY_CUSTOM_OBJECT");
                }
            })
            .then(() => done())
            .catch(error => failTest(error, done));
    }, TEST_TIMEOUT);

});
