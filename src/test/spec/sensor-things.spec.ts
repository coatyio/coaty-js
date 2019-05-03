/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

/**
 * Test suite for Sensors Things API
 */

import { DiscoverEvent } from "../../com";
import { CoreTypes, DisplayType } from "../../model";
import { Components, Configuration, Container } from "../../runtime";
import { SensorThingsTypes } from "../../sensor-things";

import * as mocks from "./sensor-things.mock";
import { SensorThingsCollection } from "./sensor-things.mock";
import { delayAction, Spy } from "./utils";

describe("Sensor things", () => {

    const TEST_TIMEOUT = 10000;
    const USE_READABLE_TOPICS = true;
    const SENSOR_THINGS_TYPES_SET = [
        SensorThingsTypes.OBJECT_TYPE_FEATURE_OF_INTEREST,
        SensorThingsTypes.OBJECT_TYPE_OBSERVATION,
        SensorThingsTypes.OBJECT_TYPE_SENSOR,
        SensorThingsTypes.OBJECT_TYPE_THING,
    ];

    describe("Communication", () => {

        const components1: Components = {
            controllers: {
                MockReceiverController: mocks.MockReceiverController,
            },
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
                brokerUrl: "mqtt://localhost:1898",
                shouldAutoStart: true,
                useReadableTopics: USE_READABLE_TOPICS,
            },
            controllers: {
                MockReceiverController: {
                    shouldAdvertiseIdentity: true,
                },
            },
        };

        const components2: Components = {
            controllers: {
                MockEmitterController: mocks.MockEmitterController,
            },
        };

        const responseDelay = 1000;

        const configuration2: Configuration = {
            common: {
            },
            communication: {
                brokerUrl: "mqtt://localhost:1898",
                shouldAutoStart: true,
                useReadableTopics: USE_READABLE_TOPICS,
            },
            controllers: {
                MockEmitterController: {
                    shouldAdvertiseIdentity: true,
                    name: "MockEmitterController1",
                    responseDelay: responseDelay,
                },
            },
        };

        const components3: Components = {
            controllers: {
                MockEmitterController: mocks.MockEmitterController,
            },
        };

        const configuration3: Configuration = {
            common: {
            },
            communication: {
                brokerUrl: "mqtt://localhost:1898",
                shouldAutoStart: true,
                useReadableTopics: USE_READABLE_TOPICS,
            },
            controllers: {
                MockEmitterController: {
                    shouldAdvertiseIdentity: true,
                    name: "MockEmitterController2",
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
                // Delay publishing to give MockEmitterController time to subscribe
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

        it("All sensorThings objects can be discovered", (done) => {
            const testFunction = (elementArray) => {
                if (elementArray.length === 0) {
                    done();
                    return;
                }
                const element = elementArray.shift();
                expect(() => container2.communicationManager
                    // Note: this Discover request event will never be published because there is 
                    // no subscription on the response observable
                    .publishDiscover(DiscoverEvent.withObjectTypes(
                        container2.getController<mocks.MockEmitterController>("MockEmitterController").identity, [element])))
                    .not.toThrow();
                testFunction(elementArray);
            };
            testFunction(SENSOR_THINGS_TYPES_SET.slice()); // iterate on a copy of the array

        });

        it("All sensorThings objects can be advertised and received", (done) => {

            /** Recursive function going through SensorThingstypesSet to test advertising on each
             * SensorThings object.
             * @note a standard loop can't work because of concurrent access on containers.
             */
            const testFunction = (elementArray) => {
                if (elementArray.length === 0) {
                    done();
                    return;
                }
                const element = elementArray.shift();
                const logger: mocks.AdvertiseEventLogger = {
                    count: 0,
                    eventData: [],
                };
                const eventCount = 5;
                const deviceController = container1.getController<mocks.MockReceiverController>("MockReceiverController");

                deviceController.watchForAdvertiseEvents(logger, element);

                delayAction(500, undefined, () => {
                    container2
                        .getController<mocks.MockEmitterController>("MockEmitterController")
                        .publishAdvertiseEvents(eventCount, element);

                    delayAction(1000, undefined, () => {
                        expect(logger.count).toBe(eventCount);
                        expect(logger.eventData.length).toBe(eventCount);
                        for (let i = 1; i <= eventCount; i++) {
                            expect(logger.eventData[i - 1].object.name).toBe("Advertised_" + i);
                        }
                        testFunction(elementArray); // iterate on a copy of the array

                    });
                });

            };
            testFunction(SENSOR_THINGS_TYPES_SET.slice());

        }, 15 * TEST_TIMEOUT);


        it("All sensorThings objects can be received through Channel", (done) => {
            /** Recursive function going through SensorThingstypesSet to test channel publish on each
             * SensorThings object.
             * @note a standard loop can't work because of concurrent access on containers.
             */
            const testFunction = (elementArray) => {
                if (elementArray.length === 0) {
                    done();
                    return;
                }
                const element = elementArray.shift();
                const deviceController = container1.getController<mocks.MockReceiverController>("MockReceiverController");
                const logger: mocks.ChannelEventLogger = {
                    count: 0,
                    eventData: [],
                };
                const eventCount = 4;
                const channelId = "42";

                deviceController.watchForChannelEvents(logger, channelId);

                delayAction(500, undefined, () => {
                    container2
                        .getController<mocks.MockEmitterController>("MockEmitterController")
                        .publishChannelEvents(eventCount, element, channelId);

                    delayAction(1000, undefined, () => {
                        expect(logger.count).toBe(eventCount);
                        expect(logger.eventData.length).toBe(eventCount);
                        for (let i = 1; i <= eventCount; i++) {
                            expect(logger.eventData[i - 1].object.name).toBe("Channeled_100" + i);
                        }
                        testFunction(elementArray); // iterate on a copy of the array

                    });
                });
            };
            testFunction(SENSOR_THINGS_TYPES_SET.slice());
        }, 15 * TEST_TIMEOUT);

    });

    describe("Validators tests", () => {

        it("All default sensorThings objects are considered as objects", () => {
            expect(CoreTypes.isObject(SensorThingsCollection.featureOfInterest)).toBe(true);
            expect(CoreTypes.isObject(SensorThingsCollection.observation)).toBe(true);
            expect(CoreTypes.isObject(SensorThingsCollection.sensor)).toBe(true);
            expect(CoreTypes.isObject(SensorThingsCollection.thing)).toBe(true);

        }, TEST_TIMEOUT);

        it("All default sensorThings objects are considered as objects after deserialization(serialization())", () => {
            expect(CoreTypes.isObject(JSON.parse(JSON.stringify(SensorThingsCollection.featureOfInterest)))).toBe(true);
            expect(CoreTypes.isObject(JSON.parse(JSON.stringify(SensorThingsCollection.observation)))).toBe(true);
            expect(CoreTypes.isObject(JSON.parse(JSON.stringify(SensorThingsCollection.sensor)))).toBe(true);
            expect(CoreTypes.isObject(JSON.parse(JSON.stringify(SensorThingsCollection.thing)))).toBe(true);

        }, TEST_TIMEOUT);

        it("Validators validate their object", () => {
            expect(SensorThingsTypes.isFeatureOfInterest(SensorThingsCollection.featureOfInterest)).toBe(true);
            expect(SensorThingsTypes.isObservation(SensorThingsCollection.observation)).toBe(true);
            expect(SensorThingsTypes.isSensor(SensorThingsCollection.sensor)).toBe(true);
            expect(SensorThingsTypes.isThing(SensorThingsCollection.thing)).toBe(true);
        }, TEST_TIMEOUT);

        it("Sensor validator validates only its type", () => {
            expect(SensorThingsTypes.isSensor(SensorThingsCollection.featureOfInterest)).toBe(false);
            expect(SensorThingsTypes.isSensor(SensorThingsCollection.location)).toBe(false);
            expect(SensorThingsTypes.isSensor(SensorThingsCollection.sensor)).toBe(true);
            expect(SensorThingsTypes.isSensor(SensorThingsCollection.observation)).toBe(false);
            expect(SensorThingsTypes.isSensor(SensorThingsCollection.thing)).toBe(false);
        });

        it("Sensor with an undefined Unit of Measurement is not valid", () => {
            const sensor = SensorThingsCollection.sensor;
            sensor.unitOfMeasurement = undefined;
            expect(SensorThingsTypes.isSensor(sensor)).toBe(false);
        });

        it("Sensor with an undefined Observed Property is not valid", () => {
            const sensor = SensorThingsCollection.sensor;
            sensor.observedProperty = undefined;
            expect(SensorThingsTypes.isSensor(sensor)).toBe(false);
        });

        it("Feature Of Interest validator validates only its type", () => {
            expect(SensorThingsTypes.isFeatureOfInterest(SensorThingsCollection.featureOfInterest)).toBe(true);
            expect(SensorThingsTypes.isFeatureOfInterest(SensorThingsCollection.location)).toBe(false);
            expect(SensorThingsTypes.isFeatureOfInterest(SensorThingsCollection.sensor)).toBe(false);
            expect(SensorThingsTypes.isFeatureOfInterest(SensorThingsCollection.observation)).toBe(false);
            expect(SensorThingsTypes.isFeatureOfInterest(SensorThingsCollection.thing)).toBe(false);
        });

        it("Observation validator validates only its type", () => {
            expect(SensorThingsTypes.isObservation(SensorThingsCollection.featureOfInterest)).toBe(false);
            expect(SensorThingsTypes.isObservation(SensorThingsCollection.location)).toBe(false);
            expect(SensorThingsTypes.isObservation(SensorThingsCollection.sensor)).toBe(false);
            expect(SensorThingsTypes.isObservation(SensorThingsCollection.observation)).toBe(true);
            expect(SensorThingsTypes.isObservation(SensorThingsCollection.thing)).toBe(false);
        });

        it("Thing validator validates only its type", () => {
            expect(SensorThingsTypes.isThing(SensorThingsCollection.featureOfInterest)).toBe(false);
            expect(SensorThingsTypes.isThing(SensorThingsCollection.location)).toBe(false);
            expect(SensorThingsTypes.isThing(SensorThingsCollection.sensor)).toBe(false);
            expect(SensorThingsTypes.isThing(SensorThingsCollection.observation)).toBe(false);
            expect(SensorThingsTypes.isThing(SensorThingsCollection.thing)).toBe(true);
        });
    });
});
