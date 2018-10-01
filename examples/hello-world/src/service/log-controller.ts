/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { Subscription } from "rxjs";
import { filter } from "rxjs/operators";

import { AdvertiseEvent, RetrieveEvent } from "coaty/com";
import { Controller } from "coaty/controller";
import { DbContext } from "coaty/db";
import { Log } from "coaty/model";

import { Db } from "../shared/db";
import { DatabaseChange, modelTypes } from "../shared/models";

/**
 * Observes advertised Log objects, stores them in the database and
 * advertises a corresponding DatabaseChange object.
 * Provides a query event interface exposing the saved log objects for 
 * analysis and visualization (see monitor component).
 */
export class LogController extends Controller {

    private _advertiseSubscription: Subscription;
    private _querySubscription: Subscription;
    private _dbCtx: DbContext;

    onInit() {
        super.onInit();
        this._dbCtx = new DbContext(this.runtime.databaseOptions["db"]);
    }

    onCommunicationManagerStarting() {
        super.onCommunicationManagerStarting();
        this._querySubscription = this._observeQueryLog();
        this._advertiseSubscription = this._observeAdvertiseLog();
    }

    onCommunicationManagerStopping() {
        super.onCommunicationManagerStopping();
        this._querySubscription && this._querySubscription.unsubscribe();
        this._advertiseSubscription && this._advertiseSubscription.unsubscribe();
    }

    private _observeAdvertiseLog() {
        return this.communicationManager
            .observeAdvertiseWithCoreType(this.identity, "Log")
            .subscribe(event => {
                const log = event.eventData.object as Log;
                this._dbCtx.insertObjects(Db.COLLECTION_LOG, log, true)
                    .then(() => this._advertiseDatabaseChange());
            });
    }

    private _observeQueryLog() {
        return this.communicationManager
            .observeQuery(this.identity)
            .pipe(filter(event => event.eventData.isCoreTypeCompatible("Log")))
            .subscribe(event => {
                this._dbCtx
                    .findObjects<Log>(Db.COLLECTION_LOG, event.eventData.objectFilter)
                    .then(iterator => iterator.forBatch(batch => {
                        event.retrieve(RetrieveEvent.withObjects(this.identity, batch));
                    }))
                    .catch(error => {
                        // In case of retrieval error, do not respond with a 
                        // Retrieve event. The sender of the query should 
                        // implement proper error handling by using a timeout 
                        // operator that triggers in case no response 
                        // is received after a certain period of time.
                    });
            });
    }

    private _advertiseDatabaseChange() {
        const change: DatabaseChange = {
            name: "Db log change",
            objectId: this.runtime.newUuid(),
            objectType: modelTypes.OBJECT_TYPE_DATABASE_CHANGE,
            coreType: "CoatyObject",
            hasLogChanged: true,
            hasTaskChanged: false,
        };
        this.communicationManager.publishAdvertise(AdvertiseEvent.withObject(this.identity, change));
    }
}
