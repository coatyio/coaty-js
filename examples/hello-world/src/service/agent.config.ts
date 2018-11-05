/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { CoreTypes, User } from "coaty/model";
import { Components, Configuration, mergeConfigurations } from "coaty/runtime";

import { serviceConfig } from "../shared/config";

import { agentInfo } from "./agent.info";
import { ComponentController } from "./component-controller";
import { LogController } from "./log-controller";
import { TaskController } from "./task-controller";
import { TaskSnapshotController } from "./task-snapshot-controller";

/**
 * The generic service user that acts as creator for task requests.
 */
export const SERVICE_USER: User = {
    objectId: "33adb2de-434d-4d28-8b99-c7625e4bbc5e",
    objectType: CoreTypes.OBJECT_TYPE_USER,
    coreType: "User",
    name: "ServiceUser",
    names: {
        givenName: "",
        familyName: "ServiceUser",
    },
};

export const components: Components = {
    controllers: {
        ComponentController,
        LogController,
        TaskController,
        TaskSnapshotController,     // Extends HistorianController with logging side effects
    },
};

export const configuration: Configuration = mergeConfigurations(
    serviceConfig(agentInfo),
    {
        common: {
            agentInfo,
            associatedUser: SERVICE_USER,
        },
        communication: {
            identity: { name: "Service" },
        },
        controllers: {
            TaskController: {
                // Interval in milliseconds after which a new task request is generated
                requestGenerationInterval: 10000,
            },

            // Extends HistorianController with logging side effects
            TaskSnapshotController: {
                shouldAdvertiseSnapshots: false,
                shouldPersistLocalSnapshots: true,
                shouldPersistObservedSnapshots: false,
                shouldReplyToQueries: true,
                database: {
                    key: "db",
                    collection: "historian",
                },
            },
        },
    });
