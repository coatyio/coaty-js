/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { v4 as uuidv4 } from "uuid";

import { Uuid } from "..";

import { CommonOptions, DatabaseOptions } from "./configuration";

/**
 * Provides access to runtime data of a Coaty container, including common
 * configuration options, as well as platform and framework meta information.
 */
export class Runtime {

    /**
     * Gets common options specified in container configuration (optional).
     */
    get commonOptions(): Readonly<CommonOptions> {
        return this._commonOptions;
    }

    /**
     * Gets database options specified in container configuration (optional).
     */
    get databaseOptions(): Readonly<DatabaseOptions> {
        return this._databaseOptions;
    }

    /**
     * Determines whether container is running on a CommonJS platform (such as
     * Node.js).
     */
    get isCommonJsPlatform(): boolean {
        return this._isCommonJsPlatform;
    }

    /**
     * Determines whether container is running in a web browser (excluding web
     * worker).
     */
    get isWebPlatform(): boolean {
        return this._isWebPlatform;
    }

    /**
     * Determines whether container is running inside a web worker.
     */
    get isWebWorkerPlatform(): boolean {
        return this._isWebWorkerPlatform;
    }

    /**
     * Gets the framework's package name.
     */
    get frameworkName() {
        return Runtime.FRAMEWORK_PACKAGE_NAME;
    }

    /**
     * Gets the framework package version.
     */
    get frameworkVersion() {
        return Runtime.FRAMEWORK_PACKAGE_VERSION;
    }

    /**
     * Gets the framework's build date.
     */
    get frameworkBuildDate(): Date {
        return new Date(Runtime.FRAMEWORK_BUILD_DATE);
    }

    /*********************************************************
	 * AUTO GENERATED - DO NOT EDIT THE FOLLOWING DEFINITIONS!
     * PROPER VALUES ARE INJECTED WHEN BUILDING THE FRAMEWORK.
	 */
    private static FRAMEWORK_PACKAGE_NAME = "@coaty/core";
    private static FRAMEWORK_PACKAGE_VERSION = "2.1.0";
    private static FRAMEWORK_BUILD_DATE = 1590751857850;
    /*********************************************************
	 * END OF AUTO GENERATED CODE 
	 */

    private _isCommonJsPlatform: boolean;
    private _isWebPlatform: boolean;
    private _isWebWorkerPlatform: boolean;

    /** @internal - For internal use in framework only. */
    constructor(
        private _commonOptions: CommonOptions,
        private _databaseOptions: DatabaseOptions) {
        this._isCommonJsPlatform = typeof module !== "undefined" && module.exports && typeof require === "function";
        this._isWebPlatform = new Function("try {return this===window;}catch(e){return false;}")();
        this._isWebWorkerPlatform = new Function("try {return self instanceof WorkerGlobalScope;}catch(e){return false;}")();
    }

    /**
     * Returns a newly generated UUID v4.
     */
    static newUuid() {
        return uuidv4();
    }

    /**
     * Returns a newly generated UUID v4.
     */
    newUuid(): Uuid {
        return uuidv4();
    }
}
