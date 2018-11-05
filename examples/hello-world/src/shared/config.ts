/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { AgentInfo, Configuration } from "coaty/runtime";

import { Db } from "./db";

// Constants

const DEFAULT_SERVICE_HOST_DEV = "127.0.0.1";
const DEFAULT_SERVICE_HOST_PROD = "127.0.0.1";
const DEFAULT_SERVICE_BROKER_PORT = "1883";

/**
 * Gets common Configuration object for Hello World service and monitor
 * components.
 * 
 * @param agentInfo the component's agent info
 */
export function serviceConfig(agentInfo: AgentInfo): Configuration {
    "use strict";

    const isDevMode = agentInfo.buildInfo.buildMode === "development";

    const host = process.env.COATY_SERVICE_HOST || agentInfo.configInfo.serviceHost ||
        (isDevMode ? DEFAULT_SERVICE_HOST_DEV : DEFAULT_SERVICE_HOST_PROD);

    return {
        common: {
        },
        communication: {
            shouldAutoStart: true,
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
        databases: {
            db: {
                adapter: "PostgresAdapter",
                connectionString: Db.getConnectionString(),
            },
            admindb: {
                adapter: "PostgresAdapter",
                connectionString: Db.getAdminConnectionString(),
            },
        },
    };
}

/**
 * Gets a common Configuration object for Hello World clients.
 * @param agentInfo the client's agent info
 */
export function clientConfig(agentInfo: AgentInfo): Configuration {
    "use strict";

    const isDevMode = agentInfo.buildInfo.buildMode === "development";

    const host = agentInfo.configInfo.serviceHost || (isDevMode ? DEFAULT_SERVICE_HOST_DEV : DEFAULT_SERVICE_HOST_PROD);

    return {
        common: {
        },
        communication: {
            identity: { name: "Client" },
            useReadableTopics: isDevMode,
            brokerOptions: {
                servers: [
                    {
                        host: host,

                        // Note: a real client running in a browser environment should use
                        // websocket port 9883. We are using the TCP socket port 1884 
                        // here because the client is just a Node.js program.
                        port: DEFAULT_SERVICE_BROKER_PORT,
                    },
                ],
            },
        },
    };
}
