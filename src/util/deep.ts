/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

/**
 * Determines whether two JavaScript values, typically objects or arrays, are structurally equal 
 * (aka. deep equal) according to a recursive equality algorithm.
 * 
 * Note that the strict equality operator `===` is used to compare leaf values. For checking the 
 * containment of properties in objects the `hasOwnProperty` operator is used, i.e. only properties
 * defined on the object directly (not inherited) are considered.
 * 
 * For example:
 * ```ts
 * import { equals } from "coaty/util";
 * 
 * equals({ a : [ 2, 3 ], b : [ 4 ] }, { a : [ 2, 3 ], b : [ 4 ] })) => true
 * equals({ x : 5, y : [6] }, { x : 5, y : 6 })) => false
 * ```
 * 
 * @param a a JavaScript value
 * @param b a JavaScript value
 */
export function equals(a: any, b: any): boolean {
    if (a === b) {
        return true;
    }

    const isArrA = Array.isArray(a);
    const isArrB = Array.isArray(b);

    if (isArrA && isArrB) {
        const al = a.length;
        if (al !== b.length) {
            return false;
        }
        for (let i = 0; i < al; i++) {
            if (!equals(a[i], b[i])) {
                return false;
            }
        }
        return true;
    }

    if (isArrA !== isArrB) {
        return false;
    }

    if (a && b && typeof a === "object" && typeof b === "object") {
        const keys = Object.keys(a);
        const keysLength = keys.length;
        if (keysLength !== Object.keys(b).length) {
            return false;
        }

        const isDateA = a instanceof Date;
        const isDateB = b instanceof Date;
        if (isDateA && isDateB) {
            return a.getTime() === b.getTime();
        }
        if (isDateA !== isDateB) {
            return false;
        }

        const isRegexpA = a instanceof RegExp;
        const isRegexpB = b instanceof RegExp;
        if (isRegexpA && isRegexpB) {
            return a.toString() === b.toString();
        }
        if (isRegexpA !== isRegexpB) {
            return false;
        }

        for (let i = 0; i < keysLength; i++) {
            if (!b.hasOwnProperty(keys[i])) {
                return false;
            }
        }
        for (let i = 0; i < keysLength; i++) {
            if (!equals(a[keys[i]], b[keys[i]])) {
                return false;
            }
        }

        return true;
    }

    return false;
}

/**
 * Checks if a JavaScript value (usually an object or array) contains
 * other values. Primitive value types (number, string, boolean, null,undefined) contain
 * only the identical value. Object properties match if all the key-value
 * pairs of the specified object are contained in them. Array properties
 * match if all the specified array elements are contained in them.
 *
 * The general principle is that the contained object must match the containing object
 * as to structure and data contents recursively on all levels, possibly after discarding
 * some non-matching array elements or object key/value pairs from the containing object.
 * But remember that the order of array elements is not significant when doing a containment match,
 * and duplicate array elements are effectively considered only once.
 * 
 * As a special exception to the general principle that the structures must match, an
 * array on *toplevel* may contain a primitive value:
 * ```ts
 * contains([1, 2, 3], [3]) => true
 * contains([1, 2, 3], 3) => true
 * ```
 *
 * Note that the strict equality operator `===` is used to compare primitive values. For checking the
 * containment of properties in objects the `hasOwnProperty` operator is used, i.e. only properties
 * defined on the object directly (not inherited) are considered.
 * 
 * For example:
 * ```ts
 * import { contains } from "coaty/util";
 * 
 * contains("foo" , "foo") => true
 *
 * contains([1, 2, 3] , []) => true
 * contains([1, 2, 3] , [3, 1]) => true
 * contains([1, 2, 3] , [3, 1, 3, 1]) => true
 * contains([1, 2, 3] , [3, 1, 5]) => false
 * contains([1, [2, 3, 4], 3] , [3, [3, 2]]) => true
 * contains([1, [2, 3, 4], 3] , [3, [3, 1]]) => false
 *
 * contains{( "foo": 1, "bar": 2 } , { "bar": 2 }) => true
 * contains({ "foo": 1, "bar": 2 } , { "bar": 2, "foo": 1 }) => true
 * contains({ "foo": 1, "bar": 2 } , { "bar": 2, "foo": 2 }) => false
 * contains({ "foo": { "bar": "baz" }}, { "foo": {} }) => true
 * contains({ "foo": { "bar": "baz" }}, { "bar": "baz" }) => false
 *
 * contains([1, { "foo": [{ "bar": [1, 2, 3] }, 2, 3] }], [{ "foo": [{ "bar": [3] }] }]) => true
 * ```
 *
 * @param a a JavaScript value containing another value
 * @param b a JavaScript value to be contained in another value
 */
export function contains(a: any, b: any): boolean {
    const containsInternal = (x: any, y: any, isToplevel: boolean) => {
        if (Array.isArray(x)) {
            if (!Array.isArray(y)) {
                // Special exception: check containment of a primitive array element on toplevel
                /* tslint:disable-next-line:no-null-keyword */
                if (isToplevel && (y === null || typeof y !== "object")) {
                    return x.some(xv => xv === y);
                }
                return false;
            }
            return y.every(yv => x.some(xv => containsInternal(xv, yv, false)));
        }

        if (x && typeof x === "object") {
            if (typeof y !== "object") {
                return false;
            }
            return Object.keys(y).every(yk => x.hasOwnProperty(yk) && containsInternal(x[yk], y[yk], false));
        }

        return x === y;
    };

    return containsInternal(a, b, true);
}

/**
 * 
 * Checks if a value is included on toplevel in the given
 * operand array of values which may be primitive types (number, string, boolean, null)
 * or object types compared using the `equals` deep equality operator.
 *
 * For example:
 * ```ts
 * import { includes } from "coaty/util";
 * 
 * includes([1, 46, 47, "foo"], 47) => true
 * includes([1, 46, "47", "foo"], 47) => false
 * includes([1, 46, { "foo": 47 }, "foo"], { "foo": 47 }) => true
 * includes([1, 46, { "foo": 47, "bar": 42 }, "foo"], { "foo": 47 }) => false
 * ```
 * 
 * @param a a JavaScript value to be contained on toplevel in an array
 * @param b a JavaScript array containing another value on toplevel
 */
export function includes(a: any[], b: any): boolean {
    if (!Array.isArray(a)) {
        throw new TypeError(`first argument must be an array`);
    }

    return a.some(av => equals(av, b));
}

/**
 * Deep copies a given value that can be represented as a JSON value.
 * Behaves identical to `JSON.parse(JSON.stringify(obj))`., i.e. it throws
 * an exception when a circular structure is detected, and copies a Date 
 * object into its ISO date string. All (own and inherited) enumerable properties 
 * of objects are copied.
 * 
 * @param obj any value that can be represented as a JSON value
 */
export function clone(obj: any): any {
    return cloneDeep(obj, new Set<object>());
}

function cloneDeep(obj: any, refs: Set<object>) {
    /* tslint:disable-next-line:no-null-keyword */
    if (obj === undefined || obj === null ||
        typeof obj === "number" || typeof obj === "boolean" || typeof obj === "string") {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(o => {
            const value = cloneDeep(o, refs);
            /* tslint:disable-next-line:no-null-keyword */
            return (value === undefined) ? null : value;
        });
    }
    if (typeof obj === "object") {
        if (obj instanceof Number || obj instanceof Boolean || obj instanceof String) {
            return obj.valueOf();
        }
        if (obj instanceof Date) {
            return obj.toJSON();
        }

        if (refs.has(obj)) {
            throw new TypeError("Cloning circular structure not supported");
        }
        refs.add(obj);
        const cloned = {};
        /* tslint:disable-next-line:forin */
        for (const prop in obj) {
            if (typeof prop !== "string") {
                continue;
            }
            const value = cloneDeep(obj[prop], refs);
            if (value !== undefined) {
                cloned[prop] = value;
            }
        }
        return cloned;
    }
    return undefined;
}
