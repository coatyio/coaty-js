/*! Copyright (c) 2020 Siemens AG. Licensed under the MIT License. */

/**
 * Checks if `value` is a plain JavaScript object, that is, an object created by
 * an object literal, the `Object` constructor, or one with a prototype of
 * `null`, i.e. `Object.create(null)`.
 *
 * @param value the value to check.
 * @returns `true` if `value` is a plain object, else `false`
 */
export function isPlainObject(value) {
    if (value === null || typeof value !== "object") {
        return false;
    }
    const proto = Object.getPrototypeOf(value);
    return proto === null || proto === Object.prototype;
}
