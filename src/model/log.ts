/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { AgentInfo } from "..";
import { CoatyObject } from "./object";

/**
 * Predefined logging levels ordered by a numeric value.
 */
export enum LogLevel {

    /**
     * Fine-grained statements concerning program state, Typically only
     * interesting for developers and used for debugging.
     */
    Debug = 10,

    /**
     * Informational statements concerning program state, representing program
     * events or behavior tracking. Typically interesting for support staff
     * trying to figure out the context of a given error.
     */
    Info = 20,

    /**
     * Statements that describe potentially harmful events or states in the
     * program. Typically interesting for support staff trying to figure out
     * potential causes of a given error.
     */
    Warning = 30,

    /**
     * Statements that describe non-fatal errors in the application; this level
     * is used quite often for logging handled exceptions.
     */
    Error = 40,

    /**
     * Statements representing the most severe of error conditions, assumedly
     * resulting in program termination. Typically used by unhandled exception
     * handlers before terminating a program.
     */
    Fatal = 50,
}

/**
 * Represents a log object.
 */
export interface Log extends CoatyObject {

    coreType: "Log";

    /**
     * The level of logging.
     */
    logLevel: LogLevel;

    /**
     * The message to log.
     */
    logMessage: string;

    /**
     * Timestamp in ISO 8601 format (with or without timezone offset), as from
     * `coaty/util/toLocalIsoString` or `Date.toISOString`.
     */
    logDate: string;

    /**
     * Represents a series of tags assigned to this Log object (optional).
     * Tags are used to categorize or filter log output.
     * Agents may introduce specific tags, such as "service" or "app".
     *
     * Log objects published by the framework itself always use the reserved
     * tag named "coaty" as part of the `logTags` property. This tag should 
     * never be used by agent projects.
     */
    logTags?: string[];

    /**
     * Information about the host environment in which this log object is
     * created (optional).
     *
     * Typically, this information is just send once as part of an initial
     * advertised log event. Further log records need not specify this
     * information because it can be correlated automatically by the event
     * source ID.
     */
    logHost?: LogHost;

    /**
     * Any other custom properties accessible by indexer
     */
    [extra: string]: any;

}

/**
 * Information about the host environment in which a Log object is created.
 * This information should only be logged once by each agent,
 * e.g. initially at startup.
 */
export interface LogHost {

    /**
     * Package and build information of the agent that logs.
     */
    agentInfo?: AgentInfo;

    /**
     * Process ID of the application that generates a log record (optional).
     * May be specified by Node.js applications.
     */
    pid?: number;

    /**
     * Hostname of the application that generates a log record (optional).
     * May be specified by Node.js applications.
     */
    hostname?: string;

    /**
     * Hostname of the application that generates a log record (optional).
     * May be specified by browser or cordova applications.
     */
    userAgent?: string;

    /**
     * Any other custom properties accessible by indexer
     */
    [extra: string]: any;
}
