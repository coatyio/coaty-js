/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

/**
 * Test suite for framework IO routing.
 */

import {
    Components,
    Configuration,
    Container,
    CoreTypes,
    IoActor,
    IoContext,
    IoSource,
    Runtime,
} from "../..";
import { BasicIoRouter, IoAssociationRule, IoSourceController, RuleBasedIoRouter } from "../../io-routing";

import * as mocks from "./io-routing.mocks";
import { delayAction, Spy } from "./utils";

describe("IO Routing", () => {

    describe("IO Value Topic", () => {

        const TEST_TIMEOUT = 10000;

        const components1: Components = {
            controllers: {},
        };

        const configuration1: Configuration = {
            communication: {
                shouldAutoStart: false,
                binding: global["test_binding"],
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
                    // give broker time to log output messages
                });
            },
            TEST_TIMEOUT);
    });

    describe("Basic IO Routing within a single Container", () => {

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
            valueType: "coaty.test.Temperature[Celsius]",
        };

        const actor1: IoActor = {
            name: "Temperature Actor 1",
            coreType: "IoActor",
            objectType: CoreTypes.OBJECT_TYPE_IO_ACTOR,
            objectId: "a731fc40-c0f8-486f-b5b6-b653c3cabaea",
            valueType: source1.valueType,
        };

        const ioContext: IoContext = {
            name: "TemperatureMeasurement",
            coreType: "IoContext",
            objectType: CoreTypes.OBJECT_TYPE_IO_CONTEXT,
            objectId: Runtime.newUuid(),
        };

        const configuration1: Configuration = {
            common: {
                ioContextNodes: {
                    TemperatureMeasurement: {
                        ioSources: [source1],
                        ioActors: [actor1],
                    },
                },
            },
            communication: {
                shouldAutoStart: true,
                binding: global["test_binding"],
            },
            controllers: {
                BasicIoRouter: {
                    ioContext,
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
                    // give broker time to log output messages
                });
            },
            TEST_TIMEOUT);

        it("actor receives all values from source", (done) => {
            const actorController = container.getController<mocks.MockIoActorController>("MockIoActorController");
            const sourceController = container.getController<IoSourceController>("IoSourceController");
            const logger = new mocks.IoActorLogger();
            const emittedValues = [Math.random(), Math.random(), Math.random(), Math.random()];
            const sourceAssociations: boolean[] = [];

            sourceController.observeAssociation(source1)
                .subscribe(isAssociated => sourceAssociations.push(isAssociated));

            actorController.logActor(actor1, logger);

            delayAction(1000, undefined, () => {
                for (const value of emittedValues) {
                    sourceController.publish<number>(source1, value);
                }

                delayAction(1000, undefined, () => {
                    expect(logger.associations.length).toBe(2);
                    expect(logger.associations[0]).toBe(false);
                    expect(logger.associations[1]).toBe(true);
                    expect(logger.values.length).toBe(emittedValues.length);
                    for (let i = 0; i < logger.values.length; i++) {
                        expect(logger.values[i]).toBe(emittedValues[i]);
                    }

                    // This will cause a 3rd state change event (disassociation) on the source,
                    // but when the Associate event is received, its observable has already been
                    // completed so the event is not dispatched.
                    container.shutdown();

                    delayAction(1000, done, () => {
                        expect(sourceAssociations.length).toBe(2);
                        expect(sourceAssociations[0]).toBe(false);
                        expect(sourceAssociations[1]).toBe(true);
                    });

                });
            });
        }, TEST_TIMEOUT);

    });

    describe("IO Routing across containers", () => {

        const TEST_TIMEOUT = 10000;

        const components1: Components = {
            controllers: {
                IoSourceController,
                MockIoContextController: mocks.MockIoContextController,
            },
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
            controllers: {
                RuleBasedIoRouter,
                MockIoActorController: mocks.MockIoActorController,
            },
        };

        const ioContext = {
            name: "TemperatureMeasurement",
            coreType: "IoContext",
            objectType: "coaty.test.TemperatureIoContext",
            objectId: Runtime.newUuid(),

            // Either "normal" or "emergency"
            operatingState: "normal",
        } as IoContext;

        const source1: IoSource = {
            name: "Temperature Source 1",
            coreType: "IoSource",
            objectType: CoreTypes.OBJECT_TYPE_IO_SOURCE,
            objectId: "c547e5cd-ef99-4ccd-b109-fc472fc2d421",
            valueType: "coaty.test.Temperature[Celsius]",
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

        const actor3: IoActor = {
            name: "Non-Temperature Actor 3",
            coreType: "IoActor",
            objectType: CoreTypes.OBJECT_TYPE_IO_ACTOR,
            objectId: "ffcf807e-1758-4108-a53e-2428cef6fae9",
            // IO value type is incompatible with sources value type.
            // No values should ever be emitted for this actor.
            valueType: "coaty.test.Velocity[m/s]",
        };

        const configuration1: Configuration = {
            common: {
                ioContextNodes: {
                    TemperatureMeasurement: {
                        ioSources: [source1, source2],
                    },
                },
            },
            communication: {
                shouldAutoStart: true,
                binding: global["test_binding"],
            },
        };

        const configuration2: Configuration = {
            common: {
                ioContextNodes: {
                    TemperatureMeasurement: {
                        ioActors: [actor1],
                        characteristics: {
                            isResponsibleForOperatingState: "normal",
                        },
                    },
                },
            },
            communication: {
                shouldAutoStart: true,
                binding: global["test_binding"],
            },
        };

        const configuration3: Configuration = {
            common: {
                ioContextNodes: {
                    TemperatureMeasurement: {
                        ioActors: [actor2],
                        characteristics: {
                            isResponsibleForOperatingState: "emergency",
                        },
                    },
                },
            },
            communication: {
                shouldAutoStart: true,
                binding: global["test_binding"],
            },
        };

        const configuration4: Configuration = {
            common: {
                ioContextNodes: {
                    TemperatureMeasurement: {
                        ioActors: [actor3],
                        characteristics: {
                            isResponsibleForOperatingState: "normal",
                        },
                    },
                },
            },
            communication: {
                shouldAutoStart: true,
                binding: global["test_binding"],
            },
            controllers: {
                RuleBasedIoRouter: {
                    ioContext,
                    rules: [
                        {
                            name: "Route temperature sources to normal actors if operating state is normal",
                            valueType: source1.valueType,
                            condition: (source, sourceNode, actor, actorNode, context, router) =>
                                actorNode.characteristics?.isResponsibleForOperatingState === "normal" &&
                                context["operatingState"] === "normal",
                        } as IoAssociationRule,
                        {
                            name: "Route temperature sources to emergency actors if operating state is emergency",
                            valueType: source1.valueType,
                            condition: (source, sourceNode, actor, actorNode, context, router) =>
                                actorNode.characteristics?.isResponsibleForOperatingState === "emergency" &&
                                context["operatingState"] === "emergency",
                        } as IoAssociationRule,
                    ],
                },
            },
        };

        let container1: Container;
        let container2: Container;
        let container3: Container;
        let container4: Container;

        beforeAll(done => {
            Spy.reset();

            container1 = Container.resolve(components1, configuration1);
            container2 = Container.resolve(components2, configuration2);
            container3 = Container.resolve(components3, configuration3);
            container4 = Container.resolve(components4, configuration4);

            done();
        });

        afterAll(
            done => {
                Spy.reset();

                delayAction(1000, done, () => {
                    // give broker time to log output messages
                });
            },
            TEST_TIMEOUT);

        it("actors receive values depending on context", (done) => {
            const ioContextController = container1.getController<mocks.MockIoContextController>("MockIoContextController");
            const actor1Controller = container2.getController<mocks.MockIoActorController>("MockIoActorController");
            const actor2Controller = container3.getController<mocks.MockIoActorController>("MockIoActorController");
            const actor3Controller = container4.getController<mocks.MockIoActorController>("MockIoActorController");
            const sourceController = container1.getController<IoSourceController>("IoSourceController");
            const logger1 = new mocks.IoActorLogger();
            const logger2 = new mocks.IoActorLogger();
            const logger3 = new mocks.IoActorLogger();
            const emittedValues1 = [Math.random(), Math.random(), Math.random()];
            const emittedValues2 = [Math.random(), Math.random(), Math.random()];
            const source1Associations: boolean[] = [];
            const source2Associations: boolean[] = [];

            sourceController.observeAssociation(source1)
                .subscribe(isAssociated => source1Associations.push(isAssociated));
            sourceController.observeAssociation(source2)
                .subscribe(isAssociated => source2Associations.push(isAssociated));

            actor1Controller.logActor(actor1, logger1);
            actor2Controller.logActor(actor2, logger2);
            actor3Controller.logActor(actor3, logger3);

            delayAction(500, undefined, () => {
                ioContextController.discoverIoContext(ioContext.objectType);

                for (let i = 0; i < emittedValues1.length; i++) {
                    sourceController.publish<number>(source1, emittedValues1[i]);
                    sourceController.publish<number>(source2, emittedValues2[i]);
                }

                delayAction(500, undefined, () => {
                    // actor1 receives all IO values in normal operating state
                    expect(logger1.associations.length).toBe(2);    // including initial value (false, because disassociated)
                    expect(logger1.associations[0]).toBe(false);
                    expect(logger1.associations[1]).toBe(true);
                    expect(logger1.values.length).toBe(emittedValues1.length + emittedValues2.length);
                    for (let i = 0; i < logger1.values.length; i++) {
                        expect(logger1.values[i]).toBe(i % 2 === 0 ?
                            emittedValues1[Math.floor(i / 2)] :
                            emittedValues2[Math.floor(i / 2)]);
                    }

                    // actor2 receives no IO values in normal operating state
                    expect(logger2.associations.length).toBe(1);    // initial value (false, because disassociated)
                    expect(logger2.associations[0]).toBe(false);
                    expect(logger2.values.length).toBe(0);

                    // actor3 receives no IO values because its value type is incompatible
                    expect(logger3.associations.length).toBe(1);    // initial value (false, because disassociated)
                    expect(logger3.associations[0]).toBe(false);
                    expect(logger3.values.length).toBe(0);

                    // Now switch the context to emergency operation and publish the same IO values again
                    logger1.reset();
                    logger2.reset();
                    logger3.reset();
                    ioContextController.changeIoContext("emergency");

                    delayAction(500, undefined, () => {

                        for (let i = 0; i < emittedValues1.length; i++) {
                            sourceController.publish<number>(source1, emittedValues1[i]);
                            sourceController.publish<number>(source2, emittedValues2[i]);
                        }

                        delayAction(500, undefined, () => {

                            // actor1 receives no IO values in emergency operating state
                            expect(logger1.associations.length).toBe(1);    // disassociated by context change
                            expect(logger1.associations[0]).toBe(false);
                            expect(logger1.values.length).toBe(0);

                            // actor2 receives all IO values in emergency operating state
                            expect(logger2.associations.length).toBe(1);    // associated by context change
                            expect(logger2.associations[0]).toBe(true);
                            expect(logger2.values.length).toBe(emittedValues1.length + emittedValues2.length);
                            for (let i = 0; i < logger2.values.length; i++) {
                                expect(logger2.values[i]).toBe(i % 2 === 0 ?
                                    emittedValues1[Math.floor(i / 2)] :
                                    emittedValues2[Math.floor(i / 2)]);
                            }

                            // actor3 receives no IO values because its value type is incompatible
                            expect(logger3.associations.length).toBe(0);
                            expect(logger3.values.length).toBe(0);

                            logger1.reset();
                            logger2.reset();
                            logger3.reset();

                            // This will cause the final state change events (disassociation) on the sources,
                            // but when the Associate event is received, its observable has already been
                            // completed so the event is not dispatched.
                            container1.shutdown();

                            delayAction(500, undefined, () => {
                                expect(source1Associations.length).toBe(4);
                                expect(source1Associations[0]).toBe(false);     // initial
                                expect(source1Associations[1]).toBe(true);      // associate with actor1
                                expect(source1Associations[2]).toBe(false);     // disassociate with actor1
                                expect(source1Associations[3]).toBe(true);      // associate with actor2

                                expect(source2Associations.length).toBe(4);
                                expect(source2Associations[0]).toBe(false);     // initial
                                expect(source2Associations[1]).toBe(true);      // associate with actor1
                                expect(source2Associations[2]).toBe(false);     // disassociate with actor1
                                expect(source2Associations[3]).toBe(true);      // associate with actor2

                                container2.shutdown();
                                container3.shutdown();
                                container4.shutdown();

                                delayAction(500, done, () => {

                                    expect(logger1.associations.length).toBe(0);    // not associated on shutdown
                                    expect(logger2.associations.length).toBe(1);    // disassociated on shutdown
                                    expect(logger2.associations[0]).toBe(false);
                                    expect(logger3.associations.length).toBe(0);    // not associated on shutdown
                                });
                            });
                        });
                    });
                });
            });
        }, TEST_TIMEOUT);

    });

});
