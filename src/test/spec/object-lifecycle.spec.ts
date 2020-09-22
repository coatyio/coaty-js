/*! Copyright (c) 2019 Siemens AG. Licensed under the MIT License. */

/**
 * Test suite for object lifecycle management controller.
 */

import { CoatyObject, Components, Configuration, Container, ObjectLifecycleController, ObjectLifecycleInfo } from "../..";

import { delayAction } from "./utils";

describe("Object Lifecycle Management", () => {

    const TEST_TIMEOUT = 10000;

    const components: Components = {
        controllers: {
            ObjectLifecycleController: ObjectLifecycleController,
        },
    };

    const configuration: Configuration = {
        communication: {
            shouldAutoStart: true,
            binding: global["test_binding"],
        },
    };

    let lifecycleInfo1: ObjectLifecycleInfo[] = [];
    let lifecycleInfo2: ObjectLifecycleInfo[] = [];

    let advertisingContainer: Container;
    let trackingContainer1: Container;
    let trackingContainer2: Container;
    let advertisingController: ObjectLifecycleController;
    let trackingController1: ObjectLifecycleController;
    let trackingController2: ObjectLifecycleController;

    beforeAll(done => {
        advertisingContainer = Container.resolve(components, configuration);
        trackingContainer1 = Container.resolve(components, configuration);
        trackingContainer2 = Container.resolve(components, configuration);
        advertisingController = advertisingContainer.getController<ObjectLifecycleController>("ObjectLifecycleController");
        trackingController1 = trackingContainer1.getController<ObjectLifecycleController>("ObjectLifecycleController");
        trackingController2 = trackingContainer2.getController<ObjectLifecycleController>("ObjectLifecycleController");

        done();
    });

    afterAll(
        done => {
            trackingContainer1.shutdown();
            trackingContainer2.shutdown();
            advertisingContainer.shutdown();

            delayAction(1000, done, () => {
                // Give infrastructure time for logging.
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
        const subscription = advertisingController.advertiseDiscoverableObject(objectToTrack);

        delayAction(500, undefined, () => {
            trackingController1.observeObjectLifecycleInfoByObjectType("com.mydomain.mypackage.MyCustomObjectType")
                .subscribe(info => {
                    lifecycleInfo1.push(info);
                });
            trackingController2.observeObjectLifecycleInfoByObjectType("com.mydomain.mypackage.MyCustomObjectType")
                .subscribe(info => {
                    lifecycleInfo2.push(info);
                });

            delayAction(500, undefined, () => {
                const originalObjectToTrack = { ...objectToTrack };
                objectToTrack.externalId = "4711";
                advertisingController.readvertiseDiscoverableObject(objectToTrack);

                delayAction(500, undefined, () => {
                    advertisingController.deadvertiseDiscoverableObject(objectToTrack, subscription);

                    delayAction(500, done, () => {
                        expect(objectToTrack.parentObjectId).toBe(advertisingContainer.identity.objectId);

                        for (const lifecycleInfo of [lifecycleInfo1, lifecycleInfo2]) {
                            expect(lifecycleInfo.length).toBe(3);

                            expect(lifecycleInfo[0].added.length).toBe(1);
                            expect(lifecycleInfo[0].added).toContain(originalObjectToTrack);
                            expect(lifecycleInfo[0].changed).toBe(undefined);
                            expect(lifecycleInfo[0].removed).toBe(undefined);

                            expect(lifecycleInfo[1].changed.length).toBe(1);
                            expect(lifecycleInfo[1].added).toBe(undefined);
                            expect(lifecycleInfo[1].changed).toContain(objectToTrack);
                            expect(lifecycleInfo[1].removed).toBe(undefined);

                            expect(lifecycleInfo[2].removed.length).toBe(1);
                            expect(lifecycleInfo[2].added).toBe(undefined);
                            expect(lifecycleInfo[2].changed).toBe(undefined);
                            expect(lifecycleInfo[2].removed).toContain(objectToTrack);
                        }
                    });
                });
            });
        });
    }, TEST_TIMEOUT);

    it("advertised/discoverable object is tracked until agent shutdown", (done) => {

        lifecycleInfo1 = [];
        lifecycleInfo2 = [];

        const objectToTrack = {
            objectId: advertisingController.runtime.newUuid(),
            objectType: "com.mydomain.mypackage.MyCustomObjectType",
            coreType: "CoatyObject",
            name: "MyCustomObject",
        } as CoatyObject;
        advertisingController.advertiseDiscoverableObject(objectToTrack);

        delayAction(1000, undefined, () => {
            const advertisingAgentIdentityId = advertisingContainer.identity.objectId;
            advertisingContainer.shutdown();

            delayAction(3000, done, () => {
                expect(objectToTrack.parentObjectId).toBe(advertisingAgentIdentityId);

                for (const lifecycleInfo of [lifecycleInfo1, lifecycleInfo2]) {
                    expect(lifecycleInfo.length).toBe(2);

                    expect(lifecycleInfo[0].added.length).toBe(1);
                    expect(lifecycleInfo[0].added).toContain(objectToTrack);
                    expect(lifecycleInfo[0].changed).toBe(undefined);
                    expect(lifecycleInfo[0].removed).toBe(undefined);

                    expect(lifecycleInfo[1].removed.length).toBe(1);
                    expect(lifecycleInfo[1].removed).toContain(objectToTrack);
                    expect(lifecycleInfo[1].added).toBe(undefined);
                    expect(lifecycleInfo[1].changed).toBe(undefined);
                }
            });
        });
    }, TEST_TIMEOUT);

});
