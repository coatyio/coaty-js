/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { AgentInfo, Configuration } from "coaty/runtime";

const DEFAULT_SERVICE_HOST_DEV = "127.0.0.1";
const DEFAULT_SERVICE_HOST_PROD = "127.0.0.1";
const DEFAULT_SERVICE_BROKER_PORT = "1883";

export function clientConfig(agentInfo: AgentInfo): Configuration {
    "use strict";

    const isDevMode = agentInfo.buildInfo.buildMode === "development";

    const host = agentInfo.configInfo.serviceHost || (isDevMode ? DEFAULT_SERVICE_HOST_DEV : DEFAULT_SERVICE_HOST_PROD);

    return {
        common: {
        },
        communication: {
            useReadableTopics: isDevMode,
            brokerOptions: {
                servers: [
                    {
                        host: host,

                        // Note: a real client running in a browser environment should use
                        // websocket port 9883. We are using the TCP socket port 1883 
                        // here because the client is just a Node.js program.
                        port: DEFAULT_SERVICE_BROKER_PORT,
                    },
                ],
            },
        },
    };
}
