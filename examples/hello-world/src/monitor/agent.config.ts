/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { Components, Configuration, mergeConfigurations } from "coaty/runtime";

import { serviceConfig } from "../shared/config";

import { agentInfo } from "./agent.info";
import { MonitorController } from "./monitor-controller";

export const components: Components = {
    controllers: {
        MonitorController,
    },
};

export const configuration: Configuration = mergeConfigurations(
    serviceConfig(agentInfo),
    {
        common: {
            agentInfo,
        },
        communication: {
        },
        controllers: {
            MonitorController: {
                queryTimeoutMillis: 5000,
            },
        },
    });
