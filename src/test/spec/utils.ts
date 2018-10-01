/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

"use strict";

/**
 * Utilities for testing.
 */

import * as path from "path";

/**
 * Regex that matches a UUID v4 as used in Coaty framework.
 */
export const UUID_REGEX_STRING = "[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89aAbB][a-f0-9]{3}-[a-f0-9]{12}";
export const UUID_REGEX = new RegExp(UUID_REGEX_STRING);

const TEST_CONFIG_DIR = "dist/es5-commonjs/test/config";

/* tslint:disable-next-line:no-var-requires */
const MOSCA_HTTP_PORT = "" + require(path.resolve("./test/support/mosca.config.json")).http.port;

export function getConfigFile(filename: string): string {
    "use strict";

    return path.resolve(path.join(TEST_CONFIG_DIR, filename));
}

export function getConfigUrl(configName: string): string {
    "use strict";

    return `http://localhost:${MOSCA_HTTP_PORT}/${TEST_CONFIG_DIR}/${configName}`;
}

export function delayAction(delay: number, done: () => void, action?: () => void) {
    "use strict";

    setTimeout(
        () => {
            action && action();
            done && done();
        },
        delay);
}

export function skipTestIf(condition: boolean, reason?: string) {
    "use strict";

    if (condition) {
        pending(reason);
    }
}

export function failTest(error: Error, done?: () => void) {
    "use strict";

    fail(error);
    done && done();
}

export class Spy {

    static NO_VALUE = { noValue: true };

    private static _spies = {};

    static add(name: string) {
        Spy._spies[name] =
            jasmine.createSpyObj(name, ["value1", "value2", "value3", "value4", "value5"]);
    }

    static get(name: string) {
        return Spy._spies[name];
    }

    static set(
        name: string,
        value1: any = Spy.NO_VALUE,
        value2: any = Spy.NO_VALUE,
        value3: any = Spy.NO_VALUE,
        value4: any = Spy.NO_VALUE,
        value5: any = Spy.NO_VALUE) {

        let spyObj = Spy._spies[name];
        if (!spyObj) {
            Spy.add(name);
            spyObj = Spy._spies[name];
        }

        value1 === Spy.NO_VALUE || spyObj.value1(value1);
        value2 === Spy.NO_VALUE || spyObj.value2(value2);
        value3 === Spy.NO_VALUE || spyObj.value3(value3);
        value4 === Spy.NO_VALUE || spyObj.value4(value4);
        value5 === Spy.NO_VALUE || spyObj.value5(value5);
    }

    static reset() {
        Object.keys(Spy._spies).forEach(prop => {
            Spy._spies[prop].calls &&
                Spy._spies[prop].calls.reset();
        });
    }
}
