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

    const port = options.port;
    const wsPort = options.wsPort || options.port + 8000;

    const node = require("../runtime-node");

    const aedes = require("aedes")(brokerOptions.brokerSpecificOpts || {});
    const tcpServer = require('net').createServer(aedes.handle);
    const wsServer = require('http').createServer();
    const ws = require('websocket-stream');

    ws.createServer({
        perMessageDeflate: false,
        server: wsServer,
    }, aedes.handle);

    tcpServer.listen(port, () => {
        wsServer.listen(wsPort, () => {
            utils.logInfo(`Coaty MQTT Broker running on TCP port ${port} and websocket port ${wsPort}...`);
            if (options.startBonjour && port === defaultPort) {
                node.MulticastDnsDiscovery.publishMqttBrokerService(
                    port,
                    wsPort,
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
        })
    });

    if (!options.logVerbose) {
        return;
    }

    aedes.on("publish", (packet, client) => {
        utils.logMessage(`PUBLISH by ${client ? client.id : "broker"} on topic ${packet.topic} with payload ${packet.payload.toString()}`);
    });

    aedes.on("subscribe", (subscriptions, client) => {
        utils.logMessage(`SUBSCRIBE by ${client ? client.id : "broker"}: on topic ${subscriptions.map(s => s.topic).join(", ")}`);
    });

    aedes.on("unsubscribe", (unsubscriptions, client) => {
        utils.logMessage(`UNSUBSCRIBE by ${client ? client.id : "broker"} on topic ${unsubscriptions.join(", ")}`);
    });

    aedes.on("client", (client) => {
        utils.logMessage(`CLIENT CONNECT ${client.id}`);
    });

    aedes.on("clientDisconnect", (client) => {
        utils.logMessage(`CLIENT DISCONNECT ${client.id}`);
    });

    aedes.on("clientError", (client, err) => {
        utils.logError(`CLIENT ERROR ${client.id} ${err.message}`);
    });

    aedes.on("connectionError", (client, err) => {
        utils.logError(`CONNECTION ERROR ${client} ${err.message}`);
    });
}

module.exports.run = run;

function getBrokerOptions(args) {
    // Supported command args: [--verbose], [--port <port>], [--bonjourHost <hostname>], [--nobonjour]
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
    const startBonjour = args.indexOf("--nobonjour") === -1;

    return { logVerbose, port, bonjourHost, startBonjour };
}
