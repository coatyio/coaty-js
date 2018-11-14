/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { Subscription } from "rxjs";
import { filter, map, take, timeout } from "rxjs/operators";

import { AdvertiseEvent, QueryEvent, UpdateEvent } from "coaty/com";
import { Controller } from "coaty/controller";
import { Component, filterOp, ObjectFilter, Snapshot, TaskStatus } from "coaty/model";
import { NodeUtils } from "coaty/runtime-node";

import { LogTags } from "../shared/log-tags";
import { HelloWorldTask, modelTypes } from "../shared/models";

/**
 * Listens for task requests advertised by the service and carries out assigned tasks.
 */
export class TaskController extends Controller {

    private _assignedTask: HelloWorldTask;
    private _advertiseSubscription: Subscription;

    onCommunicationManagerStarting() {
        super.onCommunicationManagerStarting();
        this._advertiseSubscription = this._observeAdvertiseRequests();

        console.log(`# Client User ID: ${this.runtime.options.associatedUser.objectId}`);
    }

    onCommunicationManagerStopping() {
        super.onCommunicationManagerStopping();
        this._advertiseSubscription && this._advertiseSubscription.unsubscribe();
    }

    protected initializeIdentity(identity: Component) {
        // Augment default identity by client user ID.
        // This is one way to provide user and/or devivce information with the controller's identity.
        // Alternatively, the user ID can be extracted by the receiver of the advertised
        // event by reading the event's eventUserId property
        // (see service ComponentController._observeAdvertiseComponent, _observeDeadvertiseComponent).
        identity.assigneeUserId = this.runtime.options.associatedUser.objectId;
    }

    private _observeAdvertiseRequests() {
        return this.communicationManager
            .observeAdvertiseWithObjectType(this.identity, modelTypes.OBJECT_TYPE_HELLO_WORLD_TASK)
            .pipe(
                map(event => event.eventData.object as HelloWorldTask),
                filter(request => request.status === TaskStatus.Request),
            )
            .subscribe(request => this._handleRequest(request));
    }

    private _handleRequest(request: HelloWorldTask) {
        // Do not accept further requests while a task is being carried out.
        if (this._assignedTask) {
            this._logConsole(`Request ignored while busy: ${request.name}`, "ADVERTISE", "In");
            return;
        }

        this._logConsole(`Request received: ${request.name}`, "ADVERTISE", "In");

        // Simulate a random delay before making an offer for the incoming request.
        setTimeout(() => {
            this._logConsole(`Make an offer for request: ${request.name}`, "UPDATE", "Out");
            this.communicationManager.publishUpdate(
                UpdateEvent.withPartial(this.identity, request.objectId, {
                    // Offer to accomplish task immediately
                    dueTimestamp: Date.now(),
                    assigneeUserId: this.runtime.options.associatedUser.objectId,
                }))
                .pipe(
                    // Unsubscribe automatically after first response event arrives.
                    take(1),
                    map(event => event.eventData.object as HelloWorldTask),
                )
                .subscribe(task => {
                    // Check whether my offered task has been accepted, then start to accomplish the task
                    if (task.assigneeUserId === this.runtime.options.associatedUser.objectId) {
                        this._logConsole(`Offer accepted for request: ${task.name}`, "COMPLETE", "In");
                        this._accomplishTask(task);
                    } else {
                        this._logConsole(`Offer rejected for request: ${task.name}`, "COMPLETE", "In");
                    }
                });
        }, (Math.random() + 1) * this.options["minTaskOfferDelay"]);
    }

    private _accomplishTask(task: HelloWorldTask) {
        task.status = TaskStatus.InProgress;
        task.lastModificationTimestamp = Date.now();

        this._assignedTask = task;

        this._logConsole(`Carrying out task: ${task.name}`);

        // Notify other components that task is now in progress
        this.communicationManager.publishAdvertise(AdvertiseEvent.withObject(this.identity, this._assignedTask));

        setTimeout(() => {
            this._assignedTask.status = TaskStatus.Done;
            this._assignedTask.lastModificationTimestamp = this._assignedTask.doneTimestamp = Date.now();

            this._logConsole(`Completed task: ${this._assignedTask.name}`, "ADVERTISE", "Out");

            // Notify other components that task has been completed
            this.communicationManager.publishAdvertise(AdvertiseEvent.withObject(this.identity, this._assignedTask));

            // Query list of snapshot objects from the just finished task
            const objectFilter: ObjectFilter = {
                conditions: {
                    and: [["parentObjectId", filterOp.equals(this._assignedTask.objectId)]],
                },
                orderByProperties: [["creationTimestamp", "Desc"]],
            };

            NodeUtils.logEvent(`Snapshots by parentObjectId: ${task.name}`, "QUERY", "Out");
            this.communicationManager
                .publishQuery(QueryEvent.withCoreTypes(this.identity, ["Snapshot"], objectFilter))
                // Unsubscribe automatically after first response event arrives.
                .pipe(
                    take(1),
                    // Issue an Rx.TimeoutError if queryTimeoutMillis elapses without any emitted event.
                    timeout(this.options["queryTimeoutMillis"]),
                )
                .subscribe(
                    event => {
                        NodeUtils.logEvent(`Snapshots by parentObjectId: ${task.name}`, "RETRIEVE", "In");
                        this._logHistorian(event.eventData.objects as Snapshot[]);
                    },
                    error => {
                        // No response has been received within the given period of time.
                        this.logError(error, "Failed to query snapshot objects", LogTags.LOG_TAG_CLIENT);
                    });

            // Now further incoming task requests can be handled again
            this._assignedTask = undefined;

        }, (Math.random() + 1) * this.options["minTaskDuration"]);
    }

    private _logConsole(message: string, eventName?: string, eventDirection: "In" | "Out" = "In") {
        let output = eventName ? (eventDirection === "In" ? "-> " : "<- ") : "   ";
        output += ((eventName || "") + " ".repeat(11 - (eventName ? eventName.length : 0)));
        output += "| " + message;
        console.log(output);
    }

    private _logHistorian(snapshots: Snapshot[]) {
        console.log("#############################");
        console.log(`## Snapshots retrieved (${snapshots.length})`);
        snapshots.forEach(snapshot => {
            console.log(`# timestamp: \t${snapshot.creationTimestamp}`
                + ` status: ${(<HelloWorldTask> snapshot.object).status}`
                + ` assignedUserId: \t${(<HelloWorldTask> snapshot.object).assigneeUserId}`);
        });
        console.log("#############################");
        console.log("");
    }
}
