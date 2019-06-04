/*! Copyright (c) 2019 Siemens AG. Licensed under the MIT License. */

/**
 * Test suite for object lifecycle management.
 */

import { ObjectLifecycleController } from "../../controller";
import { ObjectLifecycleInfo } from "../../controller/object-lifecycle-controller";
import { CoatyObject } from "../../model";
import { Components, Configuration, Container } from "../../runtime";

import { delayAction } from "./utils";

describe("Object Lifecycle Management", () => {

    const TEST_TIMEOUT = 10000;

    const components: Components = {
        controllers: {
            ObjectLifecycleController: ObjectLifecycleController,
        },
    };

    const configuration: Configuration = {
        common: {},
        communication: {
            brokerUrl: "mqtt://localhost:1898",
            shouldAutoStart: true,
        },
    };

    let advertisingContainer: Container;
    let trackingContainer: Container;
    let advertisingController: ObjectLifecycleController;
    let trackingController: ObjectLifecycleController;

    beforeAll(done => {
        advertisingContainer = Container.resolve(components, configuration);
        trackingContainer = Container.resolve(components, configuration);
        advertisingController = advertisingContainer.getController<ObjectLifecycleController>("ObjectLifecycleController");
        trackingController = trackingContainer.getController<ObjectLifecycleController>("ObjectLifecycleController");

        done();
    });

    afterAll(
        done => {
            trackingContainer.shutdown();
            advertisingContainer.shutdown();

            delayAction(1000, done, () => {
                // give broker time to log output messages
            });
        },
        TEST_TIMEOUT);

    it("advertised/discoverable object is tracked until deadvertisement", (done) => {

        const objectToTrack = {
            objectId: advertisingController.runtime.newUuid(),
            objectType: "com.mydomain.mypackage.MyCustomObjectType",
            coreType: "CoatyObject",
            name: "MyCustomObject",
        } as CoatyObject;
        const lifecycleInfo: ObjectLifecycleInfo[] = [];
        const subscription = advertisingController.advertiseDiscoverableObject(objectToTrack);

        delayAction(200, undefined, () => {
            trackingController.observeObjectLifecycleInfoByObjectType("com.mydomain.mypackage.MyCustomObjectType")
                .subscribe(info => {
                    lifecycleInfo.push(info);
                });

            delayAction(200, undefined, () => {
                const originalObjectToTrack = { ...objectToTrack };
                objectToTrack.externalId = "4711";
                advertisingController.readvertiseDiscoverableObject(objectToTrack);

                delayAction(200, undefined, () => {
                    advertisingController.deadvertiseDiscoverableObject(objectToTrack, subscription);

                    delayAction(500, done, () => {
                        expect(objectToTrack.parentObjectId).toBe(advertisingContainer.communicationManager.identity.objectId);

                        expect(lifecycleInfo.length).toBe(3);

                        expect(lifecycleInfo[0].objects.length).toBe(1);
                        expect(lifecycleInfo[0].objects[0]).toEqual(originalObjectToTrack);
                        expect(lifecycleInfo[0].addedIds).toEqual([objectToTrack.objectId]);
                        expect(lifecycleInfo[0].removedIds).toBe(undefined);
                        expect(lifecycleInfo[0].changedIds).toBe(undefined);

                        expect(lifecycleInfo[1].objects.length).toBe(1);
                        expect(lifecycleInfo[1].objects[0]).toEqual(objectToTrack);
                        expect(lifecycleInfo[1].addedIds).toBe(undefined);
                        expect(lifecycleInfo[1].removedIds).toBe(undefined);
                        expect(lifecycleInfo[1].changedIds).toEqual([objectToTrack.objectId]);

                        expect(lifecycleInfo[2].objects.length).toBe(0);
                        expect(lifecycleInfo[2].addedIds).toBe(undefined);
                        expect(lifecycleInfo[2].removedIds).toEqual([objectToTrack.objectId]);
                        expect(lifecycleInfo[2].changedIds).toBe(undefined);
                    });
                });
            });
        });
    }, TEST_TIMEOUT);

    it("advertised/discoverable object is tracked until agent shutdown", (done) => {

        const objectToTrack = {
            objectId: advertisingController.runtime.newUuid(),
            objectType: "com.mydomain.mypackage.MyCustomObjectType",
            coreType: "CoatyObject",
            name: "MyCustomObject",
        } as CoatyObject;
        const lifecycleInfo: ObjectLifecycleInfo[] = [];
        advertisingController.advertiseDiscoverableObject(objectToTrack);

        delayAction(200, undefined, () => {
            trackingController.observeObjectLifecycleInfoByObjectType("com.mydomain.mypackage.MyCustomObjectType")
                .subscribe(info => {
                    lifecycleInfo.push(info);
                });

            delayAction(200, undefined, () => {
                const advertisingAgentIdentityId = advertisingContainer.communicationManager.identity.objectId;
                advertisingContainer.shutdown();

                delayAction(500, done, () => {
                    expect(objectToTrack.parentObjectId).toBe(advertisingAgentIdentityId);

                    expect(lifecycleInfo.length).toBe(2);

                    expect(lifecycleInfo[0].objects.length).toBe(1);
                    expect(lifecycleInfo[0].objects[0]).toEqual(objectToTrack);
                    expect(lifecycleInfo[0].addedIds).toEqual([objectToTrack.objectId]);
                    expect(lifecycleInfo[0].removedIds).toBe(undefined);
                    expect(lifecycleInfo[0].changedIds).toBe(undefined);

                    expect(lifecycleInfo[1].objects.length).toBe(0);
                    expect(lifecycleInfo[1].addedIds).toBe(undefined);
                    expect(lifecycleInfo[1].removedIds).toEqual([objectToTrack.objectId]);
                    expect(lifecycleInfo[1].changedIds).toBe(undefined);
                });
            });
        });
    }, TEST_TIMEOUT);

});
