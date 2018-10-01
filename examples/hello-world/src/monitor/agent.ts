/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { LogLevel } from "coaty/model";
import { Container } from "coaty/runtime";
import { NodeUtils } from "coaty/runtime-node";

import { Db } from "../shared/db";

import { components, configuration } from "./agent.config";
import { MonitorController } from "./monitor-controller";

NodeUtils.handleProcessTermination();

// Register database adapters before resolving a Coaty container so that
// controllers can create database contexts at instantiation.
Db.initDatabaseAdapters();

// First, initialize the database (do not clear data)
Db.initDatabase(configuration.databases, false)
    .then(() => {
        // Then, create the Coaty container with the specified components and
        // autostart the communication manager.
        const container = Container.resolve(components, configuration);

        // Log broker connection state changes (online/offline) to the console.
        NodeUtils.logCommunicationState(container);

        return container;
    })
    .then(container => initConsoleOutput(container.getController(MonitorController)))
    .catch(error => NodeUtils.logError(error, "Failed to initialize monitor."));


/**
 * Monitors log entries and writtes them to the console window.
 * 
 * This function simulates a user interface component that observes
 * log data emitted by the monitor controller.
 */
function initConsoleOutput(monitor: MonitorController) {
    "use strict";

    monitor.getLog().subscribe(logs => {
        console.log("#############################");
        console.log(`## Log updated (${logs.length})`);
        console.log("##");
        logs.forEach(log => {
            console.log(`## [${log.logDate}] level:${LogLevel[log.logLevel]} tags:${(log.logTags || []).join(",")} ${log.logMessage}`);
        });
        console.log("##");
        console.log("#############################");
        console.log("");
    });
}
