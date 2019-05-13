/*! Copyright (c) 2019 Siemens AG. Licensed under the MIT License. */

// Type definitions for coaty/scripts/broker

/**
 * Run Coaty broker on MQTT port 1883 (or the one specified with command line option `--port <number>`)
 * and websocket port 9883. The websocket port is computed from given MQTT port by adding 8000.
 *
 * If the broker is launched on standard port 1883, a multicast DNS service for broker discovery
 * is published additionally. The broker is then discoverable under the mDNS service name "Coaty MQTT Broker"
 * and the service type "coaty-mqtt". In this case, you can optionally specifiy a non-default hostname for
 * multicast DNS discovery with the command line option `--bonjourHost`. Useful for cases, where the normal
 * hostname provided by mDNS cannot be resolved by DHCP.
 * 
 * If you do not want to start the multicast DNS service for broker discovery, specify the `--nobonjour` option.
 *
 * If the command line option `--verbose` is given, Coaty broker provides verbose logging of subscriptions, etc.
 * Additionally, all MQTT messages published by MQTT clients are logged on the console, including message topic and payload.
 *
 * @param cmdArgs a string array specifying command arguments: [--verbose], [--port <port>], [--bonjourHost <hostname>], [--nobonjour]
 */
export declare function broker(cmdArgs: string[]): Promise<any>;

/**
 * Run Coaty broker with the given broker options.
 *
 * @param brokerOptions an object hash of broker options
 */
export declare function run(brokerOptions: {

    /**
     * The MQTT port (default is 1883).
     */
    port?: number;

    /**
     * The MQTT websocket port (default value is computed from port by adding 8000).
     */
    wsPort?: number;

    /**
     * true for detailed logging of subscriptions and published messages (default is false).
     */
    logVerbose?: boolean;

    /**
     * true, if multicast DNS broker discovery service should be published (default is false); only
     * works if standard MQTT port 1883 is used. The broker is then discoverable under the mDNS
     * service name "Coaty MQTT Broker" and the service type "coaty-mqtt".
     */
    startBonjour?: boolean;

    /**
     * If given, specifies the hostname to be used for publishing the mDNS service (optional).
     * Useful for cases, where the normal hostname provided by mDNS cannot be resolved by DHCP.
     */
    bonjourHost?: string;

    /**
     * Callback function to be invoked when broker is ready (default none).
     */
    onReady?: () => void;

    /**
     * Options passed to underlying MQTT broker instance.
     */
    brokerSpecificOpts?: any;
});
