/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

const utils = require("./utils");

/**
 * Run Mosca broker on MQTT port 1883 (or the one specified with command line option `--port <number>`) 
 * and websocket port 9883. The websocket port is computed from given MQTT port by adding 8000.
 * 
 * If the broker is launched on standard port 1883, a multicast DNS service for broker discovery 
 * is published additionally. The broker is then discoverable under the mDNS service name "Coaty MQTT Broker"
 * and the service type "coaty-mqtt". In this case, you can optionally specifiy a non-default hostname for
 * multicast DNS discovery with the command line option `--bonjourHost`. Useful for cases, where the normal
 * hostname provided by mDNS cannot be resolved by DHCP.
 * 
 * If the command line option `--verbose` is given, Mosca broker provides verbose logging of subscriptions, etc.
 * Additionally, all MQTT messages published by MQTT clients are logged on the console, including message topic and payload.
 * 
 * @param cmdArgs a string array specifying command arguments: [--verbose], [--port <port>], [--bonjourHost <hostname>]
 */
function broker(cmdArgs) {
    // Return a promise that never resolves or rejects so that the script won't terminate.
    return new Promise((resolve, reject) => {
        run(getBrokerOptions(cmdArgs));
    });
}

/**
 * Run Mosca broker with the given options.
 * 
 * Options are defined in an object hash including the following properties:
 * 
 * - `port`: the MQTT port (default is 1883); the websocket port is computed from port by adding 8000.
 * - `logVerbose`: true for detailed logging of subscriptions and published messages (default is false).
 * - `startBonjour`: true, if multicast DNS broker discovery service should be published (default is false); only
 *   works if standard MQTT port 1883 is used. The broker is then discoverable under the mDNS service name "Coaty MQTT Broker"
 *   and the service type "coaty-mqtt".
 * - `bonjourHost`: if given, specifies the hostname to be used for publishing the mDNS service (optional).
 *    Useful for cases, where the normal hostname provided by mDNS cannot be resolved by DHCP.
 * - `onReady`: callback function to be invoked when broker is ready (default none).
 * - `moscaSettings`: if given, these settings completely override the default mosca settings computed by teh other options.
 * 
 * @param brokerOptions broker options
 */
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

module.exports.broker = broker;
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
