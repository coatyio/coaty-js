/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { Observable } from "rxjs";
import { map } from "rxjs/operators";

import { CommunicationState } from "../com/communication-manager";
import { Controller } from "./controller";

/**
 * A convenience controller that monitors the connection state (online or offline)
 * of the associated communication manager.
 */
export class ConnectionStateController extends Controller {

    /**
     * Gets a boolean observable that emits `true` if the 
     * connection state of the associated communication manager
     * transitions to offline, and `false` if it transitions to
     * online. When subscribed, the current connection state is 
     * emitted immediately.
     */
    get isOffline(): Observable<boolean> {
        return this.communicationManager
            .observeCommunicationState()
            .pipe(map(state => state === CommunicationState.Offline));
    }
}
