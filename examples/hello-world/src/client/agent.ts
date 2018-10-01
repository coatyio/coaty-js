/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { CoreTypes } from "coaty/model";
import { Container } from "coaty/runtime";
import { NodeUtils } from "coaty/runtime-node";

import { components, configuration } from "./agent.config";

function associateClientUser(cont: Container) {
    "use strict";

    cont.getRuntime().options.associatedUser = {
        objectId: cont.getRuntime().newUuid(),
        objectType: CoreTypes.OBJECT_TYPE_USER,
        coreType: "User",
        name: "ClientUser",
        names: {
            givenName: "",
            familyName: "ClientUser",
        },
    };
}

// First, create the Coaty container with the specified components.
const container = Container.resolve(components, configuration);

// Then, associate a distinct user with each client instance.
associateClientUser(container);

// Finally start the communication manager.
container.getCommunicationManager().start();

// Log broker connection state changes (online/offline) to the console.
NodeUtils.logCommunicationState(container);
