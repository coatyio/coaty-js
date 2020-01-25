/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { take, timeout } from "rxjs/operators";

import { AdvertiseEventData, Snapshot, Uuid } from "../..";
import { HistorianController } from "../../db";

export interface AdvertiseEventLogger {
    count: number;
    eventData: AdvertiseEventData[];
}

export class MockSnapshotController extends HistorianController {

    watchForAdvertiseEvents(logger: AdvertiseEventLogger) {
        this.communicationManager
            .observeAdvertiseWithCoreType("Snapshot")
            .subscribe(event => {
                logger.count++;
                logger.eventData.push(event.data);
            });
    }

    querySnapshots(parentObjectId: Uuid): Promise<Snapshot[]> {
        return this.querySnapshotsByParentId(parentObjectId)
            // Unsubscribe automatically after first response event arrives.
            .pipe(
                take(1),
                // Issue an Rx.TimeoutError if queryTimeoutMillis elapses without any emitted event.
                timeout(this.options["queryTimeoutMillis"]),
            )
            .toPromise();
    }

}
