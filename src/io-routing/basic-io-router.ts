/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { RuleBasedIoRouter } from "./rule-based-io-router";

/**
 * Supports basic routing of data from IO sources to IO actors for an
 * associated user.
 *
 * This class implements a basic routing algorithm where all compatible pairs of
 * IO sources and IO actors are associated. An IO source and an IO actor are
 * compatible if both define the same value type.
 *
 * External devices with IO sources and actors for external topics
 * can be preconfigured in the controller options under the property
 * `externalDevices`, an array of `Device` object definitions.
 */
export class BasicIoRouter extends RuleBasedIoRouter {

    onInit() {
        super.onInit();
        this.defineRules({
            name: "Any association on compatible value types",
            valueType: "",
            condition: () => true,
        });
    }
}
