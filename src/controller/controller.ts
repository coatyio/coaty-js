/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { AdvertiseEvent } from "../com/communication-events";
import { CommunicationManager } from "../com/communication-manager";
import { Log, LogHost, LogLevel } from "../model/log";
import { Component } from "../model/object";
import { CoreTypes } from "../model/types";
import { IComponent } from "../runtime/component";
import { ControllerOptions } from "../runtime/configuration";
import { Container } from "../runtime/container";
import { Runtime } from "../runtime/runtime";
import { toLocalIsoString } from "../util/date";

/**
 * Defines common members for all controller types.
 */
export interface IController extends IComponent {

    /**
     * Controller options
     */
    options: ControllerOptions;

    /**
     * The communication manager associated with this component.
     */
    communicationManager: CommunicationManager;

    /** 
     * Called when the controller instance is being instantiated.
     */
    onInit();

    /**
     * Called after all container components have been resolved.
     */
    onContainerResolved(container: Container);

    /**
     * Called when the Communication Manager is about to start.
     */
    onCommunicationManagerStarting();

    /**
     * Called when the Communication Manager is about to stop.
     */
    onCommunicationManagerStopping();

}

/**
 * Defines static constructor signature for controllers that implement the
 * IController interface. To be used for constructor dependency injection
 * in the Coaty container.
 */
export interface IControllerStatic<T extends IController> {
    new(runtime: Runtime, options: ControllerOptions, communicationManager: CommunicationManager, controllerType: string): T;
}

/**
 * The base controller class for object controllers and IO controllers. 
 */
export abstract class Controller implements IController {

    private _runtime: Runtime;
    private _options: ControllerOptions;
    private _controllerType: string;
    private _identity: Component;
    private _communicationManager: CommunicationManager;
    private _isCommonJsPlatform: boolean;
    private _isWebPlatform: boolean;

    constructor(
        runtime: Runtime,
        options: ControllerOptions,
        communicationManager: CommunicationManager,
        controllerType: string) {

        this._runtime = runtime;
        this._options = options;
        this._communicationManager = communicationManager;
        this._controllerType = controllerType;
        this._isCommonJsPlatform = runtime.isCommonJsPlatform;
        this._isWebPlatform = runtime.isWebPlatform;
    }

    get runtime() {
        return this._runtime;
    }

    get options() {
        return this._options;
    }

    get identity() {
        if (!this._identity) {
            this._identity = this._createDefaultIdentity();
        }
        return this._identity;
    }

    get communicationManager() {
        return this._communicationManager;
    }

    /**
     * Advertise a Log object for debugging purposes.
     * 
     * @param message a debug message
     * @param tags an array of log tags
     */
    logDebug(message: string, ...tags: string[]) {
        this._log(LogLevel.Debug, message, tags);
    }

    /**
     * Advertise an informational Log object.
     * 
     * @param message an informational message
     * @param tags an array of log tags
     */
    logInfo(message: string, ...tags: string[]) {
        this._log(LogLevel.Info, message, tags);
    }

    /**
     * Advertise a Log object for a warning.
     * 
     * @param message a warning message
     * @param tags an array of log tags
     */
    logWarning(message: string, ...tags: string[]) {
        this._log(LogLevel.Warning, message, tags);
    }

    /**
     * Advertise a Log object for an error.
     * 
     * @param error an error (object)
     * @param message additional error message
     * @param tags an array of log tags
     */
    logError(error: any, message: string, ...tags: string[]) {
        const msg = `${message}: ${error}`;
        this._log(LogLevel.Error, msg, tags);
    }

    /**
     * Advertise a Log object for an error with stacktrace information.
     * 
     * @param error an error (object)
     * @param message additional error message
     * @param tags an array of log tags
     */
    logErrorWithStacktrace(error: any, message: string, ...tags: string[]) {
        /* tslint:disable-next-line:max-line-length */
        const msg = `${message}: ${(error && typeof error === "object" && error.stack) ? error.stack : error}`;
        this._log(LogLevel.Error, msg, tags);
    }

    /**
     * Advertise a Log object for a fatal error.
     * 
     * @param error an error (object)
     * @param message additional error message
     * @param tags an array of log tags
     */
    logFatal(error: any, message: string, ...tags: string[]) {
        let msg = `${message}: ${error}`;
        if (error && typeof error === "object" && error.stack) {
            msg += `\n{{error.stack}}`;
        }
        this._log(LogLevel.Fatal, msg, tags);
    }

    /** 
     * Called when the controller instance has been instantiated.
     * This method is called immediately after the base controller 
     * constructor. The base implementation does nothing.
     * 
     * Use this method to perform initializations in your custom 
     * controller class instead of defining a constructor.
     * The method is called immediately after the controller instance
     * has been created. Although the base implementation does nothing it is good
     * practice to call super.onInit() in your override method; especially if your
     * custom controller class extends from another custom controller class 
     * and not from the base `Controller` class directly.
     */
    onInit() {
        /* tslint:disable:no-empty */
        /* tslint:enable:no-empty */
    }

    /**
     * Called by the Coaty container after it has resolved and created all
     * controller instances within the container. Implement initialization side
     * effects here. The base implementation does nothing.
     * @param container the Coaty container of this controller
     */
    onContainerResolved(container: Container) {
        /* tslint:disable:no-empty */
        /* tslint:enable:no-empty */
    }

    /**
     * Called when the communication manager is about to start or restart.
     * Implement side effects here. Ensure that super.onCommunicationManagerStarting
     * is called in your override. The base implementation advertises
     * its identity if requested by the controller option property `shouldAdvertiseIdentity`
     * (if this property is not specified, the identity is advertised by default).
     */
    onCommunicationManagerStarting() {
        if (this.options.shouldAdvertiseIdentity === undefined ||
            this.options.shouldAdvertiseIdentity === true) {
            this._advertiseIdentity();
        }
    }

    /**
     * Called when the communication manager is about to stop.
     * Implement side effects here. Ensure that
     * super.onCommunicationManagerStopping is called in your override.
     * The base implementation does nothing.
     */
    onCommunicationManagerStopping() {
        /* tslint:disable:no-empty */
        /* tslint:enable:no-empty */
    }

    /**
     * Called by the Coaty container when this instance should be disposed.
     * Implement cleanup side effects here. The base implementation does nothing.
     */
    onDispose(): void {
        /* tslint:disable:no-empty */
        /* tslint:enable:no-empty */
    }

    /**
     * Initialize identity object properties for a concrete controller subclass
     * based on the specified default identity object.
     *
     * Do not call this method in your application code, it is called by the
     * framework. To retrieve the identity of a controller use
     * its `identity` getter.
     *
     * You can overwrite this method to initalize the identity with a custom name
     * or additional application-specific properties. Alternatively, you can 
     * set or add custom property-value pairs by specifying them in the `identity`
     * property of the controller configuration options `ControllerOptions`.
     * If you specify identity properties in both ways, the ones specified by this
     * method take precedence.
     *
     * @param identity the default identity object for a controller instance
     */
    protected initializeIdentity(identity: Component) {
        /* tslint:disable:empty-block */
        /* tslint:enable:empty-block */
    }

    /**
     * Whenever one of the controller's log methods (e.g. `logDebug`, `logInfo`,
     * `logWarning`, `logError`, `logFatal`) is called by application code,
     * the controller creates a Log object with appropriate property values and 
     * passes it to this method before advertising it. You can overwrite this method to 
     * additionally set certain properties (such as LogHost.hostname) or to
     * add custom property-value pairs to the Log object.
     * 
     * Do not call this method in your application code, it is called by the framework.
     * You do not need to invoke `super` in the overwritten method; the base methods
     * does nothing.
     * 
     * @param log log object to be extended before being advertised
     */
    protected extendLogObject(log: Log) {
        /* tslint:disable:empty-block */
        /* tslint:enable:empty-block */
    }

    private _advertiseIdentity() {
        this.communicationManager.publishAdvertise(AdvertiseEvent.withObject(this.identity, this.identity));
    }

    private _createDefaultIdentity(): Component {
        const identity: Component = {
            objectType: CoreTypes.OBJECT_TYPE_COMPONENT,
            coreType: "Component",
            objectId: this.runtime.newUuid(),
            parentObjectId: this.communicationManager.identity.objectId,
            name: this._controllerType,
        };
        Object.assign(identity, this.options.identity || {});
        this.initializeIdentity(identity);
        return identity;
    }

    private _log(logLevel: LogLevel, message: string, tags: string[]) {
        const agentInfo = this.runtime.options.agentInfo;
        if (agentInfo) {
            tags.splice(0, 0, agentInfo.packageInfo.name);
        }

        let hostInfo: LogHost;
        let pid;
        let userAgent;
        if (this._isCommonJsPlatform) {
            pid = process ? process.pid : undefined;
        }
        if (this._isWebPlatform) {
            userAgent = navigator ? navigator.userAgent : undefined;
        }
        hostInfo = { agentInfo, pid, userAgent };

        const log: Log = {
            objectId: this.runtime.newUuid(),
            parentObjectId: this.identity.objectId,
            objectType: CoreTypes.OBJECT_TYPE_LOG,
            coreType: "Log",
            name: `${this._controllerType}`,
            logLevel: logLevel,
            logMessage: message,
            logDate: toLocalIsoString(new Date(), true),
            logTags: tags,
            logHost: hostInfo,
        };

        this.extendLogObject(log);

        this.communicationManager.publishAdvertise(AdvertiseEvent.withObject(this.identity, log));
    }

}
