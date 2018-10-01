/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { Subscription } from "rxjs";
import { filter, map } from "rxjs/operators";

import { AdvertiseEvent, CompleteEvent } from "coaty/com";
import { Controller } from "coaty/controller";
import { DbContext } from "coaty/db";
import { TaskStatus } from "coaty/model";
import { Container } from "coaty/runtime";
import { NodeUtils } from "coaty/runtime-node";

import { Db } from "../shared/db";
import { LogTags } from "../shared/log-tags";
import { HelloWorldTask, HelloWorldTaskUrgency, modelTypes } from "../shared/models";
import { TaskSnapshotController } from "./task-snapshot-controller";

/**
 * Periodically generates new task requests and advertises them to 
 * connected Hello World clients. Assigns tasks to offering clients 
 * on a first-come first-served basis. The created and managed tasks 
 * are persisted in the database task collection. For each change of a task a
 * snapshot object is created and persisted with the HistorianController, which 
 * can be queried by any other connected Hello World component.
 */
export class TaskController extends Controller {

    private static _taskCounter = 1;

    private _advertiseSubscription: Subscription;
    private _updateSubscription: Subscription;
    private _dbCtx: DbContext;
    private _taskSnapshotController: TaskSnapshotController;

    onInit() {
        super.onInit();
        this._dbCtx = new DbContext(this.runtime.databaseOptions["db"]);
    }

    onCommunicationManagerStarting() {
        super.onCommunicationManagerStarting();
        this._updateSubscription = this._observeUpdateRequests();
        this._advertiseSubscription = this._observeAdvertiseTasks();
        this._generateRequests();
    }

    onCommunicationManagerStopping() {
        super.onCommunicationManagerStopping();
        this._updateSubscription && this._updateSubscription.unsubscribe();
        this._advertiseSubscription && this._advertiseSubscription.unsubscribe();
    }

    onContainerResolved(container: Container) {
        this._taskSnapshotController = container.getController(TaskSnapshotController);
    }

    /**
     * Periodically generates new task requests and advertises them to connected Hello World clients.
     * A snapshot object of the new task request is persisted in the database.
     */
    private _generateRequests() {
        setInterval(() => {
            const request = this._createRequest();
            this._dbCtx.insertObjects(Db.COLLECTION_TASK, request)
                .then(() => this.communicationManager.publishAdvertise(AdvertiseEvent.withObject(this.identity, request)))
                .then(() => NodeUtils.logEvent(`Request advertised: ${request.name}`, "ADVERTISE", "Out"))
                .catch(error => this.logError(error, "Failed to advertise new task", LogTags.LOG_TAG_DB, LogTags.LOG_TAG_SERVICE));

            // Generate a snapshot object of the new request and process it according to the controller config
            this._taskSnapshotController.generateSnapshot(request);
            NodeUtils.logInfo(`Snapshot created: ${request.name}`);
        }, this.options["requestGenerationInterval"]);
    }

    /** 
     * Creates a new task request 
     */
    private _createRequest(): HelloWorldTask {
        return {
            objectId: this.runtime.newUuid(),
            objectType: modelTypes.OBJECT_TYPE_HELLO_WORLD_TASK,
            coreType: "Task",
            name: `Hello World Task ${TaskController._taskCounter++}`,
            creatorId: this.runtime.options.associatedUser.objectId,
            creationTimestamp: Date.now(),
            status: TaskStatus.Request,
            urgency: HelloWorldTaskUrgency.Critical,
        };
    }

    /**
     * Assigns tasks to offering clients on a first-come first-served basis.
     * As soon as the properties of task are changed generated a snaphot and process is 
     * according to the controller config.
     */
    private _observeUpdateRequests() {
        return this.communicationManager
            .observeUpdate(this.identity)
            .pipe(filter(event => event.eventData.isPartialUpdate))
            .subscribe(event => {
                // Use a database transaction to ensure integrity of stored data (see _observeAdvertiseTasks)
                this._dbCtx.transaction(txCtx => {
                    return txCtx.findObjectById<HelloWorldTask>(Db.COLLECTION_TASK, event.eventData.objectId)
                        .then(task => {
                            if (task === undefined) {
                                // Do not reply to an Update event which doesn't target a known task.
                                return;
                            }

                            NodeUtils.logEvent(`Task offer received: ${task.name}`, "UPDATE", "In");

                            if (task.status !== TaskStatus.Request) {
                                // This is an outdated offer for an already assigned task.
                                NodeUtils.logEvent(`Task offer rejected - already assigned: ${task.name}`, "COMPLETE", "Out");

                                // Reply to the Update requester with the already assigned task.
                                event.complete(CompleteEvent.withObject(this.identity, task));
                                return;
                            }

                            // Assign task to the offering client and change task status to pending.
                            task.assigneeUserId = event.eventData.changedValues["assigneeUserId"];
                            task.dueTimestamp = event.eventData.changedValues["dueTimestamp"];
                            task.status = TaskStatus.Pending;
                            task.lastModificationTimestamp = Date.now();

                            NodeUtils.logEvent(
                                `Task offer accepted: ${task.name}, Client User ID: ${task.assigneeUserId}`,
                                "COMPLETE",
                                "Out");

                            return txCtx.updateObjects(Db.COLLECTION_TASK, task)
                                .then(() => {
                                    // Reply to the Update requester with the updated task.
                                    event.complete(CompleteEvent.withObject(this.identity, task));

                                    NodeUtils.logEvent(
                                        `Task assigned: ${task.name}, Client User ID: ${task.assigneeUserId}`,
                                        "ADVERTISE",
                                        "Out");

                                    // Notify other components that task is pending.
                                    this.communicationManager.publishAdvertise(AdvertiseEvent.withObject(this.identity, task));

                                    // Generate a snapshot object of the changed task and process it
                                    // according to the controller config
                                    this._taskSnapshotController.generateSnapshot(task);
                                    NodeUtils.logInfo(`Snapshot created: ${task.name}`);
                                });
                        });
                }).catch(error => this.logError(error, "Failed to assign task", LogTags.LOG_TAG_DB, LogTags.LOG_TAG_SERVICE));
            });
    }

    /** 
     * Listen for task status changes and update the affected task object in the database.
     * Generate a snaphot object for the received task object and process is 
     * according to the controller config.
     */
    private _observeAdvertiseTasks() {
        return this.communicationManager.observeAdvertiseWithObjectType(this.identity, modelTypes.OBJECT_TYPE_HELLO_WORLD_TASK)
            .pipe(map(event => event.eventData.object as HelloWorldTask))
            .subscribe(task => {
                NodeUtils.logEvent(`Task status ${TaskStatus[task.status]}: ${task.name}`, "ADVERTISE", "In");

                // Use a database transaction to ensure integrity of stored data (see _observeUpdateRequests).
                this._dbCtx.transaction(txCtx => txCtx.updateObjects(Db.COLLECTION_TASK, task))
                    .catch(error => this.logError(error, "Failed to update task", LogTags.LOG_TAG_DB, LogTags.LOG_TAG_SERVICE));

                // Generate a snapshot object of any potentially changed task and process it
                // according to the controller config
                this._taskSnapshotController.generateSnapshot(task);
                NodeUtils.logInfo(`Snapshot created: ${task.name}`);
            });
    }

}
