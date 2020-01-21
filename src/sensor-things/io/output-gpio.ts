/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { SensorIo } from "..";

/**
 * Handles IO communication for a digital pin. Only allows write.
 * 
 * The pin should be given in the parameters in the field 'pin'.
 * 
 * Note: this class requires the `mraa` npm library to be installed on the
 * board.
 */
export class OutputGpio extends SensorIo {
    private _gpio: any;

    constructor(parameters?: any) {
        super(parameters);
        if (parameters === undefined || typeof parameters.pin !== "number") {
            throw new ReferenceError("pin is not valid.");
        }

        try {
            const mraa = require("mraa");
            this._gpio = new mraa.Gpio(parameters.pin);
            this._gpio.dir(mraa.DIR_OUT);
        } catch (e) {
            console.error("Sensor initialization failed: " + e.message);
        }
    }

    /**
     * Unsupported operation, throws an error.
     */
    read(callback: (value: any) => void) {
        throw new Error("Cannot read from an output pin.");
    }

    /**
     * Writes on the digital pin. This function will throw an error
     * if the written value is not 0 or 1.
     */
    write(value: any) {
        if (typeof value === "number" && (value === 0 || value === 1)) {
            this._gpio.write(value);
        } else {
            throw new TypeError("Can only write 0 or 1 on a digital pin.");
        }
    }
}
