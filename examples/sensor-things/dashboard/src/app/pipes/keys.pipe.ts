/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { Pipe, PipeTransform } from "@angular/core";

/**
 * Returns the keys of an array
 */
@Pipe({ name: "keys" })
export class KeysPipe implements PipeTransform {
    transform(value): any {
        if (!value) { return null; }
        return Object.keys(value);
    }

}
