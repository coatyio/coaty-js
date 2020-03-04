/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

/**
 * Test suite for framework communication.
 */

import {
    AdvertiseEvent,
    ChannelEvent,
    CoatyObject,
    CommunicationManager,
    CommunicationState,
    Components,
    Configuration,
    Container,
    ContextFilter,
    CoreTypes,
    DiscoverEvent,
    DiscoverEventData,
    filterOp,
    ObjectLifecycleController,
    ObjectLifecycleInfo,
    RemoteCallErrorCode,
    RemoteCallErrorMessage,
    UpdateEvent,
} from "../..";
import { CommunicationEventType } from "../../com/communication-event";
import { CommunicationTopic } from "../../com/communication-topic";

import * as mocks from "./communication.mocks";
import { delayAction, Spy, UUID_REGEX } from "./utils";

describe("Communication", () => {

    describe("Communication Topic", () => {

        const version = CommunicationManager.PROTOCOL_VERSION;
        const namespace = "-";
        const senderId = "3d34eb53-2536-4134-b0cd-8c406b94bb80";
        const oneWayTopic = CommunicationTopic.createByLevels(
            version,
            namespace,
            CommunicationEventType.Advertise,
            "CoatyObject",
            senderId,
            undefined,
        );
        const correlationId = "2eef1124-bf73-49dd-8aba-4abe54251ed9";
        const twoWayTopic = CommunicationTopic.createByLevels(
            version,
            namespace,
            CommunicationEventType.Discover,
            undefined,
            senderId,
            correlationId,
        );

        it("throws on invalid topic structure format", () => {
            expect(() => CommunicationTopic.createByName(oneWayTopic.getTopicName() + "/")).toThrow();
            expect(() => CommunicationTopic.createByName("/" + oneWayTopic.getTopicName())).toThrow();
        });

        it("has correct level structure for one-way event", () => {
            expect(oneWayTopic.sourceId).toBe(senderId);
            expect(oneWayTopic.eventType).toBe(CommunicationEventType.Advertise);
            expect(oneWayTopic.eventTypeName).toBe(`Advertise:CoatyObject`);
            expect(oneWayTopic.correlationId).toBe(undefined);
            expect(oneWayTopic.version).toBe(version);

            const tpc = CommunicationTopic.createByName(oneWayTopic.getTopicName());
            expect(tpc.sourceId).toBe(senderId);
            expect(tpc.eventType).toBe(CommunicationEventType.Advertise);
            expect(tpc.eventTypeName).toBe(`Advertise:CoatyObject`);
            expect(tpc.correlationId).toBe(undefined);
            expect(tpc.version).toBe(version);
        });

        it("has correct level structure for two-way event", () => {
            expect(twoWayTopic.sourceId).toBe(senderId);
            expect(twoWayTopic.eventType).toBe(CommunicationEventType.Discover);
            expect(twoWayTopic.eventTypeName).toBe(`Discover`);
            expect(twoWayTopic.correlationId).toBe(correlationId);
            expect(twoWayTopic.version).toBe(version);

            const tpc = CommunicationTopic.createByName(twoWayTopic.getTopicName());
            expect(tpc.sourceId).toBe(senderId);
            expect(tpc.eventType).toBe(CommunicationEventType.Discover);
            expect(tpc.eventTypeName).toBe(`Discover`);
            expect(tpc.correlationId).toBe(correlationId);
            expect(tpc.version).toBe(version);
        });

        it("has correct filter structure for one-way events", () => {
            const eventType = CommunicationEventType.Advertise;
            const topicFilter = CommunicationTopic
                .getTopicFilter(version, namespace, eventType, "CoatyObject", undefined);
            expect(topicFilter).toBe(`coaty/${version}/${namespace}/ADV:CoatyObject/+`);
        });

        it("has correct filter structure for Associate event", () => {
            const eventType = CommunicationEventType.Associate;
            const eventTypeFilter = "IoGroup1";
            const topicFilter = CommunicationTopic
                .getTopicFilter(version, namespace, eventType, eventTypeFilter, undefined);
            expect(topicFilter).toBe(`coaty/${version}/${namespace}/ASC:${eventTypeFilter}/+`);
        });

        it("has correct filter structure for two-way request events", () => {
            const eventType = CommunicationEventType.Discover;
            const topicFilter = CommunicationTopic
                .getTopicFilter(version, namespace, eventType, undefined, undefined);
            expect(topicFilter).toBe(`coaty/${version}/${namespace}/DSC/+/+`);
        });

        it("has correct filter structure for two-way response events", () => {
            const eventType = CommunicationEventType.Resolve;
            const topicFilter = CommunicationTopic
                .getTopicFilter(version, namespace, eventType, undefined, correlationId);
            expect(topicFilter).toBe(`coaty/${version}/${namespace}/RSV/+/${correlationId}`);
        });

    });

    describe("Event Patterns", () => {

        const TEST_TIMEOUT = 10000;

        const components1: Components = {
            controllers: {
                MockDeviceController1: mocks.MockDeviceController,
                MockOperationsCallController1: mocks.MockOperationsCallController,
            },
        };

        const configuration1: Configuration = {
            common: {
                agentIdentity: { name: "Agent1" },
            },
            communication: {
                brokerUrl: "mqtt://localhost:1898",
                shouldAutoStart: true,
            },
        };

        const components2: Components = {
            controllers: {
                MockObjectController1: mocks.MockObjectController,
                MockOperationsExecutionController1: mocks.MockOperationsExecutionController,
            },
        };

        const responseDelay = 1000;

        const configuration2: Configuration = {
            communication: {
                brokerUrl: "mqtt://localhost:1898",
                shouldAutoStart: true,
            },
            controllers: {
                MockObjectController: {
                    responseDelay: responseDelay,
                },
            },
        };

        const components3: Components = {
            controllers: {
                MockObjectController2: mocks.MockObjectController,
            },
        };

        const configuration3: Configuration = {
            communication: {
                brokerUrl: "mqtt://localhost:1898",
                shouldAutoStart: true,
            },
            controllers: {
                MockObjectController: {
                    responseDelay: responseDelay,
                },
            },
        };

        let container1: Container;
        let container2: Container;
        let container3: Container;

        beforeAll(done => {
            Spy.reset();

            container2 = Container.resolve(components2, configuration2);
            container3 = Container.resolve(components3, configuration3);

            delayAction(1000, done, () => {
                // Delay publishing to give MockObjectControllers time to subscribe
                container1 = Container.resolve(components1, configuration1);
            });
        });

        afterAll(
            done => {
                container1.shutdown();
                container2.shutdown();
                container3.shutdown();

                Spy.reset();

                delayAction(1000, done, () => {
                    // give broker time to log output messages
                });
            },
            TEST_TIMEOUT);

        it("throws on resubscription for response events", (done) => {
            let isResubOkay = false;
            let isResubError = false;
            const myFooObject: CoatyObject = {
                objectId: "77f43e72-1d1e-415d-ab91-079ef2dfb06b",
                name: "Foo",
                coreType: "CoatyObject",
                objectType: "coaty.test.MockObject",
            };
            const obs = container2.communicationManager.publishUpdate(UpdateEvent.withObject(myFooObject));
            const obs1 = container2.communicationManager.publishUpdate(UpdateEvent.withObject(myFooObject));
            let completedObject: CoatyObject;
            const subscription = obs.subscribe(event => completedObject = event.data.object);

            delayAction(responseDelay, null, () => {
                subscription.unsubscribe();
                obs.subscribe(
                    event => { isResubOkay = true; },
                    error => { isResubError = true; });

                expect(completedObject).toEqual(myFooObject);
                expect(isResubOkay).toBeFalsy();
                expect(isResubError).toBeTruthy();

                const subscription1 = obs1.subscribe(event => completedObject = event.data.object);

                delayAction(responseDelay, done, () => {
                    subscription1.unsubscribe();
                    expect(completedObject).toEqual(myFooObject);
                });
            });
        }, TEST_TIMEOUT);

        it("not throws on valid Discover event data", () => {
            expect(() => container2.communicationManager
                // Note: this Discover request event will never be published because there is 
                // no subscription on the response observable
                .publishDiscover(DiscoverEvent.withObjectTypes(["coaty.test.MockObject"])))
                .not.toThrow();
        });

        it("throws on invalid Discover event data", () => {
            expect(() => container2.communicationManager
                .publishDiscover(new DiscoverEvent(
                    new DiscoverEventData(
                        undefined,
                        "6ed0d7fe-c555-409a-bd2c-22f5dfc3f118",
                        undefined,
                        ["User"]))))
                .toThrow();
        });

        it("Discover event yields Resolve events", (done) => {
            delayAction(responseDelay + 2000, done, () => {

                const mockDeviceControllerMatch = UUID_REGEX;
                const mockObjectControllerMatch = UUID_REGEX;

                // Check Discover-Resolve event pattern
                expect(Spy.get("MockDeviceController").value1)
                    .toHaveBeenCalledTimes(2);

                expect(Spy.get("MockDeviceController").value1
                    .calls.argsFor(0)[0].data.object.name)
                    .toMatch(/MockObject_MockObjectController[12]/);
                expect(Spy.get("MockDeviceController").value1
                    .calls.argsFor(0)[0].sourceId)
                    .toMatch(mockObjectControllerMatch);
                expect(Spy.get("MockDeviceController").value1
                    .calls.argsFor(0)[0].eventType)
                    .toBe(CommunicationEventType.Resolve);

                expect(Spy.get("MockDeviceController").value1
                    .calls.argsFor(1)[0].data.object.name)
                    .toMatch(/MockObject_MockObjectController[12]/);
                expect(Spy.get("MockDeviceController").value1
                    .calls.argsFor(1)[0].sourceId)
                    .toMatch(mockObjectControllerMatch);
                expect(Spy.get("MockDeviceController").value1
                    .calls.argsFor(1)[0].eventType)
                    .toBe(CommunicationEventType.Resolve);

                expect(Spy.get("MockObjectController1").value1)
                    .toHaveBeenCalledTimes(1);
                expect(Spy.get("MockObjectController1").value1
                    .calls.argsFor(0)[0].sourceId)
                    .toMatch(mockDeviceControllerMatch);
                expect(Spy.get("MockObjectController1").value1
                    .calls.argsFor(0)[0].eventType)
                    .toBe(CommunicationEventType.Discover);
                expect(Spy.get("MockObjectController1").value1
                    .calls.argsFor(0)[0].data.objectTypes)
                    .toContain("coaty.test.MockObject");

                expect(Spy.get("MockObjectController2").value1)
                    .toHaveBeenCalledTimes(1);
                expect(Spy.get("MockObjectController2").value1
                    .calls.argsFor(0)[0].sourceId)
                    .toMatch(mockDeviceControllerMatch);
                expect(Spy.get("MockObjectController2").value1
                    .calls.argsFor(0)[0].eventType)
                    .toBe(CommunicationEventType.Discover);
                expect(Spy.get("MockObjectController2").value1
                    .calls.argsFor(0)[0].data.objectTypes)
                    .toContain("coaty.test.MockObject");

                // Check state changes of MockDeviceController
                // Note: the third Offline event is not 
                // emitted until the container is shut down.
                expect(Spy.get("MockDeviceController").value2)
                    .toHaveBeenCalledTimes(2);
                expect(Spy.get("MockDeviceController").value2
                    .calls.argsFor(0)[0])
                    .toBe(CommunicationState.Offline);
                expect(Spy.get("MockDeviceController").value2
                    .calls.argsFor(1)[0])
                    .toBe(CommunicationState.Online);

                // Check custom identity properties of communication manager in container1
                expect(container1.identity.name)
                    .toBe("Agent1");
            });
        }, TEST_TIMEOUT);

        it("all Advertise events are received", (done) => {

            const deviceController = container1.getController<mocks.MockDeviceController>("MockDeviceController1");
            const logger: mocks.AdvertiseEventLogger = {
                count: 0,
                eventData: [],
            };
            const eventCount = 4;

            deviceController.watchForAdvertiseEvents(logger);

            delayAction(500, undefined, () => {
                container2
                    .getController<mocks.MockObjectController>("MockObjectController1")
                    .publishAdvertiseEvents(eventCount);

                delayAction(1000, done, () => {
                    expect(logger.count).toBe(eventCount * 2);
                    expect(logger.eventData.length).toBe(eventCount * 2);
                    for (let n = 1, i = 0; n <= eventCount; n++) {
                        expect(logger.eventData[i++].object.name).toBe("Advertised_" + n);
                        expect(logger.eventData[i++].object.name).toBe("Advertised_" + n);
                    }
                });
            });
        }, TEST_TIMEOUT);

        it("throws on invalid Update event objectType", () => {
            expect(() => UpdateEvent.withObject(
                {
                    objectId: container2.runtime.newUuid(),
                    objectType: "foo+/",
                    coreType: "CoatyObject",
                    name: "invalid",
                }))
                .toThrow();
        });

        it("throws on invalid observeUpdateWithObjectType", () => {
            expect(() => container1.communicationManager
                .observeUpdateWithObjectType("foo+/"))
                .toThrow();
        });

        it("throws on invalid Advertise event objectType", () => {
            expect(() => AdvertiseEvent.withObject(
                {
                    objectId: container2.runtime.newUuid(),
                    objectType: "foo+/",
                    coreType: "CoatyObject",
                    name: "invalid",
                }))
                .toThrow();
        });

        it("throws on invalid observeAdvertiseWithObjectType", () => {
            expect(() => container1.communicationManager
                .observeAdvertiseWithObjectType("foo+/"))
                .toThrow();
        });

        it("throws on invalid Channel event identifier", () => {
            expect(() => ChannelEvent.withObject(
                "foo+/",
                {
                    objectId: container2.runtime.newUuid(),
                    objectType: CoreTypes.OBJECT_TYPE_OBJECT,
                    coreType: "CoatyObject",
                    name: "Channeled",
                }))
                .toThrow();
        });

        it("not throws on valid Channel event identifier", () => {
            expect(() => ChannelEvent.withObject(
                "foo_bar-baz",
                {
                    objectId: container2.runtime.newUuid(),
                    objectType: CoreTypes.OBJECT_TYPE_OBJECT,
                    coreType: "CoatyObject",
                    name: "Channeled",
                }))
                .not.toThrow();
        });

        it("all Channel events are received", (done) => {

            const deviceController = container1.getController<mocks.MockDeviceController>("MockDeviceController1");
            const logger: mocks.ChannelEventLogger = {
                count: 0,
                eventData: [],
            };
            const eventCount = 4;
            const channelId = "42";

            deviceController.watchForChannelEvents(logger, channelId);

            delayAction(500, undefined, () => {
                container2
                    .getController<mocks.MockObjectController>("MockObjectController1")
                    .publishChannelEvents(eventCount, channelId);

                delayAction(1000, done, () => {
                    expect(logger.count).toBe(eventCount);
                    expect(logger.eventData.length).toBe(eventCount);
                    for (let i = 1; i <= eventCount; i++) {
                        expect(logger.eventData[i - 1].object.name).toBe("Channeled_" + i);
                    }
                });
            });
        }, TEST_TIMEOUT);

        it("all Call - Return events are handled", (done) => {

            const callController = container1.getController<mocks.MockOperationsCallController>("MockOperationsCallController1");
            const contextFilter1: ContextFilter = { conditions: ["floor", filterOp.between(6, 8)] };
            const contextFilter2: ContextFilter = { conditions: ["floor", filterOp.equals(10)] };
            const logger: mocks.ReturnEventLogger = { eventData: {} };

            delayAction(500, undefined, () => {
                // tslint:disable: max-line-length
                callController.publishCallEvent("coaty.test.switchLight", { state: "on", color: "green" }, contextFilter1, logger, "res11");    // match
                callController.publishCallEvent("coaty.test.switchLight", { state: "on", color: "black" }, contextFilter1, logger, "res12");    // match
                callController.publishCallEvent("coaty.test.switchLight", { state: "on", color: "red" }, contextFilter2, logger, "res13");      // no match
                callController.publishCallEvent("coaty.test.switchLight", { state: "off" }, contextFilter1, logger, "res14");                   // match
                callController.publishCallEvent("coaty.test.switchLight", { state: "off" }, undefined, logger, "res15");                        // no match
                callController.publishCallEvent("coaty.test.add", [42, 43], contextFilter1, logger, "res2");                                    // match
                callController.publishCallEvent("coaty.test.add", [], contextFilter1, logger, "res3");                                          // match
                callController.publishCallEvent("coaty.test.add", [42, 43], undefined, logger, "res4");                                         // no match
                callController.publishCallEvent("coaty.test.xyz", {}, undefined, logger, "res5");                                               // no match
                // tslint:enable: max-line-length

                delayAction(1000, done, () => {
                    const expectedResultCount = 5;
                    expect(Object.keys(logger.eventData).length).toBe(expectedResultCount);

                    expect(logger.eventData.res11.isError).toBe(false);
                    expect(logger.eventData.res11.error).toBeUndefined();
                    expect(logger.eventData.res11.result).toEqual({ color: "green", state: "on" });
                    expect(logger.eventData.res11.executionInfo).toEqual({ duration: 4711 });

                    expect(logger.eventData.res12.isError).toBe(true);
                    expect(logger.eventData.res12.error).toEqual({
                        code: RemoteCallErrorCode.InvalidParameters,
                        message: RemoteCallErrorMessage.InvalidParameters,
                    });
                    expect(logger.eventData.res12.result).toBeUndefined();
                    expect(logger.eventData.res12.executionInfo).toEqual({ duration: 4711 });

                    expect(logger.eventData.res13).toBeUndefined();

                    expect(logger.eventData.res14.isError).toBe(false);
                    expect(logger.eventData.res14.error).toBeUndefined();
                    expect(logger.eventData.res14.result).toEqual({ state: "off" });
                    expect(logger.eventData.res14.executionInfo).toEqual({ duration: 4711 });

                    expect(logger.eventData.res15).toBeUndefined();

                    expect(logger.eventData.res2.isError).toBe(false);
                    expect(logger.eventData.res2.error).toBeUndefined();
                    expect(logger.eventData.res2.result).toEqual(85);
                    expect(logger.eventData.res2.executionInfo).toEqual({ duration: 4712 });

                    expect(logger.eventData.res3.isError).toBe(true);
                    expect(logger.eventData.res3.error).toEqual({
                        code: RemoteCallErrorCode.InvalidParameters,
                        message: RemoteCallErrorMessage.InvalidParameters,
                    });
                    expect(logger.eventData.res3.result).toBeUndefined();
                    expect(logger.eventData.res3.executionInfo).toEqual({ duration: 4712 });

                    expect(logger.eventData.res4).toBeUndefined();

                    expect(logger.eventData.res5).toBeUndefined();
                });
            });
        }, TEST_TIMEOUT);

        it("throws on invalid Raw topics", () => {
            expect(() => container2.communicationManager
                .publishRaw("", "abc"))
                .toThrow();
            expect(() => container2.communicationManager
                .publishRaw("foo/\0", "abc"))
                .toThrow();
            expect(() => container2.communicationManager
                .publishRaw("/foo/+", "abc"))
                .toThrow();
            expect(() => container2.communicationManager
                .publishRaw("/foo/#", "abc"))
                .toThrow();
        });

        it("all Raw topics are received", (done) => {

            const deviceController = container1.getController<mocks.MockDeviceController>("MockDeviceController1");
            const logger1: mocks.RawEventLogger = {
                count: 0,
                eventData: [],
            };
            const logger2: mocks.RawEventLogger = {
                count: 0,
                eventData: [],
            };
            const eventCount = 3;
            const topicFilter1 = "/test/42/";
            const topicFilter2 = `${CommunicationTopic.PROTOCOL_NAME}/#`;
            /* tslint:disable-next-line:max-line-length */
            const topic2 = `${CommunicationTopic.PROTOCOL_NAME}/foo/bar/baz`;

            deviceController.watchForRawEvents(logger1, topicFilter1, topicFilter1);
            deviceController.watchForRawEvents(logger2, topicFilter2, topic2);

            delayAction(500, undefined, () => {
                container2.getController<mocks.MockObjectController>("MockObjectController1")
                    .publishRawEvents(eventCount, topicFilter1);
                container2.getController<mocks.MockObjectController>("MockObjectController1")
                    .publishRawEvents(eventCount, topic2);

                delayAction(1000, done, () => {
                    expect(logger1.count).toBe(eventCount);
                    expect(logger1.eventData.length).toBe(eventCount);
                    for (let i = 1; i <= logger1.count; i++) {
                        expect(logger1.eventData[i - 1][0]).toBe(topicFilter1);
                        expect(logger1.eventData[i - 1][1]).toBe(`${i}`);
                    }
                    expect(logger2.count).toBe(0);
                    expect(logger2.eventData.length).toBe(0);
                });
            });
        }, TEST_TIMEOUT);
    });

    describe("Intra-Container Communication", () => {

        const TEST_TIMEOUT = 10000;

        const components: Components = {
            controllers: {
                MockDeviceController: mocks.MockDeviceController,
                MockObjectController: mocks.MockObjectController,
                ObjectLifecycleController: ObjectLifecycleController,
            },
        };

        const configuration: Configuration = {
            common: {
                agentIdentity: { name: "IntraCommunicationTestContainer" },
            },
            communication: {
                shouldAutoStart: true,
                brokerUrl: "mqtt://localhost:1898",
            },
            controllers: {
                MockDeviceController: {
                },
                MockObjectController: {
                    responseDelay: 0,
                },
            },
        };

        let container: Container;

        beforeAll(done => {
            Spy.reset();

            delayAction(0, done, () => {
                container = Container.resolve(components, configuration);
            });
        });

        afterAll(
            done => {
                container.shutdown();

                Spy.reset();

                delayAction(1000, done, () => {
                    // give broker time to log output messages
                });
            },
            TEST_TIMEOUT);

        it("All objects are tracked by ObjectLifecycleController", (done) => {

            const lifecycleController = container.getController<ObjectLifecycleController>("ObjectLifecycleController");
            const lifecycleInfos = new Map<string, ObjectLifecycleInfo[]>(
                [
                    ["all", []],
                    ["container", []],
                    ["controller", []],
                ]);

            lifecycleController.observeObjectLifecycleInfoByCoreType("Identity")
                .subscribe(info => {
                    lifecycleInfos.get("all").push(info);
                });

            lifecycleController.observeObjectLifecycleInfoByCoreType("Identity", obj => obj.name === "IntraCommunicationTestContainer")
                .subscribe(info => {
                    lifecycleInfos.get("container").push(info);
                });

            lifecycleController.observeObjectLifecycleInfoByCoreType("Identity", obj => obj.name === "MockObjectController")
                .subscribe(info => {
                    lifecycleInfos.get("controller").push(info);
                });

            delayAction(1000, done, () => {
                expect(lifecycleInfos.get("all").length).toBe(1);
                expect(lifecycleInfos.get("all")[0].added.length).toBe(1);
                expect(lifecycleInfos.get("all")[0].added).toContain(container.identity);

                expect(lifecycleInfos.get("container").length).toBe(1);
                expect(lifecycleInfos.get("container")[0].added.length).toBe(1);
                expect(lifecycleInfos.get("container")[0].added).toContain(container.identity);

                // Controllers do not have an identity.
                expect(lifecycleInfos.get("controller").length).toBe(0);
            });
        }, TEST_TIMEOUT);

        it("All Advertise events are received, including echo events", (done) => {

            const deviceController = container.getController<mocks.MockDeviceController>("MockDeviceController");
            const objectController = container.getController<mocks.MockObjectController>("MockObjectController");
            const logger: mocks.AdvertiseEventLogger = {
                count: 0,
                eventData: [],
            };

            deviceController.watchForAdvertiseEvents(logger);

            // To validate that echo events are properly delivered
            objectController.watchForAdvertiseEvents(logger);

            delayAction(1000, undefined, () => {
                objectController.publishAdvertiseEvents(4);

                delayAction(1000, done, () => {
                    expect(logger.count).toBe(4 + 4 + 2 + 2);
                    expect(logger.eventData.length).toBe(logger.count);
                    expect(logger.eventData.filter(e => e.object.name === "Advertised_1").length).toBe(3);
                    expect(logger.eventData.filter(e => e.object.name === "Advertised_2").length).toBe(3);
                    expect(logger.eventData.filter(e => e.object.name === "Advertised_3").length).toBe(3);
                    expect(logger.eventData.filter(e => e.object.name === "Advertised_4").length).toBe(3);
                });
            });
        }, TEST_TIMEOUT);

    });

    describe("Cross-Namespace Communication", () => {

        const TEST_TIMEOUT = 10000;

        const components1: Components = {
            controllers: {
                MockDeviceController: mocks.MockDeviceController,
            },
        };

        const configuration1: Configuration = {
            common: {
                agentIdentity: { name: "CrossNamespaceTestContainer" },
            },
            communication: {
                namespace: "my-namespace-1",
                shouldAutoStart: true,
                brokerUrl: "mqtt://localhost:1898",
            },
            controllers: {
                MockDeviceController: {
                },
            },
        };

        const components2: Components = {
            controllers: {
                MockObjectController: mocks.MockObjectController,
            },
        };

        const configuration2: Configuration = {
            common: {
                agentIdentity: { name: "CrossNamespaceTestContainer" },
            },
            communication: {
                namespace: "my-namespace-2",
                shouldAutoStart: true,
                brokerUrl: "mqtt://localhost:1898",
            },
            controllers: {
                MockObjectController: {
                    responseDelay: 0,
                },
            },
        };

        let container1: Container;
        let container2: Container;

        beforeAll(done => {
            Spy.reset();

            delayAction(0, done, () => {
                container1 = Container.resolve(components1, configuration1);
                container2 = Container.resolve(components2, configuration2);
            });
        });

        afterAll(
            done => {
                container1.shutdown();
                container2.shutdown();

                Spy.reset();

                delayAction(1000, done, () => {
                    // give broker time to log output messages
                });
            },
            TEST_TIMEOUT);

        it("All events between different namespaces are blocked by default", (done) => {

            const deviceController = container1.getController<mocks.MockDeviceController>("MockDeviceController");
            const objectController = container2.getController<mocks.MockObjectController>("MockObjectController");
            const logger: mocks.AdvertiseEventLogger = {
                count: 0,
                eventData: [],
            };

            deviceController.watchForAdvertiseEvents(logger);

            delayAction(1000, undefined, () => {
                objectController.publishAdvertiseEvents(1);

                delayAction(1000, done, () => {
                    expect(logger.count).toBe(0);
                    expect(logger.eventData.length).toBe(logger.count);
                });
            });
        }, TEST_TIMEOUT);

        it("All events between different namespaces are delivered if cross-namespacing is enabled", (done) => {

            const deviceController = container1.getController<mocks.MockDeviceController>("MockDeviceController");
            const objectController = container2.getController<mocks.MockObjectController>("MockObjectController");
            const logger: mocks.AdvertiseEventLogger = {
                count: 0,
                eventData: [],
            };

            container1.communicationManager.restart({ shouldEnableCrossNamespacing: true })
                .then(() => {
                    // Observes both core type and object type, so two events are received.
                    deviceController.watchForAdvertiseEvents(logger);

                    delayAction(1000, undefined, () => {
                        objectController.publishAdvertiseEvents(1);

                        delayAction(1000, done, () => {
                            expect(logger.count).toBe(2);
                            expect(logger.eventData.length).toBe(logger.count);
                            expect(logger.eventData.filter(e => e.object.name === "Advertised_1").length).toBe(2);
                        });
                    });
                });
        }, TEST_TIMEOUT);

    });

});
