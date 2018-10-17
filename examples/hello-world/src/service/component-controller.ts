/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { Subscription } from "rxjs";

import { Controller } from "coaty/controller";
import { Component, Uuid } from "coaty/model";

import { LogTags } from "../shared/log-tags";

/**
 * Observes the lifecycle of Hello World components by listening to
 * Advertise and Deadvertise events on Component objects and advertising 
 * a log object for each of them in return.
 */
export class ComponentController extends Controller {

    private _registeredComponents: Map<Uuid, Component>;
    private _advertiseSubscription: Subscription;
    private _deadvertiseSubscription: Subscription;

    onInit() {
        super.onInit();
        this._registeredComponents = new Map();
    }

    onCommunicationManagerStarting() {
        super.onCommunicationManagerStarting();
        this._advertiseSubscription = this._observeAdvertiseComponent();
        this._deadvertiseSubscription = this._observeDeadvertiseComponents();
    }

    onCommunicationManagerStopping() {
        super.onCommunicationManagerStopping();
        this._advertiseSubscription && this._advertiseSubscription.unsubscribe();
        this._deadvertiseSubscription && this._deadvertiseSubscription.unsubscribe();
    }

    private _observeAdvertiseComponent() {
        return this.communicationManager
            .observeAdvertiseWithCoreType(this.identity, "Component")
            .subscribe(event => {
                const comp = event.eventData.object as Component;
                this._registeredComponents.set(comp.objectId, comp);
                // Alternatively, the user ID can be read from the event using event.eventUserId
                const compId = comp.assigneeUserId ? `Client User ID ${comp.assigneeUserId}` : `ID ${comp.objectId}`;
                const parentId = comp.parentObjectId ? `, PARENT ID ${comp.parentObjectId}` : "";
                this.logInfo(`Component registered: ${comp.name}, ${compId}${parentId}`, LogTags.LOG_TAG_SERVICE);
            });
    }

    private _observeDeadvertiseComponents() {
        return this.communicationManager
            .observeDeadvertise(this.identity)
            .subscribe(event => {
                event.eventData.objectIds.forEach(id => {
                    const comp = this._registeredComponents.get(id);
                    if (comp) {
                        this._registeredComponents.delete(id);
                        const compId = comp.assigneeUserId ? `Client User ID ${comp.assigneeUserId}` : `ID ${comp.objectId}`;
                        const parentId = comp.parentObjectId ? `, PARENT ID ${comp.parentObjectId}` : "";
                        this.logInfo(`Component deregistered: ${comp.name}, ${compId}${parentId}`, LogTags.LOG_TAG_SERVICE);
                    }
                });
            });
    }
}
