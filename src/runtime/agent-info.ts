/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

/**
 * Represents package, build and config information about a Coaty
 * agent which is running as a mobile/browser app or as a Node.js service.
 *
 * Agent information is generated when the agent project is build
 * and can be used at run time, e.g. for logging, display, or configuration.
 */
export interface AgentInfo {

    packageInfo: AgentPackageInfo;

    buildInfo: AgentBuildInfo;

    configInfo: AgentConfigInfo;
}

/**
 * Represents information about the agent's package (usually npm).
 */
export interface AgentPackageInfo {

    /**
     * The agent package name
     */
    name: string;

    /**
     * The agent package version 
     */
    version: string;

    /**
     * Any other package-specific properties accessible by indexer
     */
    [extra: string]: any;
}

/**
 * Represents information about agent build.
 */
export interface AgentBuildInfo {

    /**
     * The build date of the agent project.
     *
     * The value is in ISO 8601 format and parsable by `new Date(<isoString>)`
     * or `Date.parse(<isoString>)`.
     */
    buildDate: string;

    /**
     * The build mode of the agent project. Indicates whether the agent is
     * built for a production, development, staging, or any other custom build
     * environment.
     *
     * By default, the value is acquired from environment variable setting
     * `COATY_ENV` if specified; otherwise it defaults to "development".
     */
    buildMode: "production" | "development" | "staging" | "testing" | string;

    /**
     * Any other build-specific properties accessible by indexer
     */
    [extra: string]: any;
}

/**
 * Represents information about agent configuration.
 */
export interface AgentConfigInfo {

    /**
     * The host name used for communication binding connections and REST based
     * services (optional).
     *
     * The value is acquired from the environment variable
     * `COATY_SERVICE_HOST`. If not set the value defaults to an empty string.
     */
    serviceHost: string;

    /**
     * Any other config-specific properties accessible by indexer
     */
    [extra: string]: any;
}
