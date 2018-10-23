/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import * as newuuidv4 from "uuid/v4";

import { Uuid } from "../model/object";

import { CommonOptions, DatabaseOptions } from "./configuration";

/**
 * Provides access to runtime data of a Coaty container, including
 * shared configuration options, as well as platform and framework meta
 * information.
 */
export class Runtime {

    /**
     * Gets common options specified in container configuration.
     */
    get options() {
        return this._commonOptions;
    }

    /**
     * Gets database options specified in container configuration.
     */
    get databaseOptions() {
        return this._databaseOptions;
    }

    /**
     * Determines whether runtime supports CommonJS (such as Node.js).
     */
    get isCommonJsPlatform(): boolean {
        return typeof module !== "undefined" && module.exports &&
            typeof require === "function";
    }

    /**
     * Determines whether runtime is a web browser (excluding web worker).
     */
    get isWebPlatform(): boolean {
        return new Function("try {return this===window;}catch(e){return false;}")();
    }

    /**
     * Determines whether code is running inside a web worker.
     */
    get isWebWorkerPlatform(): boolean {
        return new Function("try {return self instanceof WorkerGlobalScope;}catch(e){return false;}")();
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
    private static FRAMEWORK_PACKAGE_NAME = "coaty";
    private static FRAMEWORK_PACKAGE_VERSION = "1.2.0";
    private static FRAMEWORK_BUILD_DATE = 1540307953319;
    /*********************************************************
	 * END OF AUTO GENERATED CODE 
	 */

    private _commonOptions: CommonOptions;
    private _databaseOptions: DatabaseOptions;

    constructor(commonOptions: CommonOptions, databaseOptions: DatabaseOptions) {
        this._commonOptions = commonOptions;
        this._databaseOptions = databaseOptions;
    }

    /**
     * Returns a newly generated UUID v4.
     */
    static newUuid() {
        return newuuidv4();
    }

    /**
     * Returns a newly generated UUID v4.
     */
    newUuid(): Uuid {
        return newuuidv4();
    }
}
