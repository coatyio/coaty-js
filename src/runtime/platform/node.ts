/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

/* Node.js specific functionality */

import * as bonjourFunc from "bonjour";

import { CommunicationState } from "../../com/communication-manager";
import { toLocalIsoString } from "../../util/date";
import { Configuration } from "../configuration";
import { Container } from "../container";

/* Process Termination and Console Logging Utilities */

/**
 * Node.js specific utility functions to be used by Coaty agent services.
 */
export class NodeUtils {

    /**
     * Perform synchronous and asynchrounous cleanup of allocated resources
     * (e.g. file descriptors, handles, DB connections, etc.) before shutting down the Node.js process.
     * 
     * @param cleanup callback function for synchronous cleanup (optional)
     * @param cleanupAsync callback function for asynchronous cleanup (optional)
     */
    public static handleProcessTermination(cleanup?: () => void, cleanupAsync?: () => Promise<any>) {
        // The correct use of 'uncaughtException' is to perform synchronous cleanup of 
        // allocated resources (e.g. file descriptors, handles, etc) before shutting down 
        // the process. It is not safe to resume normal operation after 'uncaughtException'.
        process.on("uncaughtException", err => {
            NodeUtils.logError(err, "uncaughtException:");
            NodeUtils.logError(err.stack, "       stacktrace:");
            process.exit(1);
        });

        process.on("SIGINT", () => {
            Promise.resolve(cleanupAsync && cleanupAsync())
                .then(() => process.exit())
                .catch(() => process.exit(1));
        });

        process.on("exit", code => {
            cleanup && cleanup();
            NodeUtils.logInfo(`Exiting with code: ${code}`);
        });
    }

    /**
     * Log changes in online/offline communication state (i.e. agent connection to Coaty broker) to the console.
     * 
     * @param container a Coaty container
     */
    public static logCommunicationState(container: Container) {
        const manager = container.getCommunicationManager();
        manager.observeCommunicationState()
            .subscribe(state => {
                NodeUtils.logInfo(`MQTT: ${manager.identity.name} ${state !== CommunicationState.Online ? "not " : ""}connected to broker`);
            });
    }

    /**
     * Log the given informational message to console, also providing the logging date.
     * 
     * @param message informational message to log
     * @param isoDateString date string in ISO format or unspecified to use current data (optional)
     */
    public static logInfo(message: string, isoDateString?: string) {
        const date = isoDateString || toLocalIsoString(new Date(), true);
        console.log(`[${date}] [info] ${message}`);
    }

    /**
     * Log the given error to console, also providing the logging date.
     * 
     * @param error error
     * @param message an extra message (optional)
     * @param isoDateString date string in ISO format or unspecified to use current data (optional)
     */
    public static logError(error: any, message?: string, isoDateString?: string) {
        const date = isoDateString || toLocalIsoString(new Date(), true);
        console.log(`[${date}] [error] ${message || ""}${message ? " " : ""}${error}`);
    }

    /**
     * Log the given event to console, also providing the logging date.
     * 
     * @param message message to log
     * @param eventName name of event to log (optional)
     * @param eventDirection direction of event to log (in or out)
     */
    public static logEvent(message: string, eventName?: string, eventDirection: "In" | "Out" = "In") {
        let output = eventName ? (eventDirection === "In" ? "-> " : "<- ") : "   ";
        output += ((eventName || "") + " ".repeat(11 - (eventName ? eventName.length : 0)));
        output += "| " + message;
        console.log(output);
    }

}

/* Configuration Providers */

/**
 * Provide a Configuration from the specified local JSON or JS file.
 * This option can only be used in a server-side environment (Node.js),
 * not in a browser runtime.
 *
 * The value of this option must be the relative or absolute
 * filename of a JSON config file or a CommonJS module file
 * that exports a Configuration object.
 *
 * If unspecified the default file looked up is app.config.js, then app.config.json
 * in the current working directory of the server process.
 *
 * @param localConfigFile a local configuration file
 */
export function provideConfiguration(localConfigFile: string = "app.config"): Configuration {
    "use strict";

    try {
        const path = require("path");
        if (!path.isAbsolute(localConfigFile)) {
            localConfigFile = path.resolve("./" + localConfigFile);
        }
        return require(localConfigFile);
    } catch (e) {
        const msg = `Couldn't resolve configuration file '${localConfigFile}': ${e}`;
        throw new Error(msg);
    }
}

/**
 * Asynchrounously provides a Configuration from the given Url expecting a
 * Configuration object in JSON format.
 *
 * This option can only be used in a server-side environment (Node.js),
 * not in a browser runtime.
 *
 * @param configurationUrl a Url to load the configuration from
 */
export function provideConfigurationAsync(configurationUrl: string): Promise<Configuration> {
    "use strict";

    return new Promise<Configuration>((resolve, reject) => {
        const fetch = require("node-fetch");
        fetch(configurationUrl)
            .then(response => resolve(response.json()))
            // node-fetch doesn't seem to serve reject or catch callbacks
            .catch(error => {
                reject(new Error(`Couldn't fetch configuration from '${configurationUrl}': ${error}`));
            });
    });
}

/* Bonjour/Multicast DNS support for discovery of Coaty broker/router addresses, Configuration URLs, etc. */

/**
 * Represents a multicast DNS service object as resolved by the `MulticastDnsDiscovery.findMulticastDnsService` and
 * `MulticastDnsDiscovery.publishMulticastDnsService` methods.
 * 
 * Note: This interface just reexposes the members of the `bonjour.Service` interface defined 
 * in the npm `bonjour` package.
 */
export interface MulticastDnsService {
    name: string;
    type: string;
    subtypes: string[];
    protocol: string;
    host: string;
    port: number;
    fqdn: string;
    txt: object;
    published: boolean;
}

/**
 * Provides static methods to publish and find multicast DNS services.
 */
export class MulticastDnsDiscovery {

    private static readonly bonjour = bonjourFunc();

    /**
     * Publish a multicast DNS (a.k.a mDNS, Bonjour, Zeroconf) service with the given parameters. Typically used for 
     * discovering the Coaty broker/router or for discovering Coaty configuration URLs hosted on 
     * a web server. The published mDNS service contains a JSON TXT record including specific connection
     * parameters. The keys and values of these parameters are always strings so you can 
     * easily concat them to form a URL, etc.
     * 
     * Note that the `host` parameter is optional. By default, the local hostname is used (not the local host IP address!).
     * To resolve this hostname, your network DHCP system must be configured properly. If this is not the case, you
     * can pass the target IP address of your mDNS service explicitely.
     * 
     * The function returns a promise that is resolved with the published service object of type `MulticastDnsService`.
     * If an error occurs while publishing, the promise is rejected.
     * 
     * This function can only be used in a server-side environment (Node.js),
     * not in a browser runtime.
     * 
     * @param name the name of the mDNS service
     * @param type the type of the mDNS service
     * @param port the port of the mDNS service
     * @param txtRecord the TXT record containing additional key value pairs (optional)
     * @param host the host IP address to be published with the service (optional, defaults to local hostname)
     */
    public static publishMulticastDnsService(
        name: string,
        type: string,
        port: number,
        txtRecord: { [key: string]: string } = {},
        host?: string)
        : Promise<MulticastDnsService> {
        return new Promise<MulticastDnsService>((resolve, reject) => {
            const srv = MulticastDnsDiscovery.bonjour.publish({
                name: name,
                type: type,
                host: host || undefined,
                port: port,
                txt: txtRecord || {},
            });
            srv.on("up", () => resolve(srv));
            srv.on("error", error => reject(error));
        });
    }

    /**
     * Publish Coaty MQTT broker information using a multicast DNS (a.k.a mDNS, Bonjour) service with the given parameters.
     * 
     * Note that the `host` parameter is optional. By default, the local hostname is used (not the local host IP address!).
     * To resolve this hostname, your network DHCP system must be configured properly. If this is not the case, you
     * can pass the target IP address of your mDNS service explicitely.
     * 
     * The function returns a promise that is resolved with the published service object of type `MulticastDnsService`.
     * If an error occurs while publishing, the promise is rejected.
     * 
     * The broker's websocket port (`ws-port`) is published in the TXT record of the service.
     * 
     * This function can only be used in a server-side environment (Node.js),
     * not in a browser runtime.
     * 
     * @param port the broker's port (default value is 1883)
     * @param wsPort the broker's websocket port (default value is 9883)
     * @param name the name of the mDNS service (default value is `Coaty MQTT Broker`)
     * @param type the type of the mDNS service (default value is `coaty-mqtt`)
     * @param host the broker IP address to be published with the service (default is local hostname)
     */
    public static publishMqttBrokerService(port?: number, wsPort?: number, name?: string, type?: string, host?: string)
        : Promise<MulticastDnsService> {
        return MulticastDnsDiscovery.publishMulticastDnsService(
            name || "Coaty MQTT Broker",
            type || "coaty-mqtt",
            port || 1883,
            { "ws-port": (wsPort || 9883).toString() },
            host);
    }

    /**
     * Publish Coaty WAMP router information using a multicast DNS (a.k.a mDNS, Bonjour) service with the given parameters.
     * 
     * Note that the `host` parameter is optional. By default, the local hostname is used (not the local host IP address!).
     * To resolve this hostname, your network DHCP system must be configured properly. If this is not the case, you
     * can pass the target IP address of your mDNS service explicitely.
     * 
     * The function returns a promise that is resolved with the published service object of type `MulticastDnsService`.
     * If an error occurs while publishing, the promise is rejected.
     * 
     * The WAMP router's URL path (`path`) and realm (`realm`) is published in the TXT record of the service.
     * 
     * This function can only be used in a server-side environment (Node.js),
     * not in a browser runtime.
     * 
     * @param path the router's URL path (default value is `/`)
     * @param realm the router's realm (default value is `coaty-app`)
     * @param port the router's port (default value is 80)
     * @param name the name of the mDNS service (default value is `Coaty WAMP Router`)
     * @param type the type of the mDNS service (default value is `coaty-wamp`)
     * @param host the router IP address to be published with the service (deafult is local hostname)
     */
    public static publishWampRouterService(path?: string, realm?: string, port?: number, name?: string, type?: string, host?: string)
        : Promise<MulticastDnsService> {
        return MulticastDnsDiscovery.publishMulticastDnsService(
            name || "Coaty WAMP Router",
            type || "coaty-wamp",
            port || 80,
            { path: path || "/", realm: realm || "coaty-app" },
            host);
    }

    /**
     * Unpublish all published multicast DNS services. Returns a promise that is resolved after all
     * services have been unpublished.
     * 
     * This function can only be used in a server-side environment (Node.js),
     * not in a browser runtime.
     */
    public static unpublishMulticastDnsServices(): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            // console.log(`Unpublishing all multicast DNS services...`);
            MulticastDnsDiscovery.bonjour.unpublishAll(() => {
                MulticastDnsDiscovery.bonjour.destroy();
                resolve();
            });
        });
    }

    /**
     * Finds the first multicast DNS service of the given name and type.
     * Returns a promise that is resolved with the given service object
     * or rejected if the service cannot be discovered within the given timeout
     * interval.
     * 
     * This function can only be used in a server-side environment (Node.js),
     * not in a browser runtime.
     * 
     * @param name the name of the mDNS service to find
     * @param name the type of the mDNS service to find
     * @param timeout the number of milliseconds after which the returned promise is rejected (optional, default is 2147483647)
     */
    public static findMulticastDnsService(name: string, type: string, timeout = 2147483647): Promise<MulticastDnsService> {
        return new Promise<any>((resolve, reject) => {
            let isResolved = false;
            const timer = setTimeout(() => {
                if (!isResolved) {
                    isResolved = true;
                    browser.stop();
                    reject("mDNS timed out");
                }
            }, timeout);
            const browser = MulticastDnsDiscovery.bonjour.find({ type: type }, (service: MulticastDnsService) => {
                if (service.name === name) {
                    if (!isResolved) {
                        isResolved = true;
                        browser.stop();
                        clearTimeout(timer);
                        resolve(service);
                    }
                }
            });
        });
    }

    /**
     * Finds the first multicast DNS service publishing Coaty MQTT broker information.
     * Returns a promise that is resolved with the given service object
     * or rejected if the service cannot be discovered within the given timeout
     * interval.
     * 
     * This function can only be used in a server-side environment (Node.js),
     * not in a browser runtime.
     * 
     * @param timeout the number of milliseconds after which the returned promise is rejected (defaults to 2147483647)
     * @param name the name of the mDNS service to find (defaults to `Coaty MQTT Broker`)
     * @param type the type of the mDNS service to find (defaults to `coaty-mqtt`)
     */
    public static findMqttBrokerService(timeout?: number, name = "Coaty MQTT Broker", type = "coaty-mqtt"): Promise<MulticastDnsService> {
        return MulticastDnsDiscovery.findMulticastDnsService(name, type, timeout);
    }

    /**
     * Finds the first multicast DNS service publishing Coaty WAMP router information.
     * Returns a promise that is resolved with the given service object
     * or rejected if the service cannot be discovered within the given timeout
     * interval.
     * 
     * This function can only be used in a server-side environment (Node.js),
     * not in a browser runtime.
     * 
     * @param timeout the number of milliseconds after which the returned promise is rejected (defaults to 2147483647)
     * @param name the name of the mDNS service to find (defaults to `Coaty WAMP Router`)
     * @param type the type of the mDNS service to find (defaults to `coaty-wamp`)
     */
    public static findWampRouterService(timeout?: number, name = "Coaty WAMP Router", type = "coaty-wamp"): Promise<MulticastDnsService> {
        return MulticastDnsDiscovery.findMulticastDnsService(name, type, timeout);
    }

    /**
     * Gets the network IP address (IPv4) of the local machine.
     * 
     * This function can only be used in a server-side environment (Node.js),
     * not in a browser runtime.
     */
    public static getLocalIpV4Address() {
        const ifs = require("os").networkInterfaces();
        return Object.keys(ifs)
            .map(x => [x, ifs[x].filter(y => y.family === "IPv4" && !y.internal)[0]])
            .filter(x => x[1])
            .map(x => x[1].address)[0];
    }

}
