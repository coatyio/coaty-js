/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import {
    AdvertiseEvent,
    Container,
    ControllerOptions,
    CoreTypes,
    Log,
    LogHost,
    LogLevel,
    toLocalIsoString,
} from "..";
import { IDisposable } from "../runtime/disposable";

/**
 * Defines lifecycle methods for controllers.
 */
export interface IController extends IDisposable {

    /** 
     * Called when the container has completely set up and injected all
     * dependency components, including all its controllers.
     */
    onInit();

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
 * in a Coaty container.
 */
export type IControllerStatic<T extends IController> =
    new (container: Container, options: ControllerOptions, controllerName: string) => T;

/**
 * The base controller class. 
 */
export abstract class Controller implements IController {

    /**
     * @internal For internal use in framework only.
     *
     * Never instantiate Controller objects in your application, they are
     * created automatically by dependency injection.
     */
    constructor(
        private _container: Container,
        private _options: ControllerOptions,
        private _controllerName: string) {
    }

    /**
     * Gets the container object of this controller.
     */
    get container() {
        return this._container;
    }

    /**
     * Gets the container's Runtime object.
     */
    get runtime() {
        return this._container.runtime;
    }

    /**
     * Gets the controller's options as specified in the configuration options.
     */
    get options(): Readonly<ControllerOptions> {
        return this._options;
    }

    /**
     * Gets the container's communication manager.
     */
    get communicationManager() {
        return this.container.communicationManager;
    }

    /**
     * Gets the registered name of this controller. 
     *
     * The registered name is either defined by the corresponding key in the
     * `Components.controllers` object in the container configuration, or by
     * invoking `Container.registerController` method with this name.
     */
    get registeredName() {
        return this._controllerName;
    }

    /**
     * Advertise a Log object for debugging purposes.
     * 
     * @param message a debug message
     * @param tags any number of log tags
     */
    logDebug(message: string, ...tags: string[]) {
        this._log(LogLevel.Debug, message, tags);
    }

    /**
     * Advertise an informational Log object.
     * 
     * @param message an informational message
     * @param tags any number of log tags
     */
    logInfo(message: string, ...tags: string[]) {
        this._log(LogLevel.Info, message, tags);
    }

    /**
     * Advertise a Log object for a warning.
     * 
     * @param message a warning message
     * @param tags any number of log tags
     */
    logWarning(message: string, ...tags: string[]) {
        this._log(LogLevel.Warning, message, tags);
    }

    /**
     * Advertise a Log object for an error.
     * 
     * @param error an error (object)
     * @param message additional error message
     * @param tags any number of log tags
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
     * @param tags any number of log tags
     */
    logErrorWithStacktrace(error: any, message: string, ...tags: string[]) {
        const msg = `${message}: ${(error && typeof error === "object" && error.stack) ? error.stack : error}`;
        this._log(LogLevel.Error, msg, tags);
    }

    /**
     * Advertise a Log object for a fatal error.
     * 
     * @param error an error (object)
     * @param message additional error message
     * @param tags any number of log tags
     */
    logFatal(error: any, message: string, ...tags: string[]) {
        let msg = `${message}: ${error}`;
        if (error && typeof error === "object" && error.stack) {
            msg += `\n{{error.stack}}`;
        }
        this._log(LogLevel.Fatal, msg, tags);
    }

    /** 
     * Called when the container has completely set up and injected all
     * dependency components, including all its controllers.
     *
     * Override this method to perform initializations in your custom controller
     * class instead of defining a constructor. Although the base implementation
     * does nothing it is good practice to call `super.onInit()` in your
     * override method; especially if your custom controller class does not
     * extend from the base `Controller` class directly.
     */
    onInit() {
        /* tslint:disable:no-empty */
        /* tslint:enable:no-empty */
    }

    /**
     * Called when the communication manager is about to start or restart.
     *
     * Override this method to implement side effects here. Ensure that
     * `super.onCommunicationManagerStarting` is called in your override. The
     * base implementation does nothing.
     */
    onCommunicationManagerStarting() {
        /* tslint:disable:no-empty */
        /* tslint:enable:no-empty */
    }

    /**
     * Called when the communication manager is about to stop.
     *
     * Override this method to implement side effects here. Ensure that
     * `super.onCommunicationManagerStopping` is called in your override. The
     * base implementation does nothing.
     */
    onCommunicationManagerStopping() {
        /* tslint:disable:no-empty */
        /* tslint:enable:no-empty */
    }

    /**
     * Called by the container when this instance should be disposed.
     *
     * Implement cleanup side effects here. Ensure that `super.onDispose` is
     * called in your override. The base implementation does nothing.
     */
    onDispose(): void {
        /* tslint:disable:no-empty */
        /* tslint:enable:no-empty */
    }

    /**
     * Whenever one of the controller's log methods (e.g. `logDebug`, `logInfo`,
     * `logWarning`, `logError`, `logFatal`) is called by application code, the
     * controller creates a Log object with appropriate property values and
     * passes it to this method before advertising it.
     *
     * You can override this method to additionally set certain properties (such
     * as `LogHost.hostname` or `Log.logLabels`). Ensure that
     * `super.extendLogObject` is called in your override. The base method does
     * nothing.
     *
     * @param log log object to be extended before being advertised
     */
    protected extendLogObject(log: Log) {
        /* tslint:disable:empty-block */
        /* tslint:enable:empty-block */
    }

    private _log(logLevel: LogLevel, message: string, tags: string[]) {
        const agentInfo = this.runtime.commonOptions?.agentInfo;
        let hostInfo: LogHost;
        let pid;
        let userAgent;
        if (this.runtime.isCommonJsPlatform) {
            pid = process ? process.pid : undefined;
        }
        if (this.runtime.isWebPlatform) {
            userAgent = navigator ? navigator.userAgent : undefined;
        }
        hostInfo = { agentInfo, pid, userAgent };

        const log: Log = {
            objectId: this.runtime.newUuid(),
            objectType: CoreTypes.OBJECT_TYPE_LOG,
            coreType: "Log",
            name: `${this._controllerName}`,
            logLevel: logLevel,
            logMessage: message,
            logDate: toLocalIsoString(new Date(), true),
            logTags: tags,
            logHost: hostInfo,
        };

        this.extendLogObject(log);

        this.communicationManager.publishAdvertise(AdvertiseEvent.withObject(log));
    }

}
