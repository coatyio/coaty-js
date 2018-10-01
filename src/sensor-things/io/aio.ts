/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { SensorIo } from "../sensor-io";

/**
 * Handles IO communication for an analog pin. Only allows a read.
 * 
 * The pin should be given in the parameters in the field 'pin'.
 * 
 * Note: this class requires the `mraa` npm library to be installed on the
 * board.
 */
export class Aio extends SensorIo {
    private _aio: any;

    constructor(parameters?: any) {
        super(parameters);
        if (parameters === undefined || typeof parameters.pin !== "number") {
            throw new ReferenceError("pin is not valid.");
        }

        try {
            const mraa = require("mraa");
            this._aio = new mraa.Aio(parameters.pin);
        } catch (e) {
            console.error("Sensor initialization failed: " + e.message);
        }
    }

    /**
     * Returns the value of the analog pin.
     */
    read(callback: (value: any) => void) {
        callback(this._aio.read());
    }

    /**
     * Unsupported operation, throws an error.
     */
    write(value: any) {
        throw new Error("Cannot write on an analog pin.");
    }
}
