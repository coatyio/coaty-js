/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { IoActor, IoSource } from "./io-point";
import { CoatyObject } from "./object";

/**
 * Defines display types for Coaty interaction devices.
 */
export enum DisplayType {

    /** 
     * A headless device representing a field device or a 
     * backend/service component 
     */
    None,

    /**
     * A smart watches
     */
    Watch,

    /**
     * An arm wearable
     */
    Arm,

    /**
     * A tablet
     */
    Tablet,

    /**
     * A monitor
     */
    Monitor,
}

/**
 * Represents an interaction device associated with a Coaty user.
 */
export interface Device extends CoatyObject {

    coreType: "Device";

    /**
     * The IO source and actors associated with this system component.
     */
    ioCapabilities?: Array<IoSource | IoActor>;

    /** 
     * Display type of the interaction device.
     */
    displayType: DisplayType;
}
