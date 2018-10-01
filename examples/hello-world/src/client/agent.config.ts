/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { Components, Configuration, mergeConfigurations } from "coaty/runtime";

import { clientConfig } from "../shared/config";

import { agentInfo } from "./agent.info";
import { TaskController } from "./task-controller";

export const components: Components = {
    controllers: {
        TaskController,
    },
};

export const configuration: Configuration = mergeConfigurations(
    clientConfig(agentInfo),
    {
        common: {
            agentInfo,
        },
        communication: {},
        controllers: {
            TaskController: {

                shouldAdvertiseIdentity: true,

                // Minimum amount of time in milliseconds until an offer is sent
                minTaskOfferDelay: 2000,

                // Minimum amount of time in milliseconds until a task is completed
                minTaskDuration: 5000,

                queryTimeoutMillis: 5000,

            },
        },
    });
