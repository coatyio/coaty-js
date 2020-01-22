/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { Component, Device, User } from "..";
import { AgentInfo } from "./agent-info";

/**
 * Configuration options for Coaty container components,
 * such as controllers, communication manager, and runtime.
 *
 * Configuration objects conform to JSON format in order
 * to be serializable.
 */
export interface Configuration {

    /**
     * Common options shared by container components (optional).
     */
    common?: CommonOptions;

    /**
     * Options used for communication.
     */
    communication: CommunicationOptions;

    /**
     * Controller configuration options (optional).
     */
    controllers?: ControllerConfig;

    /**
     * Options used to connect to databases (optional).
     */
    databases?: DatabaseOptions;

}

/**
 * Common options shared by all container components.
 */
export interface CommonOptions {

    /**
     * User object that is associated with this runtime configuration
     * (optional). Used for a Coaty container that runs on a user device.
     */
    associatedUser?: User;

    /**
     * Device object that is associated with this runtime configuration
     * (optional). Used for a Coaty container that runs on a user device.
     */
    associatedDevice?: Device;

    /**
     * Agent information generated and injected into the configuration when the
     * agent project is build (optional). To be used locally by an agent to
     * access build and release information of the application for displaying,
     * logging, etc.
     */
    agentInfo?: AgentInfo;

    /**
     * Any other custom properties accessible by indexer.
     */
    [extra: string]: any;
}

/**
 * Options used for communication
 */
export interface CommunicationOptions {

    /**
     * Connection Url to MQTT broker (schema 'protocol://host:port') (optional).
     * If the `servers` option in property `mqttClientOptions` is specified this
     * property is ignored.
     */
    brokerUrl?: string;

    /**
     * Options passed to MQTT Client (see MQTT.js connect options).
     */
    mqttClientOptions?: any;

    /**
     * Property-value pairs to be initialized on the identity object of the
     * communication manager (optional). For example, the `name` of the
     * identity object can be configured here.
     */
    identity?: Partial<Component>;

    /**
     * Determines whether the communication manager should start initially
     * when the container has been resolved. Its value defaults
     * to false.
     */
    shouldAutoStart?: boolean;

    /**
     * Determines whether the communication manager should advertise its
     * identity automatically when started and deadvertise its identity when
     * stopped or terminated abnormally (via last will). If not specified or
     * undefined, de/advertisements will be done by default.
     *
     * The communication managers's identity is also discoverable (by publishing
     * a Discover event with core type "Component" or with the object id of a
     * component) if and only if the identity has also been advertised.
     */
    shouldAdvertiseIdentity?: boolean;

    /**
     * Determines whether the communication manager should advertise the
     * associated device (defined in Runtime.commonOptions.associatedDevice)
     * automatically when started and deadvertise the device when stopped or
     * terminated abnormally (via last will). If not specified or undefined,
     * de/advertisements will be done by default.
     *
     * The associated device is also discoverable (by publishing a Discover
     * event with core type "Device" or with the object id of a device) if and
     * only if the device has also been advertised.
     */
    shouldAdvertiseDevice?: boolean;

    /**
     * Determines whether the communication manager should publish readable
     * messaging topics for optimized testing and debugging. Instead of using
     * a UUID alone, a readable name can be part of the topic levels of
     * Associated User ID, Source Object ID, and Message Tokens.
     *
     * If not specified, the value of this option defaults to false.
     */
    useReadableTopics?: boolean;

    /**
     * Determines whether the communication manager should provide a protocol
     * compliant client ID when connecting to the broker/router.
     * 
     * If not specified, the value of this option defaults to false.
     * 
     * For example, MQTT Spec 3.1 states that the broker MUST allow Client IDs
     * which are between 1 and 23 UTF-8 encoded bytes in length, and that contain only
     * the characters "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".
     * However, broker implementations are free to allow non-compliant Client IDs.
     * 
     * By default, non-compliant Client IDs of the form "COATYuuid" are used where
     * uuid specifies the `objectId` of the communication manager's `identity` object.
     * If you experience issues with a specific broker, specify this option as `true`.
     */
    useProtocolCompliantClientId?: boolean;
}

/**
 * Controller options mapped by controller name (as specified in `Components`).
 */
export interface ControllerConfig {
    [controllerName: string]: ControllerOptions;
}

/**
 * Controller-specific options
 */
export interface ControllerOptions {

    /**
     * Property-value pairs to be initialized on the identity object of the
     * controller (optional). For example, the `name` of the
     * identity object can be configured here.
     */
    identity?: { [prop: string]: any };

    /**
     * Determines whether the controller should advertise its identity
     * automatically when it is instantiated and deadvertise its identity when
     * the communication manager is stopped or terminated abnormally (via last
     * will). If not specified or undefined, the identity is
     * advertised/deadvertised by default.
     *
     * The controller's identity is also discoverable (by publishing
     * a Discover event with core type "Component" or with the object id of a
     * component) if and only if the identity has also been advertised.
     */
    shouldAdvertiseIdentity?: boolean;

    /**
     * Any other application-specific properties accessible by indexer.
     */
    [extra: string]: any;
}

/**
 * Database access options mapped by a unique database key.
 */
export interface DatabaseOptions {

    /**
     * Database connection info indexed by a database key.
     */
    [databaseKey: string]: DbConnectionInfo;
}

/**
 * Describes information used to connect to a specific database server using
 * a specific database adapter.
 *
 * DbConnectionInfo objects conform to JSON format in order
 * to be serializable (see interface `DatabaseOptions`).
 */
export interface DbConnectionInfo {

    /**
     * The name of the adapter used to interact with a specific database server.
     *
     * The name of the adapter specified here must be associated with the
     * constructor function of a built-in adapter type or a custom
     * adapter type by using the `DbAdapterFactory.registerAdapter` method
     * or by specifying the adapter type as optional argument when
     * creating a new `DbContext` or `DbLocalContext`.
     */
    adapter: string;

    /**
     * Adapter-specific configuration options (optional).
     */
    adapterOptions?: any;

    /**
     * An adapter-specific connection string or Url containing connection
     * details (optional).
     * Use alternatively to or in combination with `connectionOptions`.
     */
    connectionString?: string;

    /**
     * Adapter-specific connection options (optional).
     * Use alternatively to or in combination with `connectionString`.
     */
    connectionOptions?: any;
}

/**
 * Returns a new Coaty container configuration object as a result of merging the two given
 * primary and secondary configurations.
 *
 * For each sub-configuration object (common, communication, etc.) the value of a
 * property specified in primary overrides the value specified
 * in secondary. In other words, the value of a secondary sub-configuration
 * property is only taken if this property is not defined in primary.
 * Note that merging only considers direct properties on the subconfiguration
 * object level, not sub-levels thereof.
 *
 * @param primary the primary configuration
 * @param secondary the secondary configuration to be merged
 */
export function mergeConfigurations(
    primary: Configuration,
    secondary: Configuration): Configuration {
    const result = {};

    Object.keys(primary).forEach(prop => {
        // Create shallow copy of sub-configuration properties
        result[prop] = Object.assign({}, primary[prop]);
    });

    Object.keys(secondary).forEach(prop => {
        const config = secondary[prop];
        const primaryConfig = result[prop];
        if (primaryConfig === undefined) {
            // Create shallow copy of sub-configuration properties
            result[prop] = Object.assign({}, config);
        } else {
            Object.keys(config).forEach(p => {
                if (primaryConfig[p] === undefined) {
                    primaryConfig[p] = config[p];
                }
            });
        }
    });

    return result as Configuration;
}
