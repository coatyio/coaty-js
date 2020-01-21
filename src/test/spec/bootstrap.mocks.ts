/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

/**
 * Mocks and Spies for bootstrapping test suite
 */

import { Controller } from "../..";

import { Spy } from "./utils";

export class MockObjectController1 extends Controller {

    operatingState: string;

    onInit() {
        super.onInit();
        this.operatingState = "INITIAL";

        Spy.set(
            "MockObjectController1Spy",
            this.options["mockCtrlProp"],
            this.runtime.isCommonJsPlatform,
            this.runtime.frameworkName + "@" + this.runtime.frameworkVersion,
        );
    }

    onCommunicationManagerStarting() {
        this.operatingState = "STARTING";
    }

    onCommunicationManagerStopping() {
        this.operatingState = "STOPPING";
    }
}

export class MockObjectController2 extends Controller {
}

export class MockObjectController3 extends Controller {
    onInit() {
        super.onInit();
        Spy.set(
            "MockObjectController3Spy",
            this.communicationManager.options.brokerUrl,
            this.runtime.isWebWorkerPlatform);
    }
}

export class MockMyController1 extends Controller {
    onInit() {
        super.onInit();
        Spy.set(
            "MockMyController1Spy",
            this.communicationManager.options.brokerUrl,
            this.runtime.isWebPlatform);
    }
}

export class MockMyController2 extends Controller {
    onInit() {
        super.onInit();
        Spy.set(
            "MockMyController2Spy",
            this.communicationManager.options.brokerUrl,
            this.runtime.isWebPlatform);
    }
}
