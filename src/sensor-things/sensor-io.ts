/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

/**
 * Base interface for a sensor hardware-level IO control.
 * Provides the basic read and write functionality according to
 * the given parameters.
 */
export interface ISensorIo {
    parameters?: any;

    read(callback: (value: any) => void);

    write(value: any);
}

/**
 * Defines static constructor signature for sensor IO interfaces. To be 
 * used for constructor dependency injection in the sensor controller. 
 */
export type ISensorIoStatic<T extends ISensorIo> = new(parameters?: number) => T;

/**
 * The base class for sensor hardware-level IO control. Some IO
 * classes are already defined:
 * - Aio: Handles IO for an analog pin using MRAA (input only).
 * - InputGpio: Handles IO for a digital pin using MRAA (input only).
 * - OuputGpio: Handles IO for a digital pin using MRAA (output only).
 * - MockSensorIo: Mocks the functionality with a cached value.
 * 
 * Applications can also define their own SensorIo classes.
 */
export abstract class SensorIo implements ISensorIo {
    constructor(private _parameters?: number) {
    }

    get parameters(): number {
        return this._parameters;
    }

    abstract read(callback: (value: any) => void);
    abstract write(value: any);
}

/**
 * Mocks the IO communication of an actual sensor hardware. Stores
 * a cached value for the pin and simply updates it with the 'write'
 * calls. The value is 0 at the beginning.
 */
export class MockSensorIo extends SensorIo {
    private _value: any = 0;

    /**
     * Returns the internally cached value.
     */
    read(callback: (value: any) => void) {
        callback(this._value);
    }

    /**
     * Writes on the internally cached value.
     */
    write(value: any) {
        this._value = value;
    }
}
