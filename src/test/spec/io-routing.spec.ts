/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

/**
 * Test suite for framework IO routing.
 */

import { CommunicationManager } from "../../com";
import { CommunicationEventType } from "../../com/communication-event";
import { CommunicationTopic } from "../../com/communication-topic";
import { BasicIoRouter, IoAssociationRule, IoSourceController, RuleBasedIoRouter } from "../../io";
import { CoreTypes, DisplayType, IoActor, IoSource, User } from "../../model";
import { Components, Configuration, Container } from "../../runtime";

import * as mocks from "./io-routing.mocks";
import { delayAction, Spy } from "./utils";

describe("IO Routing", () => {

    describe("IO Value Topic", () => {

        const TEST_TIMEOUT = 10000;

        const components1: Components = {
            controllers: {},
        };

        const configuration1: Configuration = {
            common: {
                associatedUser: {
                    name: "Fred",
                    objectType: CoreTypes.OBJECT_TYPE_USER,
                    coreType: "User",
                    objectId: "f608cdb1-3350-4c62-8feb-4589f26f2efe",
                    names: {
                        givenName: "Fred",
                        familyName: "Feuerstein",
                    },
                },
                associatedDevice: {
                    name: "Fred's Device",
                    coreType: "Device",
                    objectType: CoreTypes.OBJECT_TYPE_DEVICE,
                    objectId: "db02ef91-7024-4cbb-9182-61fa57a8f0eb",
                    displayType: DisplayType.Watch,
                },
            },
            communication: {
                shouldAutoStart: false,
                brokerUrl: "mqtt://localhost:1898",
                useReadableTopics: true,
            },
            controllers: {
            },
        };

        let container: Container;

        beforeAll(done => {
            Spy.reset();

            delayAction(1000, done, () => {
                container = Container.resolve(components1, configuration1);
            });
        });

        afterAll(
            done => {
                container.shutdown();

                Spy.reset();

                delayAction(1000, done, () => {
                    // give Mosca time to log output messages
                });
            },
            TEST_TIMEOUT);

        it("validates external IoValue topics", () => {
            const version = CommunicationManager.PROTOCOL_VERSION;
            expect(CommunicationTopic.isValidIoValueTopic("", version)).toBeFalsy();
            expect(CommunicationTopic.isValidIoValueTopic("+", version)).toBeFalsy();
            expect(CommunicationTopic.isValidIoValueTopic("#", version)).toBeFalsy();
            expect(CommunicationTopic.isValidIoValueTopic("/foo/#", version)).toBeFalsy();
            expect(CommunicationTopic.isValidIoValueTopic("/foo/+/", version)).toBeFalsy();
            expect(CommunicationTopic.isValidIoValueTopic("/foo/bar\u0000/", version)).toBeFalsy();

            expect(CommunicationTopic.isValidIoValueTopic("/", version)).toBeTruthy();
            expect(CommunicationTopic.isValidIoValueTopic("//", version)).toBeTruthy();
            expect(CommunicationTopic.isValidIoValueTopic("foo", version)).toBeTruthy();
            expect(CommunicationTopic.isValidIoValueTopic("/foo/bar", version)).toBeTruthy();
            expect(CommunicationTopic.isValidIoValueTopic("foo/bar/", version)).toBeTruthy();
            expect(CommunicationTopic.isValidIoValueTopic("/coaty/IOVALUE/user/source/token/", version)).toBeTruthy();
            expect(CommunicationTopic.isValidIoValueTopic(
                "coaty/" + CommunicationManager.PROTOCOL_VERSION + "/IOVALUE/user/source/token/",
                version)).toBeTruthy();
        });

        it("validates internal IoValue topics", () => {
            const version = CommunicationManager.PROTOCOL_VERSION;
            let topic = CommunicationTopic.createByLevels(
                configuration1.common.associatedUser,
                "source45567",
                CommunicationEventType.IoValue,
                undefined,
                "token236526",
                CommunicationManager.PROTOCOL_VERSION,
                true).getTopicName();

            expect(CommunicationTopic.isValidIoValueTopic(topic, version)).toBeTruthy();

            topic = CommunicationTopic.createByLevels(
                configuration1.common.associatedUser,
                "source45567",
                CommunicationEventType.IoValue,
                undefined,
                "token236526",
                CommunicationManager.PROTOCOL_VERSION - 1,
                true).getTopicName();
            expect(CommunicationTopic.isValidIoValueTopic(topic, version)).toBeFalsy();

            topic = CommunicationTopic.createByLevels(
                configuration1.common.associatedUser,
                "source45567",
                CommunicationEventType.Advertise,
                "CoatyObject",
                "token236526",
                CommunicationManager.PROTOCOL_VERSION,
                true).getTopicName();
            expect(CommunicationTopic.isValidIoValueTopic(topic, version)).toBeFalsy();

        });

    });

    describe("Basic IO Routing - Single Container", () => {

        const TEST_TIMEOUT = 10000;

        const components1: Components = {
            controllers: {
                MockIoActorController: mocks.MockIoActorController,
                IoSourceController,
                BasicIoRouter,
            },
        };

        const source1: IoSource = {
            name: "Temperature Source 1",
            coreType: "IoSource",
            objectType: CoreTypes.OBJECT_TYPE_IO_SOURCE,
            objectId: "c547e5cd-ef99-4ccd-b109-fc472fc2d421",
            valueType: "coaty.test.Temperature",
        };

        const actor1: IoActor = {
            name: "Temperature Actor 1",
            coreType: "IoActor",
            objectType: CoreTypes.OBJECT_TYPE_IO_ACTOR,
            objectId: "a731fc40-c0f8-486f-b5b6-b653c3cabaea",
            valueType: source1.valueType,
        };

        const configuration1: Configuration = {
            common: {
                associatedUser: {
                    name: "Fred",
                    objectType: CoreTypes.OBJECT_TYPE_USER,
                    coreType: "User",
                    objectId: "f608cdb1-3350-4c62-8feb-4589f26f2efe",
                    names: {
                        givenName: "Fred",
                        familyName: "Feuerstein",
                    },
                },
                associatedDevice: {
                    name: "Fred's Device",
                    coreType: "Device",
                    objectType: CoreTypes.OBJECT_TYPE_DEVICE,
                    objectId: "db02ef91-7024-4cbb-9182-61fa57a8f0eb",
                    displayType: DisplayType.Watch,
                    ioCapabilities: [source1, actor1],
                },
            },
            communication: {
                shouldAutoStart: true,
                brokerUrl: "mqtt://localhost:1898",
                useReadableTopics: true,
            },
            controllers: {
                MockIoActorController: {
                },
                IoSourceController: {
                },
                BasicIoRouter: {
                },
            },
        };

        let container: Container;

        beforeAll(done => {
            Spy.reset();

            delayAction(0, done, () => {
                container = Container.resolve(components1, configuration1);
            });
        });

        afterAll(
            done => {
                Spy.reset();

                delayAction(1000, done, () => {
                    // give Mosca time to log output messages
                });
            },
            TEST_TIMEOUT);

        it("actor receives all values from source", (done) => {
            const actorController = container.getController<mocks.MockIoActorController>("MockIoActorController");
            const sourceController = container.getController<IoSourceController>("IoSourceController");
            const logger: mocks.IoActorLogger = { values: [], stateEvents: [] };
            const emittedValues = [Math.random(), Math.random(), Math.random(), Math.random()];
            const sourceAssociations: boolean[] = [];

            sourceController.observeAssociation(source1)
                .subscribe(isAssociated => {
                    sourceAssociations.push(isAssociated);
                });

            actorController.logActor(actor1, logger);

            delayAction(1000, undefined, () => {
                for (const value of emittedValues) {
                    sourceController.publish<number>(source1, value);
                }

                delayAction(2000, undefined, () => {
                    expect(logger.stateEvents.length).toBe(2);
                    if (logger.stateEvents[0]) {
                        expect(logger.stateEvents[0].eventData.hasAssociations).toBe(false);
                    }
                    if (logger.stateEvents[1]) {
                        expect(logger.stateEvents[1].eventData.hasAssociations).toBe(true);
                    }
                    expect(logger.values.length).toBe(emittedValues.length);
                    for (let i = 0; i < emittedValues.length; i++) {
                        if (logger.values[i]) {
                            expect(logger.values[i]).toBe(emittedValues[i]);
                        }
                    }

                    // This will cause the 3rd state change event (disassociation) on the source
                    container.shutdown();

                    delayAction(1000, done, () => {
                        expect(sourceAssociations.length).toBe(3);
                        if (sourceAssociations.length > 0) {
                            expect(sourceAssociations[0]).toBe(false);
                        }
                        if (sourceAssociations.length > 1) {
                            expect(sourceAssociations[1]).toBe(true);
                        }
                        if (sourceAssociations.length > 2) {
                            expect(sourceAssociations[2]).toBe(false);
                        }
                    });

                });
            });
        }, TEST_TIMEOUT);

    });

    describe("Switching IO Routing - Multiple Containers", () => {

        const TEST_TIMEOUT = 10000;

        const associatedUser: User = {
            name: "Fred",
            objectType: CoreTypes.OBJECT_TYPE_USER,
            coreType: "User",
            objectId: "f608cdb1-3350-4c62-8feb-4589f26f2efe",
            names: {
                givenName: "Fred",
                familyName: "Feuerstein",
            },
        };

        const components1: Components = {
            controllers: { IoSourceController },
        };

        const components2: Components = {
            controllers: {
                MockIoActorController: mocks.MockIoActorController,
            },
        };

        const components3: Components = {
            controllers: {
                MockIoActorController: mocks.MockIoActorController,
            },
        };

        const components4: Components = {
            controllers: { RuleBasedIoRouter },
        };

        const source1: IoSource = {
            name: "Temperature Source 1",
            coreType: "IoSource",
            objectType: CoreTypes.OBJECT_TYPE_IO_SOURCE,
            objectId: "c547e5cd-ef99-4ccd-b109-fc472fc2d421",
            valueType: "coaty.test.Temperature",
        };

        const source2: IoSource = {
            name: "Temperature Source 2",
            coreType: "IoSource",
            objectType: CoreTypes.OBJECT_TYPE_IO_SOURCE,
            objectId: "2e9949f7-a8ef-435b-88a9-527c0a9414c3",
            valueType: source1.valueType,
        };


        const actor1: IoActor = {
            name: "Temperature Actor 1",
            coreType: "IoActor",
            objectType: CoreTypes.OBJECT_TYPE_IO_ACTOR,
            objectId: "a731fc40-c0f8-486f-b5b6-b653c3cabaea",
            valueType: source1.valueType,
        };

        const actor2: IoActor = {
            name: "Temperature Actor 2",
            coreType: "IoActor",
            objectType: CoreTypes.OBJECT_TYPE_IO_ACTOR,
            objectId: "a60a74f3-3d26-446f-a358-911867544944",
            valueType: actor1.valueType,
        };

        const configuration1: Configuration = {
            common: {
                associatedUser: associatedUser,
                associatedDevice: {
                    name: "Fred's Watch Device",
                    coreType: "Device",
                    objectType: CoreTypes.OBJECT_TYPE_DEVICE,
                    objectId: "db02ef91-7024-4cbb-9182-61fa57a8f0eb",
                    displayType: DisplayType.Watch,
                    ioCapabilities: [source1, source2],
                },
            },
            communication: {
                shouldAutoStart: true,
                brokerUrl: "mqtt://localhost:1898",
                useReadableTopics: false,
            },
            controllers: {
                IoSourceController: {
                },
            },
        };

        const configuration2: Configuration = {
            common: {
                associatedUser: associatedUser,
                associatedDevice: {
                    name: "Fred's Arm Device",
                    coreType: "Device",
                    objectType: CoreTypes.OBJECT_TYPE_DEVICE,
                    objectId: "080b1f2e-60d3-47b6-a715-9f14bfc212e8",
                    displayType: DisplayType.Arm,
                    ioCapabilities: [actor1],
                },
            },
            communication: {
                shouldAutoStart: true,
                brokerUrl: "mqtt://localhost:1898",
                useReadableTopics: true,
            },
            controllers: {
                MockIoActorController: {
                },
            },
        };

        const configuration3: Configuration = {
            common: {
                associatedUser: associatedUser,
                associatedDevice: {
                    name: "Fred's Monitor Device",
                    coreType: "Device",
                    objectType: CoreTypes.OBJECT_TYPE_DEVICE,
                    objectId: "de87d219-4a0e-40e0-8f98-2f60f1771444",
                    displayType: DisplayType.Monitor,
                    ioCapabilities: [actor2],
                },
            },
            communication: {
                shouldAutoStart: true,
                brokerUrl: "mqtt://localhost:1898",
                useReadableTopics: true,
            },
            controllers: {
                MockIoActorController: {
                },
            },
        };

        const configuration4: Configuration = {
            common: {
                associatedUser: associatedUser,
            },
            communication: {
                shouldAutoStart: true,
                brokerUrl: "mqtt://localhost:1898",
                useReadableTopics: true,
            },
            controllers: {
                RuleBasedIoRouter: {
                    rules: [
                        {
                            name: "Route sources to Arm device",
                            valueType: source1.valueType,
                            condition: (source, sourceDevice, actor, actorDevice, router) =>
                                !isContextMonitor(router) && actorDevice.displayType === DisplayType.Arm,
                        } as IoAssociationRule,
                        {
                            name: "Route sources to Monitor device",
                            valueType: source1.valueType,
                            condition: (source, sourceDevice, actor, actorDevice, router) =>
                                isContextMonitor(router) && actorDevice.displayType === DisplayType.Monitor,
                        } as IoAssociationRule,
                    ],
                },
            },
        };

        function isContextMonitor(router: RuleBasedIoRouter) {
            return router.findAssociatedDevice(device => device.displayType === DisplayType.Monitor);
        }

        let container1: Container;
        let container2: Container;
        let container3: Container;
        let container4: Container;

        const source1Associations: boolean[] = [];
        const source2Associations: boolean[] = [];

        beforeAll(done => {
            Spy.reset();

            container1 = Container.resolve(components1, configuration1);
            container2 = Container.resolve(components2, configuration2);

            // By design, IO router is set up after all the other containers
            // have been resolved, so that it misses the Advertise device events
            // from the other components. Instead, the IO router issues
            // a Discover event to retrieve associated devices.
            container4 = Container.resolve(components4, configuration4);

            done();
        });

        afterAll(
            done => {
                Spy.reset();

                delayAction(1000, done, () => {
                    // give Mosca time to log output messages
                });
            },
            TEST_TIMEOUT);

        it("actor1 receives all values from both sources", (done) => {
            const actor1Controller = container2.getController<mocks.MockIoActorController>("MockIoActorController");
            const sourceController = container1.getController<IoSourceController>("IoSourceController");
            const logger1: mocks.IoActorLogger = { values: [], stateEvents: [] };
            const emittedValues = [Math.random(), Math.random(), Math.random(), Math.random()];

            sourceController.observeAssociation(source1)
                .subscribe(isAssociated => {
                    source1Associations.push(isAssociated);
                });
            sourceController.observeAssociation(source2)
                .subscribe(isAssociated => {
                    source2Associations.push(isAssociated);
                });

            actor1Controller.logActor(actor1, logger1);

            delayAction(1000, undefined, () => {
                for (const value of emittedValues) {
                    sourceController.publish<number>(source1, value);
                    sourceController.publish<number>(source2, value);
                }

                delayAction(2000, done, () => {
                    expect(logger1.stateEvents.length).toBe(3);
                    if (logger1.stateEvents[0]) {
                        expect(logger1.stateEvents[0].eventData.hasAssociations).toBe(false);
                    }
                    if (logger1.stateEvents[1]) {
                        expect(logger1.stateEvents[1].eventData.hasAssociations).toBe(true);
                    }
                    if (logger1.stateEvents[2]) {
                        expect(logger1.stateEvents[2].eventData.hasAssociations).toBe(true);
                    }
                    expect(logger1.values.length).toBe(emittedValues.length * 2);
                    for (let i = 0; i < emittedValues.length * 2; i += 2) {
                        const value = logger1.values[i];
                        const emittedIndex = emittedValues.findIndex(v => v === value);
                        expect(emittedIndex).not.toBe(-1);
                        if (emittedIndex !== -1) {
                            emittedValues.splice(emittedIndex, 1);
                        }
                    }
                });
            });
        }, TEST_TIMEOUT);

        it("actor2 receives all values from both sources", (done) => {
            // Register Monitor device with actor2
            container3 = Container.resolve(components3, configuration3);

            const actor1Controller = container2.getController<mocks.MockIoActorController>("MockIoActorController");
            const actor2Controller = container3.getController<mocks.MockIoActorController>("MockIoActorController");
            const sourceController = container1.getController<IoSourceController>("IoSourceController");
            const logger1: mocks.IoActorLogger = { values: [], stateEvents: [] };
            const logger2: mocks.IoActorLogger = { values: [], stateEvents: [] };
            const emittedValues = [Math.random(), Math.random(), Math.random(), Math.random()];

            actor1Controller.logActor(actor1, logger1);
            actor2Controller.logActor(actor2, logger2);

            delayAction(1000, undefined, () => {
                for (const value of emittedValues) {
                    sourceController.publish<number>(source1, value);
                    sourceController.publish<number>(source2, value);
                }

                delayAction(2000, undefined, () => {
                    // actor1 should receive 2 Disassociate events for both sources
                    expect(logger1.stateEvents.length).toBe(3);
                    if (logger1.stateEvents[0]) {
                        expect(logger1.stateEvents[0].eventData.hasAssociations).toBe(true);
                    }
                    if (logger1.stateEvents[1]) {
                        expect(logger1.stateEvents[1].eventData.hasAssociations).toBe(false);
                    }
                    if (logger1.stateEvents[2]) {
                        expect(logger1.stateEvents[2].eventData.hasAssociations).toBe(false);
                    }

                    // actor2 should receive 2 Associate events for both sources
                    expect(logger2.stateEvents.length).toBe(3);
                    if (logger2.stateEvents[0]) {
                        expect(logger2.stateEvents[0].eventData.hasAssociations).toBe(false);
                    }
                    if (logger2.stateEvents[1]) {
                        expect(logger2.stateEvents[1].eventData.hasAssociations).toBe(true);
                    }
                    if (logger2.stateEvents[2]) {
                        expect(logger2.stateEvents[2].eventData.hasAssociations).toBe(true);
                    }

                    // actor1 should receive no IO values any more
                    expect(logger1.values.length).toBe(0);

                    // actor2 should receive all IO values after switching context
                    expect(logger2.values.length).toBe(emittedValues.length * 2);
                    for (let i = 0; i < emittedValues.length * 2; i += 2) {
                        const value = logger2.values[i];
                        const emittedIndex = emittedValues.findIndex(v => v === value);
                        expect(emittedIndex).not.toBe(-1);
                        if (emittedIndex !== -1) {
                            emittedValues.splice(emittedIndex, 1);
                        }
                    }

                    // This will cause the final state change events (disassociation) on the sources
                    container1.shutdown();

                    delayAction(1000, done, () => {
                        expect(source1Associations.length).toBe(5);
                        if (source1Associations.length > 0) {
                            expect(source1Associations[0]).toBe(false);
                        }
                        if (source1Associations.length > 1) {
                            expect(source1Associations[1]).toBe(true);
                        }
                        if (source1Associations.length > 2) {
                            expect(source1Associations[2]).toBe(false);
                        }
                        if (source1Associations.length > 3) {
                            expect(source1Associations[3]).toBe(true);
                        }
                        if (source1Associations.length > 4) {
                            expect(source1Associations[4]).toBe(false);
                        }

                        expect(source2Associations.length).toBe(5);
                        if (source2Associations.length > 0) {
                            expect(source2Associations[0]).toBe(false);
                        }
                        if (source2Associations.length > 1) {
                            expect(source2Associations[1]).toBe(true);
                        }
                        if (source2Associations.length > 2) {
                            expect(source2Associations[2]).toBe(false);
                        }
                        if (source2Associations.length > 3) {
                            expect(source2Associations[3]).toBe(true);
                        }
                        if (source2Associations.length > 4) {
                            expect(source2Associations[4]).toBe(false);
                        }

                        container2.shutdown();
                        container3.shutdown();
                        container4.shutdown();
                    });
                });
            });
        }, TEST_TIMEOUT);

    });

});
