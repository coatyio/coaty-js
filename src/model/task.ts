/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { CoatyObject, Uuid } from "./object";

/**
 * Predefined status values of Task objects.
 */
export enum TaskStatus {

    /**
     * Initial state of a new task
     */
    Pending,

    /**
     * Task is in progress
     */
    InProgress,

    /**
     * Task is completed
     */
    Done,

    /**
     * Task is blocked, e.g. because of a problem
     */
    Blocked,

    /**
     * Task is cancelled
     */
    Cancelled,

    /**
     * Task Request
     */
    Request,

    /**
     * Task Request Cancelled
     */
    RequestCancelled,
}

/**
 * Represents a task or task request.
 */
export interface Task extends CoatyObject {

    coreType: "Task";

    /**
     * Object ID of user who created the task
     */
    creatorId: Uuid;

    /**
     * Timestamp when task was issued/created.
     * Value represents the number of milliseconds since the epoc in UTC.
     * (see Date.getTime(), Date.now())
     */
    creationTimestamp: number;

    /**
     * Timestamp when task has been changed (optional).
     * Value represents the number of milliseconds since the epoc in UTC.
     * (see Date.getTime(), Date.now())
     */
    lastModificationTimestamp?: number;

    /**
     * Timestamp when task should be due (optional).
     * Value represents the number of milliseconds since the epoc in UTC.
     * (see Date.getTime(), Date.now())
     */
    dueTimestamp?: number;

    /**
     * Timestamp when task has been done (optional).
     * Value represents the number of milliseconds since the epoc in UTC.
     * (see Date.getTime(), Date.now())
     */
    doneTimestamp?: number;

    /**
     * The amount of time (in milliseconds) the task will
     * take or should took to complete (optional).
     */
    duration?: number;

    /**
     * Status of task
     */
    status: TaskStatus;

    /**
     * Required competencies / roles needed for this task (optional).
     * The requirements specified are combined by logical AND, i.e. all
     * requirements must be fullfilled.
     */
    requirements?: string[];

    /**
     * Description of the task (optional)
     */
    description?: string;

    /**
     * Associated workflow Id (optional)
     */
    workflowId?: Uuid;

}





