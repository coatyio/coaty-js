/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { Container } from "coaty/runtime";
import { NodeUtils } from "coaty/runtime-node";

import { Db } from "../shared/db";

import { components, configuration } from "./agent.config";

NodeUtils.handleProcessTermination();

// Register database adapters before resolving a Coaty container so that
// controllers can create database contexts at instantiation.
Db.initDatabaseAdapters();

// First, initialize the database
Db.initDatabase(configuration.databases)
    .then(() => {
        // Then, create the Coaty container with the specified components and
        // autostart the communication manager.
        const container = Container.resolve(components, configuration);

        // Log broker connection state changes (online/offline) to the console.
        NodeUtils.logCommunicationState(container);

        return container;
    })
    .catch(error => NodeUtils.logError(error, "Failed to initialize service."));

