/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { AgentInfo, Configuration } from "coaty/runtime";

const DEFAULT_SERVICE_HOST = "127.0.0.1";
const DEFAULT_SERVICE_BROKER_PORT = "1883";

export function sensorConfig(agentInfo: AgentInfo): Configuration {
    "use strict";

    const isDevMode = agentInfo.buildInfo.buildMode === "development";
    const host = agentInfo.configInfo.serviceHost || DEFAULT_SERVICE_HOST;

    return {
        common: {
        },
        communication: {
            useReadableTopics: isDevMode,
            brokerOptions: {
                servers: [
                    {
                        host: host,
                        port: DEFAULT_SERVICE_BROKER_PORT,
                    },
                ],
            },
        },
    };
}
