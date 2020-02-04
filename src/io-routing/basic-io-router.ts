/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { RuleBasedIoRouter } from "./rule-based-io-router";

/**
 * Supports basic routing of data from IO sources to IO actors based on an
 * associated IO context.
 *
 * This class implements a basic routing algorithm where *all* compatible pairs
 * of IO sources and IO actors are associated, not taking any other context
 * information into account. An IO source and an IO actor are compatible if both
 * define equal value types.
 *
 * Note that this router makes its IO context available by advertising and for
 * discovery (by core type, object type, or object Id) and listens for
 * Update-Complete events on its IO context, triggering `onIoContextChanged`
 * automatically.
 *
 * This router class requires the following controller options:
 * - `ioContext`: the IO context for which this router is managing routes
 *   (mandatory)
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
