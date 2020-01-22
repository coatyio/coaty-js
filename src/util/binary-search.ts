/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

/**
 * Searches the entire sorted `Array<T>` for an element using the specified
 * compare function and returns the zero-based index of the element.
 *
 * Returns the zero-based index of item in the sorted `Array<T>`, if item is
 * found; otherwise, a negative number that is the bitwise complement of the
 * index of the next element that is larger than item or, if there is no larger
 * element, the bitwise complement of the array length.
 *
 * The `Array<T>` must already be sorted according to the compare function
 * implementation; otherwise, the result is incorrect.
 *
 * The compare function returns a value indicating whether the first argument is
 * less than (return value < 0), equal to (return value === 0), or greater than
 * (return value > 0) the second argument. The first argument is an item from
 * the source array, the second argument is always the given value.
 *
 * If the `Array<T>` contains more than one element with the same value, the
 * function returns only one of the occurrences, and it might return any one of
 * the occurrences, not necessarily the first one.
 *
 * @param source The sorted source array
 * @param value The value to locate.
 * @param compareFn The function to use when comparing elements.
 * @param startIndex The zero-based starting index of the range to search
 * (optional).
 * @param endIndex The zero-based ending index (inclusive) of the range to
 * search (optional).
 */
export function binarySearch<T>(
    source: T[],
    value: T,
    compareFn: (a: T, b: T) => number,
    startIndex: number = 0,
    endIndex: number = source.length - 1): number {
    if (startIndex < 0) {
        throw new TypeError("startIndex is out of range");
    }
    if (endIndex >= source.length) {
        throw new TypeError("endIndex is out of range");
    }

    const length = endIndex + 1 - startIndex;
    let low = startIndex;
    let high = (startIndex + length) - 1;
    while (low <= high) {
        /* tslint:disable-next-line:no-bitwise */
        const i = low + ((high - low) >>> 1);
        const cp = compareFn(source[i], value);
        if (cp === 0) {
            return i;
        }
        if (cp < 0) {
            low = i + 1;
        } else {
            high = i - 1;
        }
    }
    /* tslint:disable-next-line:no-bitwise */
    return ~low;
}

/**
 * Inserts the item into the sorted `Array<T>` using the given compare function
 * on the item.
 *
 * The `Array<T>` must already be sorted according to the compare function
 * implementation; otherwise, the result is incorrect.
 *
 * The compare function returns a value indicating whether the first argument is
 * less than (return value < 0), equal to (return value === 0), or greater than
 * (return value > 0) the second argument. The first argument is an item from
 * the source array, the second argument is always the given item.
 *
 * @param source The sorted source array
 * @param item The value to insert.
 * @param compareFn The function to use when comparing elements.
 */
export function binaryInsert<T>(
    source: T[],
    item: T,
    compareFn: (a: T, b: T) => number) {
    const pos = binarySearch(source, item, compareFn);
    if (pos >= 0) {
        // binarySearch might return any position for identical items, 
        // not necessarily the first one...
        source.splice(pos, 0, item);
    } else {
        /* tslint:disable-next-line:no-bitwise */
        source.splice(~pos, 0, item);
    }
}
