/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe to truncate a string at a given length
 */
@Pipe({
    name: 'truncate'
})
export class TruncatePipe implements PipeTransform {
    transform(value: string, args: string[]): string {
        const limit = args.length > 0 ? parseInt(args[0], 10) : 10;
        return value.length > limit ? value.substring(0, limit) : value;
    }
}
