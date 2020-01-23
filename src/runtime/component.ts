/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { Identity } from "..";

import { IDisposable } from "./disposable";
import { Runtime } from "./runtime";

/**
 * Defines common members for all framework container components.
 */
export interface IComponent extends IDisposable {

    /**
     * The runtime object associated with this framework component.
     */
    runtime: Runtime;

    /**
     * A meta data object describing the unique identity of this
     * framework component.
     * When publishing a message, the identity object ID is used
     * as the source object ID in the communication topic.
     */
    identity: Identity;
}
