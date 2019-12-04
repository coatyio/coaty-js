/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

const fs = require("fs");
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
    const isTls = typeof brokerOptions.tlsServerOpts === "object";
    const tcpServer = isTls ?
        require('tls').createServer(brokerOptions.tlsServerOpts, aedes.handle) :
        require('net').createServer(aedes.handle);
    const wsServer = isTls ?
        require('https').createServer(brokerOptions.tlsServerOpts) :
        require('http').createServer();
    const ws = require('websocket-stream');

    ws.createServer({
        perMessageDeflate: false,
        server: wsServer,
    }, aedes.handle);

    tcpServer.listen(port, () => {
        wsServer.listen(wsPort, () => {
            utils.logInfo(`Coaty MQTT Broker running on TCP ${isTls ? "secure " : ""}port ${port} and websocket ${isTls ? "secure " : ""}port ${wsPort}...`);
            if (options.startBonjour && port === defaultPort) {
                node.MulticastDnsDiscovery.publishMqttBrokerService(
                    port,
                    wsPort,
                    undefined,
                    undefined,
                    options.bonjourHost)
                    .then(srv => utils.logInfo(`Published multicast DNS for host ${srv.host} with FQDN "${srv.fqdn}" on port ${srv.port}`))
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
        let payload = packet.payload;
        if (typeof packet.topic === "string" && packet.topic.startsWith("/coaty/")) {
            payload = payload.toString();   // UTF-8
        } else {
            const maxHex = 50;
            payload = `<Buffer #${payload.toString("hex", 0, maxHex)}${payload.length > maxHex ? "..." : ""}>`;
        }
        utils.logMessage(`PUBLISH by ${client ? client.id : "broker"} on topic ${packet.topic} with qos=${packet.qos}, retain=${packet.retain}, payload=${payload}`);
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

/**
 * Converts command arguments to broker options.
 * 
 * Supported command args include:
 * [--verbose], [--port <port>], [--bonjourHost <hostname>], [--nobonjour],
 * [--tls-cert], [--tls-key], [--tls-pfx], [--tls-passphrase]
 *
 * @param args comand args
 */
function getBrokerOptions(args) {
    const processArgNoVal = (name) => {
        return args.indexOf(name) !== -1;
    }
    const processArgVal = (name, defaultValue, converter) => {
        let value;
        const index = args.indexOf(name);
        if (index === -1) {
            return defaultValue;
        }
        try {
            value = args[index + 1];
            return converter ? converter(value) : value;
        } catch (error) {
            utils.logError(`${name} argument: value is missing or invalid: ${error}`);
            process.exit(1);
        }
    };

    const logVerbose = processArgNoVal("--verbose");
    const port = processArgVal("--port", 1883, value => {
        const val = parseInt(value);
        if (isNaN(val)) {
            throw new Error();
        }
        return val;
    });
    const bonjourHost = processArgVal("--bonjourHost", undefined);
    const startBonjour = !processArgNoVal("--nobonjour");
    const tlsCert = processArgVal("--tls-cert", undefined, file => fs.readFileSync(file));
    const tlsKey = processArgVal("--tls-key", undefined, file => fs.readFileSync(file));
    const tlsPfx = processArgVal("--tls-pfx", undefined, file => fs.readFileSync(file));
    const tlsPassphrase = processArgVal("--tls-passphrase", undefined);

    let tlsServerOpts;
    if (tlsCert && tlsKey) {
        tlsServerOpts = { cert: tlsCert, key: tlsKey };
    } else if (tlsPfx && tlsPassphrase) {
        tlsServerOpts = { pfx: tlsPfx, passphrase: tlsPassphrase };
    }

    return { logVerbose, port, bonjourHost, startBonjour, tlsServerOpts };
}
