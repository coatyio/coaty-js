/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { CoatyObject, Task } from "coaty/model";

export const modelTypes = {
    OBJECT_TYPE_HELLO_WORLD_TASK: "com.helloworld.Task",
    OBJECT_TYPE_DATABASE_CHANGE: "com.helloworld.DatabaseChange",
};

/**
 * Represents a Hello World task or task request.
 */
export interface HelloWorldTask extends Task {

    /**
     * Level of urgency of the HelloWorldTask 
     */
    urgency: HelloWorldTaskUrgency;
}

/**
 * Defines urgency levels for HelloWorld tasks
 */
export enum HelloWorldTaskUrgency {
    Low,
    Medium,
    High,
    Critical,
}

/**
 * Represents an object that signals changes to database collections.
 */
export interface DatabaseChange extends CoatyObject {

    /**
     * Indicates that a new log object has been written to the database (optional).
     * If not specified, the default value is false.
     */
    hasLogChanged?: boolean;

    /**
     * Indicates that a new task has written to the database (optional).
     * If not specified, the default value is false.
     */
    hasTaskChanged?: boolean;
}
