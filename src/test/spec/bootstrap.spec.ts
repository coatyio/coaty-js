/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

/**
 * Test suite for framework bootstrapping.
 */

import { Components, Configuration, Container, mergeConfigurations, Runtime } from "../..";
import { MulticastDnsDiscovery, NodeUtils } from "../../runtime-node";

import * as mocks from "./bootstrap.mocks";
import { delayAction, failTest, getConfigFile, getConfigUrl, Spy, UUID_REGEX } from "./utils";

describe("Bootstrapping", () => {

    const myMulticastDnsServiceName = "My mDNS Test Service";
    const myMulticastDnsServiceType = "coaty-test";
    const myMulticastDnsServicePort = 4711;
    const myMulticastDnsServiceHostname = "My mDNS Service Hostname";

    const containers: Container[] = [];
    const addContainer = (c: Container) => {
        containers.push(c);
        return c;
    };

    const components: Components = {
        controllers: {
            MockObjectController1: mocks.MockObjectController1,
            MockObjectController2: mocks.MockObjectController2,
            MockObjectController3: mocks.MockObjectController3,
            MockObjectController4: mocks.MockMyController1,
        },
    };

    beforeAll(() => {
        Spy.add("MockObjectController1Spy");
        Spy.add("MockObjectController2Spy");
        Spy.add("MockObjectController3Spy");
        Spy.add("MockMyController1Spy");
        Spy.add("MockMyController2Spy");
    });

    beforeEach(() => {
        Spy.reset();
    });

    afterAll(() => {
        containers.forEach(c => c.shutdown());
    });

    it("throws on undefined configuration", () => {
        expect(() => addContainer(Container.resolve(components, undefined))).toThrow();
    });

    it("throws on non-existing configuration", () => {
        expect(() => addContainer(Container
            .resolve(components, NodeUtils.provideConfiguration("unknown.config.json"))))
            .toThrow();
    });

    it("loads existing JSON configuration", () => {
        expect(() => addContainer(Container.resolve(
            components,
            NodeUtils.provideConfiguration(getConfigFile("bootstrap.config.json")))))
            .not.toThrow();
    });

    it("loads existing JS configuration", () => {
        expect(() => addContainer(Container.resolve(
            components,
            NodeUtils.provideConfiguration(getConfigFile("bootstrap.config.js")))))
            .not.toThrow();
    });

    it("loads existing HTTP JSON configuration", (done) => {
        Container
            .resolveAsync(components, NodeUtils.provideConfigurationAsync(
                getConfigUrl("bootstrap.config.json")))
            .then(
                container => {
                    addContainer(container);
                    expect(container.runtime.commonOptions.agentIdentity.name).toBe("Barney");
                    expect(container.identity.name).toBe("Barney");
                    done();
                },
                reason => {
                    // Always fail
                    expect(reason).toBe(undefined);
                    done();
                });
    });

    it("merges two configurations", () => {
        const primary = NodeUtils.provideConfiguration(getConfigFile("bootstrap.config.js"));
        const secondary: Configuration = {
            common: {
                agentIdentity: {
                    name: "Fred",
                },
                extra: {
                    testProp: 4712,
                    testProp1: 4713,
                },
            },
            communication: {
                shouldAutoStart: false,
                brokerUrl: "inproc",
            },
            controllers: {
                MockObjectController1: { mockCtrlProp: 2 },
                MockObjectController4: { mockCtrlProp: 4 },
            },
        };

        const config = mergeConfigurations(primary, secondary);

        expect(config.common.agentIdentity.name).toBe(primary.common.agentIdentity.name);
        expect(config.common.extra.testProp).toBe(primary.common.extra.testProp);
        expect(config.common.extra.testProp1).toBe(undefined);
        expect(config.communication.shouldAutoStart).toBe(primary.communication.shouldAutoStart);
        expect(config.communication.brokerUrl).toBe(primary.communication.brokerUrl);
        expect(config.controllers["MockObjectController1"]["mockCtrlProp"])
            .toBe(primary.controllers["MockObjectController1"]["mockCtrlProp"]);
        expect(config.controllers["MockObjectController3"]["mockCtrlProp"])
            .toBe(primary.controllers["MockObjectController3"]["mockCtrlProp"]);
        expect(config.controllers["MockObjectController4"]["mockCtrlProp"])
            .toBe(secondary.controllers["MockObjectController4"]["mockCtrlProp"]);
        expect(config.controllers["MockMyController1"]["mockIoProp"]).toBe(primary.controllers["MockMyController1"]["mockIoProp"]);
        expect(config.controllers["MockMyController2"]["mockIoProp"]).toBe(primary.controllers["MockMyController2"]["mockIoProp"]);
    });

    it("registers a controller at runtime", (done) => {
        const container = addContainer(Container.resolve(
            components,
            NodeUtils.provideConfiguration(getConfigFile("bootstrap.config.js"))));
        const regFunc = () => container.registerController("MockObjectController1", mocks.MockObjectController1);
        expect(regFunc).not.toThrow();

        delayAction(200, done, () => {
            expect(container.getController<mocks.MockObjectController1>("MockObjectController1").operatingState)
                .toBe("STARTING");
        });

    });

    it("shuts down container", () => {
        expect(() => Container.resolve(
            components,
            NodeUtils.provideConfiguration(getConfigFile("bootstrap.config.js")))
            .shutdown())
            .not.toThrow();
    });

    describe("Multicast DNS", () => {

        it("publishes mDNS service", done => {
            MulticastDnsDiscovery.publishMulticastDnsService(
                myMulticastDnsServiceName,
                myMulticastDnsServiceType,
                myMulticastDnsServicePort,
                { a: "Value a" },
                myMulticastDnsServiceHostname)
                .then(srv => {
                    expect(srv.fqdn).toBe(myMulticastDnsServiceName + "._" + myMulticastDnsServiceType + "._tcp.local");
                })
                .then(() => done())
                .catch(error => failTest(error, done));
        }, 10000);

        it("discovers mDNS service", done => {
            MulticastDnsDiscovery.findMulticastDnsService(myMulticastDnsServiceName, myMulticastDnsServiceType, 9000)
                .then(srv => {
                    expect(srv.name).toBe(myMulticastDnsServiceName);
                    expect(srv.port).toBe(myMulticastDnsServicePort);
                    expect(srv.type).toBe(myMulticastDnsServiceType);
                    expect(srv.host).toBe(myMulticastDnsServiceHostname);
                    expect(srv.txt["a"]).toBe("Value a");
                })
                .then(() => done())
                .catch(error => failTest(error, done));
        }, 10000);

        it("unpublishes mDNS service", done => {
            MulticastDnsDiscovery.unpublishMulticastDnsServices()
                .then(() => done())
                .catch(error => failTest(error, done));
        }, 10000);
    });

    describe("Container", () => {
        it("resolves all configured controllers", () => {
            addContainer(Container.resolve(
                components,
                NodeUtils.provideConfiguration(getConfigFile("bootstrap.config.js"))));

            expect(Spy.get("MockObjectController1Spy").value1)
                .toHaveBeenCalledWith(1);
            expect(Spy.get("MockObjectController2Spy").value1)
                .not.toHaveBeenCalled();
            expect(Spy.get("MockObjectController3Spy").value1)
                .toHaveBeenCalledWith("mqtt://test.nobroker.org");
            expect(Spy.get("MockMyController1Spy").value1)
                .toHaveBeenCalledWith("mqtt://test.nobroker.org");
            expect(Spy.get("MockMyController2Spy").value1)
                .not.toHaveBeenCalled();

            expect(Spy.get("MockObjectController1Spy").value2)
                .toHaveBeenCalledWith(true);
            expect(Spy.get("MockObjectController2Spy").value2)
                .not.toHaveBeenCalled();
            expect(Spy.get("MockObjectController3Spy").value2)
                .toHaveBeenCalledWith(false);
            expect(Spy.get("MockMyController1Spy").value2)
                .toHaveBeenCalledWith(false);
            expect(Spy.get("MockMyController2Spy").value2)
                .not.toHaveBeenCalled();
        });

        it("gets controllers that are registered", () => {
            const container = addContainer(Container.resolve(
                components,
                NodeUtils.provideConfiguration(getConfigFile("bootstrap.config.js"))));

            expect(container.getController("FooController"))
                .toBeUndefined();
            expect(container.getController("MockObjectController1"))
                .toBeDefined();
            expect(container.getController("MockObjectController2"))
                .toBeDefined();
            expect(container.getController("MockObjectController3"))
                .toBeDefined();
            expect(container.getController("MockObjectController4"))
                .toBeDefined();
        });

        it("has proper package version info in runtime", () => {
            addContainer(Container.resolve(
                components,
                NodeUtils.provideConfiguration(getConfigFile("bootstrap.config.js"))));

            expect(Spy.get("MockObjectController1Spy").value3)
                .toHaveBeenCalledWith(process.env.npm_package_name + "@" + process.env.npm_package_version);
        });

        it("generates v4 UUIDs at runtime", () => {
            const container = addContainer(Container.resolve(
                components,
                NodeUtils.provideConfiguration(getConfigFile("bootstrap.config.js"))));

            expect(container.runtime.newUuid()).toMatch(UUID_REGEX);
            expect(Runtime.newUuid()).toMatch(UUID_REGEX);
        });

    });

});
