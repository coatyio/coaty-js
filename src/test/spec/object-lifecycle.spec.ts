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

                    expect(lifecycleInfo[0].added.length).toBe(1);
                    expect(lifecycleInfo[0].added).toContain(objectToTrack);
                    expect(lifecycleInfo[0].changed).toBe(undefined);
                    expect(lifecycleInfo[0].removed).toBe(undefined);

                    expect(lifecycleInfo[1].removed.length).toBe(1);
                    expect(lifecycleInfo[1].added).toBe(undefined);
                    expect(lifecycleInfo[1].changed).toBe(undefined);
                    expect(lifecycleInfo[1].removed).toContain(objectToTrack);
                });
            });
        });
    }, TEST_TIMEOUT);

});
