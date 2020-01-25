/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { Subscription } from "rxjs";
import { filter } from "rxjs/operators";

import { AssociateEvent, Controller, Device, DiscoverEvent, IoActor, IoSource, User, Uuid } from "..";

/**
 * Base IO router class for context-driven routing of IO values 
 * from IO sources to IO actors.
 *
 * To implement context-specific routing strategies extend this class and
 * implement the abstract protected methods.
 *
 *  This base router class supports the following controller options:
 * - `externalDevices`: an array of `Device` object definitions for external
 *    IO sources or actors with external topics.
 */
export abstract class IoRouter extends Controller {

    private _associatedUser: User;
    private _associatedDevices: Map<Uuid, Device>;
    private _sourceTopics: Map<Uuid, string>;

    private _discoverSubscription: Subscription;
    private _advertisedSubscription: Subscription;
    private _deadvertisedSubscription: Subscription;

    onInit() {
        super.onInit();
        this._init(undefined);
    }

    onCommunicationManagerStarting() {
        super.onCommunicationManagerStarting();

        // Starts this IO router. The router now listens for device
        // Advertise/Deadvertise events and issues an initial Discover event
        // for user associated devices. After starting the `onStarted` method
        // is invoked.
        this._init(this.runtime.commonOptions?.associatedUser);
        this.onStarted();
    }

    onCommunicationManagerStopping() {
        super.onCommunicationManagerStopping();

        // Stops this IO router. Subclasses should disassociate all current 
        // associations in the `onStopped` method.
        this.onStopped();
        this._init(undefined);
    }

    /**
     * Gets the user associated with this IoRouter.
     */
    getAssociatedUser() {
        return this._associatedUser;
    }

    /**
     * Gets the devices with IO capabilities currently associated with this IoRouter.
     */
    getAssociatedDevices() {
        return this._associatedDevices;
    }

    /**
     * Finds an associated device that matches the given predicate.
     *
     * Returns undefined if no such device exists.
     *
     * @param predicate a function returning true if a device matches; false
     * otherwise.
     */
    findAssociatedDevice(predicate: (device: Device) => boolean) {
        let foundDevice: Device;
        this._associatedDevices.forEach(device => {
            if (!foundDevice && predicate(device)) {
                foundDevice = device;
            }
        });
        return foundDevice;
    }

    /**
     * Called by the IO router base implementation when a device with
     * IO capabilities has been (re)advertised.
     *
     * To be implemented by concrete subclasses.
     */
    protected abstract onDeviceAdvertised(device: Device);

    /**
     * Called by the IO router base implementation when associated
     * devices with IO capabilities have been deadvertised.
     *
     * To be implemented by concrete subclasses.
     */
    protected abstract onDevicesDeadvertised(devices: Device[]);

    /**
     * Associates the given IO source and actor by publishing an Associate
     * event.
     *
     * @param source an IO source object
     * @param actor an IO actor object
     * @param updateRate the recommended update rate (in milliseconds) or undefined for publishing IoValue events
     */
    protected associate(source: IoSource, actor: IoActor, updateRate: number) {
        // Ensure that an IO source publishes IO values to all associated
        // IO actors on a unique and single topic
        let topic = this._sourceTopics.get(source.objectId);
        if (!topic) {
            topic = source.externalTopic || this.communicationManager.createIoValueTopic(source);
            this._sourceTopics.set(source.objectId, topic);
        }
        this.communicationManager.publishAssociate(
            AssociateEvent.with(source, actor, topic, updateRate));
    }

    /**
     * Disassociates the given IO source and actor by publishing an Associate
     * event with an undefined topic.
     *
     * @param source an IO source object
     * @param actor an IO actor object
     */
    protected disassociate(source: IoSource, actor: IoActor) {
        this.communicationManager.publishAssociate(
            AssociateEvent.with(source, actor, undefined));
    }

    /**
     * Checks whether the value types of the given IO source and actor
     * match. This is a precondition for associating IO source and actor.
     *
     * The base implementation returns true, if the given source value type
     * is identical to the given actor value type.
     *
     * Override the base implementation if you need a custom value type
     * compatibility check.
     *
     * @param source an IO source object
     * @param actor an IO actor object
     */
    protected areValueTypesCompatible(source: IoSource, actor: IoActor): boolean {
        return source.valueType === actor.valueType;
    }

    /**
     * Override this method to perform side effects when the IO router is
     * started. The default method does nothing.
     */
    protected onStarted() {
        /* tslint:disable:empty-block */
        /* tslint:enable:empty-block */
    }

    /**
     * Override this method to perform side effects when the IO router is
     * stopped. The default method does nothing.
     */
    protected onStopped() {
        /* tslint:disable:empty-block */
        /* tslint:enable:empty-block */
    }

    private _init(user: User) {
        this._associatedUser = user;
        this._associatedDevices = new Map<Uuid, Device>();
        this._sourceTopics = new Map<Uuid, string>();

        if (!user) {
            this._advertisedSubscription?.unsubscribe();
            this._deadvertisedSubscription?.unsubscribe();
            this._discoverSubscription?.unsubscribe();
            return;
        }

        // Initially preconfigured external devices with
        // IO sources and IO actors for external topics
        const externalDevices = this.options["externalDevices"] as Device[];
        externalDevices?.forEach(device => this._associatedDevices.set(device.objectId, device));

        this._advertisedSubscription = this._watchForDeviceAdvertised();
        this._deadvertisedSubscription = this._watchForDeviceDeadvertised();
        this._discoverSubscription = this._discoverDevices();
    }

    private _watchForDeviceAdvertised(): Subscription {
        return this.communicationManager
            .observeAdvertiseWithCoreType("Device")
            .pipe(filter(event => event.eventUserId === this._associatedUser.objectId))
            .subscribe(event => {
                this._deviceAdvertised(event.data.object as Device);
            });
    }

    private _watchForDeviceDeadvertised(): Subscription {
        return this.communicationManager
            .observeDeadvertise()
            .pipe(filter(event => event.eventUserId === this._associatedUser.objectId))
            .subscribe(event => {
                this._devicesDeadvertised(event.data.objectIds);
            });
    }

    private _deviceAdvertised(device: Device) {
        const isDeadvertise = device.ioCapabilities === undefined ||
            device.ioCapabilities.length === 0;

        this._devicesDeadvertised([device.objectId], isDeadvertise ? undefined : device);
        if (isDeadvertise) {
            return;
        }
        this._associatedDevices.set(device.objectId, device);
        this.onDeviceAdvertised(device);
    }

    private _devicesDeadvertised(objectIds: Uuid[], readvertisedDevice?: Device) {
        const deregisteredDevices: Device[] = [];

        objectIds.forEach(id => {
            const deregisteredDevice = this._associatedDevices.get(id);
            if (deregisteredDevice) {
                this._associatedDevices.delete(id);
                deregisteredDevice.ioCapabilities.forEach(point => {
                    if (point.coreType === "IoSource") {
                        // Ensure source topics are preserved for IO sources that
                        // also exist in a rediscovered or readvertised device.
                        if (!readvertisedDevice ||
                            !readvertisedDevice.ioCapabilities.some(p => p.coreType === "IoSource" && p.objectId === point.objectId)) {
                            this._sourceTopics.delete(point.objectId);
                        }
                    }
                });
                if (!readvertisedDevice) {
                    deregisteredDevices.push(deregisteredDevice);
                }
            }
        });

        if (deregisteredDevices.length > 0) {
            this.onDevicesDeadvertised(deregisteredDevices);
        }
    }

    private _discoverDevices(): Subscription {
        return this.communicationManager.publishDiscover(
            DiscoverEvent.withCoreTypes(["Device"]))
            .pipe(filter(event =>
                event.eventUserId === this._associatedUser.objectId &&
                event.data.object !== undefined))
            .subscribe(event => {
                this._deviceAdvertised(event.data.object as Device);
            });
    }
}
