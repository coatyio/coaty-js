/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { AgentInfo, Components, Configuration, mergeConfigurations } from "coaty/runtime";
import { SensorObserverController, ThingObserverController } from "coaty/sensor-things";

import { agentInfo } from "./agent.info";
import { SensorThingsController } from "./controller/sensor-things-controller";
import { CoreTypes, User } from "coaty/model";

export const DEFAULT_CLIENT_BROKER_PORT = "9883";
export const DEFAULT_SERVICE_HOST = "127.0.0.1";

const user: User = {
    objectId: "ed940055-37b0-4783-9b44-1b64cfc79d3a",
    objectType: CoreTypes.OBJECT_TYPE_USER,
    coreType: "User",
    externalId: "Z000FFFE",
    name: "sensorThings-dashboard",
    names: {
        familyName: "unknown",
        givenName: "unknown"
    }
};

/**
 * Gets Configuration object for dashboard client.
 * @param info the client's agent info
 */
export function clientConfig(info: AgentInfo): Configuration {
    "use strict";

    const isDevMode = info.buildInfo.buildMode === "development";
    const host = info.configInfo.serviceHost || DEFAULT_SERVICE_HOST;

    return {
        common: {
            agentInfo: info,
            associatedUser: user,
        },
        communication: {
            identity: { name: "Dashboard" },
            shouldAutoStart: false,
            useReadableTopics: isDevMode,
            brokerOptions: {
                servers: [
                    {
                        host: host,
                        port: DEFAULT_CLIENT_BROKER_PORT
                    }
                ]
            }
        }
    };
}

export const components: Components = {
    controllers: {
        SensorThingsController,
        SensorObserverController,
        ThingObserverController
    }
};

export const configuration: Configuration = clientConfig(agentInfo);
