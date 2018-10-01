/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { SensorIo } from "../sensor-io";

/**
 * Handles IO communication for a digital pin. Only allows read.
 * 
 * The pin should be given in the parameters in the field 'pin'.
 * 
 * Note: this class requires the `mraa` npm library to be installed on the
 * board.
 */
export class InputGpio extends SensorIo {
    private _gpio: any;

    constructor(parameters?: any) {
        super(parameters);
        if (parameters === undefined || typeof parameters.pin !== "number") {
            throw new ReferenceError("pin is not valid.");
        }

        try {
            const mraa = require("mraa");
            this._gpio = new mraa.Gpio(parameters.pin);
            this._gpio.dir(mraa.DIR_IN);
        } catch (e) {
            console.error("Sensor initialization failed: " + e.message);
        }
    }

    /**
     * Returns the value of the digital pin.
     */
    read(callback: (value: any) => void) {
        callback(this._gpio.read());
    }

    /**
     * Unsupported operation, throws an error.
     */
    write(value: any) {
        throw new Error("Cannot write on an input pin.");
    }
}
