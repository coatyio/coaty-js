/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

const utils = require("./utils");

// For JSDoc documentation, see type definition file (d.ts)
function broker(cmdArgs) {
    // Return a promise that never resolves or rejects so that the script won't terminate.
    return new Promise((resolve, reject) => {
        run(getBrokerOptions(cmdArgs));
    });
}

module.exports.broker = broker;

// For JSDoc documentation, see type definition file (d.ts)
function run(brokerOptions) {
    const defaultPort = 1883;
    const options = {
        port: defaultPort,
        logVerbose: false,
        startBonjour: true,
        bonjourHost: undefined,
    };
    Object.assign(options, brokerOptions);
    const defaultMoscaSettings = {
        logger: {
            // verbose: 30, veryVerbose: 20
            level: (options.logVerbose ? 30 : "warn")
        },
        port: options.port,
        http: {
            port: options.port + 8000,
            // static: "./"
        }
    };
    const moscaSettings = options.moscaSettings || defaultMoscaSettings;
    const mosca = require("mosca");
    const server = new mosca.Server(moscaSettings);
    const node = require("../runtime-node");

    server.on("ready", () => {
        utils.logInfo(`Coaty MQTT Broker running on MQTT port ${moscaSettings.port} and websocket port ${moscaSettings.http.port}...`);
        if (options.startBonjour && moscaSettings.port === defaultPort) {
            node.MulticastDnsDiscovery.publishMqttBrokerService(
                moscaSettings.port,
                moscaSettings.http.port,
                undefined,
                undefined,
                options.bonjourHost)
                .then(srv => utils.logInfo(`Published multicast DNS for host ${srv.host} on FQDN "${srv.fqdn}:${srv.port}"`))
                .catch(error => utils.logError(`Error while publishing multicast DNS: ${error}`));

            node.NodeUtils.handleProcessTermination(undefined, () => {
                return node.MulticastDnsDiscovery.unpublishMulticastDnsServices()
                    .then(() => {
                        utils.logInfo(`Unpublished multicast DNS service. Exiting...`);
                    });
            });
        }
        if (options.onReady) {
            options.onReady();
        }
    });

    if (options.logVerbose) {
        server.on("published", (packet, client) => {
            utils.logMessage(`Published by ${client ? client.id : "broker"}: "topic:" ${packet.topic} ${packet.payload}`);
        });
    }

    return server;
}

module.exports.run = run;

function getBrokerOptions(args) {
    // Supported command args: [--verbose], [--port <port>], [--bonjourHost <hostname>]
    let port = 1883;
    const logVerbose = args.includes("--verbose");
    const portIndex = args.indexOf("--port");
    if (portIndex !== -1) {
        try {
            port = parseInt(args[portIndex + 1], 10);
            if (isNaN(port)) {
                throw new Error();
            }
        } catch (error) {
            utils.logError(`Invalid broker port.`);
            process.exit(1);
        }
    }
    let bonjourHost;
    const hostIndex = args.indexOf("--bonjourHost");
    if (hostIndex !== -1) {
        try {
            bonjourHost = args[hostIndex + 1];
        } catch (error) {
            utils.logError(`Invalid bonjourHost argument.`);
            process.exit(1);
        }
    }

    return { logVerbose, port, bonjourHost };
}
