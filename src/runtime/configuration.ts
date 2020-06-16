/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import {
    AgentInfo,
    CommunicationBinding,
    CommunicationBindingOptions,
    CommunicationBindingWithOptions,
    Identity,
    IoActor,
    IoSource,
} from "..";

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
 * Common options shared by container components.
 */
export interface CommonOptions {

    /**
     * Specify IO nodes associated with IO contexts for IO routing (optional).
     *
     * Each IO node definition is hashed by the IO context name the node should
     * be associated with. An IO node definition includes IO sources and/or IO
     * actors, and node-specific characteristics to be used for IO routing.
     *
     * If neither IO sources nor IO actors are specified for an IO node, its
     * node definition is ignored.
     */
    ioContextNodes?: {
        [ioContextName: string]:
        { ioSources?: IoSource[], ioActors?: IoActor[], characteristics?: { [key: string]: any } },
    };

    /**
     * Property-value pairs to be configured on the identity object of the agent
     * container (optional). Usually, an expressive `name` of the identity is
     * configured here.
     *
     * @remarks Note that `objectType` and `coreType` properties of an identity
     * object are ignored, i.e. cannot be overridden.
     */
    agentIdentity?: Partial<Identity>;

    /**
     * Agent information generated and injected into the configuration when the
     * agent project is build (optional).
     *
     * To be used locally by an agent to access build and release information of
     * the application for displaying, logging, etc.
     */
    agentInfo?: AgentInfo;

    /**
     * Additional application-specific properties (optional).
     *
     * Useful to inject service instances to be shared among controllers.
     */
    extra?: { [key: string]: any };
}

/**
 * Options used for communication.
 */
export interface CommunicationOptions {

    /**
     * Communication binding for transmitting Coaty communication events via a
     * specific publish-subscribe messaging protocol.
     *
     * Use one of the predefined Coaty communication bindings which are provided
     * as separate npm packages named `@coaty/binding.*`. For example, to use
     * the MQTT protocol as a binding for your Coaty application:
     *
     * ```ts
     * import { MqttBinding } from "@coaty/binding.mqtt";
     *
     * const configuration: Configuration = {
     *   ...
     *   communication: {
     *       binding: MqttBinding.withOptions({
     *           brokerUrl: ... ,
     *           ...
     *       }),
     *       ...
     *   },
     *   ...
     * };
     * ```
     *
     * @remarks This feature is experimental until Coaty 3. If no binding is
     * specified, a default MQTT binding is used with the MQTT specific options
     * defined in this interface.
     */
    binding?: CommunicationBindingWithOptions<CommunicationBinding<CommunicationBindingOptions>, CommunicationBindingOptions>;

    /**
     * 
     * @deprecated since 2.1.0. Specify in binding options instead.
     * 
     * Namespace used to isolate different Coaty applications (optional).
     *
     * Communication events are only routed between agents within a common
     * communication namespace.
     *
     * A namespace string must not contain the following characters: `NULL
     * (U+0000)`, `# (U+0023)`, `+ (U+002B)`, `/ (U+002F)`.
     *
     * If not specified or empty, a default namespace named "-" is used.
     */
    namespace?: string;

    /**
     * @deprecated since 2.1.0. Specify in binding options instead.
     * 
     * Determines whether to enable cross-namespace communication between agents
     * in special use cases (optional). 
     *
     * If `true`, an agent receives communication events published by *any*
     * agent in the same networking infrastructure, regardless of namespace.
     *
     * If not specified or `false`, this option is not enabled.
     */
    shouldEnableCrossNamespacing?: boolean;

    /**
     * Determines whether the communication manager should start initially when
     * the container has been resolved. Its value defaults to false.
     */
    shouldAutoStart?: boolean;

    /**
     * @deprecated since 2.1.0.
     * 
     * Determines whether the communication manager should provide a protocol
     * compliant client ID when connecting to the broker/router.
     *
     * If not specified, the value of this option defaults to false.
     *
     * For example, MQTT Spec 3.1 states that the broker MUST allow Client IDs
     * which are between 1 and 23 UTF-8 encoded bytes in length, and that
     * contain only the characters
     * "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".
     * However, broker implementations are free to allow non-compliant Client
     * IDs.
     *
     * By default, non-compliant Client IDs of the form "Coaty<uuid>" are used
     * where `<uuid>` specifies the `objectId` of the communication manager's
     * `Identity` object. If you experience issues with a specific broker,
     * specify this option as `true`.
     */
    useProtocolCompliantClientId?: boolean;

    /**
     * @deprecated since 2.1.0. Specify in binding options instead.
     * 
     * Connection Url to MQTT broker (schema 'protocol://host:port') (optional).
     * If the `servers` option in property `mqttClientOptions` is specified this
     * property is ignored.
     */
    brokerUrl?: string;

    /**
     * @deprecated since 2.1.0. Specify as binding options instead.
     * 
     * Options passed to MQTT Client (see [MQTT.js connect
     * options](https://github.com/mqttjs/MQTT.js#mqttconnecturl-options)).
     *
     * In addition to the MQTT.js options, you can also pass a QoS level (0 | 1
     * | 2) for publications, subscriptions, and last will messages in the `qos`
     * property. If it is not specified, the QoS level is 0.
     */
    mqttClientOptions?: any;

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
     * Any application-specific controller options.
     */
    [key: string]: any;
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
     * The name of the adapter specified here must be associated with a built-in
     * or custom adapter type by using the `DbAdapterFactory.registerAdapter`
     * method or by specifying the adapter type on first use when creating a new
     * `DbContext` or `DbLocalContext`.
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
 * Returns a new Coaty container configuration object as a result of merging the
 * two given (partial) primary and secondary configurations.
 *
 * For each sub-configuration object (common, communication, etc.) the value of
 * a property specified in primary overrides the value specified in secondary.
 * In other words, the value of a secondary sub-configuration property is only
 * taken if this property is not defined in primary. Note that merging only
 * considers direct properties on the subconfiguration object level, not
 * sub-levels thereof.
 *
 * @param primary the (partial) primary configuration
 * @param secondary the (partial) secondary configuration to be merged
 *
 * @throws if merged configuration misses required sub-configuration options.
 */
export function mergeConfigurations(
    primary: Partial<Configuration>,
    secondary: Partial<Configuration>): Configuration {
    const result: Partial<Configuration> = {};

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

    if (result.communication === undefined) {
        throw new Error("Missing 'communication' configuration options in merged configuration.");
    }

    return result as Configuration;
}
