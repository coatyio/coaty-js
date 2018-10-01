/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { QueryEvent } from "coaty/com";
import { HistorianController } from "coaty/controller";
import { Snapshot } from "coaty/model";
import { NodeUtils } from "coaty/runtime-node";

/**
 * A HistorianController that logs Query-Retrieve events on snapshots.
 * 
 * Note: This class is for demonstration purposes only. If you don't need
 * to perform side effects on Query-Retrieve of snapshots the base
 * frameowrk class HistorianController should be used directly.
 */
export class TaskSnapshotController extends HistorianController {

    protected onQueryReceived(event: QueryEvent) {
        NodeUtils.logEvent(`Snapshot query received for parentObjectId`, "QUERY", "In");
    }

    protected onQueryRetrieved(event: QueryEvent, snapshots: Snapshot[]) {
        NodeUtils.logEvent(`${snapshots.length} snapshots retrieved for parentObjectId`, "RETRIEVE", "Out");
    }
}
