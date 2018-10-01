/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { CoreTypes } from "coaty/model";
import { Components, Configuration, Container, mergeConfigurations } from "coaty/runtime";
import { NodeUtils } from "coaty/runtime-node";

import { prompt } from "inquirer";
import { clientConfig } from "./agent.config";
import { agentInfo } from "./agent.info";
import { SensorThingsController } from "./sensor-things-controller";

prompt([
    {
        type: "checkbox",
        message: "Select metrics you want to monitor",
        name: "metrics",
        choices: [
            {
                name: "Load average",
            },
            {
                name: "Free memory",
            },
            {
                name: "Uptime",
            },
        ],
        validate: (answer) => {
            if (answer.length < 1) {
                return "You must choose at least one metric.";
            }
            return true;
        },
    },
    {
        type: "input",
        name: "deviceName",
        message: "What is the name of your thing?",
    },
    {
        type: "input",
        name: "roomName",
        message: "In which room is your thing located?",
    },
]).then((answers: any) => {

    NodeUtils.handleProcessTermination();

    /**
     * Inline configuration to have an easier access to answers
     */
    const configuration: Configuration = mergeConfigurations(
        clientConfig(agentInfo),
        {
            common: {
                agentInfo,
            },
            communication: {},
            controllers: {
                SensorThingsController: {
                    answers: {
                        metrics: answers.metrics,
                        names: { deviceName: answers.deviceName, roomName: answers.roomName },
                    },
                    monitoringInterval: 5000, // send metrics every 5 seconds
                },
            },
        });
    const components: Components = {
        controllers: {
            SensorThingsController,
        },
    };
    const container = Container.resolve(components, configuration);

    // Then, associate a distinct user with each client instance.
    associateClientUser(container);

    // Log broker connection state changes (online/offline) to the console.
    NodeUtils.logCommunicationState(container);

    // Finally start the communication manager.
    container.getCommunicationManager().start();

    function associateClientUser(cont: Container) {
        "use strict";

        cont.getRuntime().options.associatedUser = {
            objectId: cont.getRuntime().newUuid(),
            objectType: CoreTypes.OBJECT_TYPE_USER,
            coreType: "User",
            name: answers.deviceName,
            names: {
                givenName: "Device " + answers.deviceName,
                familyName: answers.deviceName,
            },
        };
    }
});


