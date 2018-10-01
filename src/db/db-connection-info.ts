/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

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
