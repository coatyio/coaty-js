/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe to floor a number
 */
@Pipe({ name: 'floor' })
export class FloorPipe implements PipeTransform {
    transform(input: number) {
        return Math.floor(input);
    }
}
