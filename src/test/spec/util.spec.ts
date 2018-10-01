/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

/**
 * Test suite for framework utilities.
 */

import { Async, clone, contains, equals, includes } from "../../util";
import { failTest } from "./utils";

describe("Utilities", () => {

    const TEST_TIMEOUT = 2000;

    const asyncFunc = (item: number, previousValue?: number[]) => {
        return new Promise<number[]>((resolve, reject) => {
            setTimeout(() => {
                previousValue.push(item);
                resolve(previousValue);
            }, item);
        });
    };

    it("Async.reduce with an empty array", (done) => {
        const items = [];

        Async.reduce(items, asyncFunc, [])
            .then(value => {
                expect(value.length).toBe(0);
                done();
            })
            .catch(error => failTest(error, done));
    }, TEST_TIMEOUT);

    it("Async.reduce with a non-empty array", (done) => {
        const items = [100, 300, 150, 50];

        Async.reduce(items, asyncFunc, [])
            .then(value => {
                value.forEach((val, i) => {
                    expect(val).toBe(items[i]);
                });
                done();
            })
            .catch(error => failTest(error, done));
    }, TEST_TIMEOUT);

    it("Deep equality checks", () => {
        /* tslint:disable-next-line:no-null-keyword */
        expect(equals(null, null)).toBe(true);
        /* tslint:disable-next-line:no-null-keyword */
        expect(equals(null, undefined)).toBe(false);
        expect(equals(42, 42)).toBe(true);
        expect(equals(42, "42")).toBe(false);
        expect(equals([], [])).toBe(true);
        expect(equals([42, 41], [42, 41])).toBe(true);
        expect(equals([42, 41], [41, 42])).toBe(false);
        expect(equals({ a: [2, 3], b: [4] }, { a: [2, 3], b: [4] })).toBe(true);
        expect(equals({ x: 5, y: [6] }, { x: 5, y: 6 })).toBe(false);
    });

    it("Deep contains checks", () => {
        expect(contains("foo", "foo")).toBe(true);
        expect(contains([1, 2, 3], [])).toBe(true);
        expect(contains([1, 2, 3], [3])).toBe(true);
        expect(contains([1, 2, 3], 3)).toBe(true);
        expect(contains([1, 2, 3], [3, 1])).toBe(true);
        expect(contains([1, 2, 3], [3, 1, 3, 1])).toBe(true);
        expect(contains([1, 2, 3], [3, 1, 5])).toBe(false);
        expect(contains([1, [2, 3, 4], 3], [3, [3, 2]])).toBe(true);
        expect(contains([1, [2, 3, 4], 3], [3, [3, 1]])).toBe(false);
        expect(contains({ foo: 1, bar: 2 }, { bar: 2 })).toBe(true);
        expect(contains({ foo: 1, bar: 2 }, { bar: 2, foo: 1 })).toBe(true);
        expect(contains({ foo: 1, bar: 2 }, { bar: 2, foo: 2 })).toBe(false);
        expect(contains({ foo: { bar: "baz" } }, { foo: {} })).toBe(true);
        expect(contains({ foo: { bar: "baz" } }, { bar: "baz" })).toBe(false);
        expect(contains([1, { foo: [{ bar: [1, 2, 3] }, 2, 3] }], [{ foo: [{ bar: [3] }] }])).toBe(true);
    });

    it("Deep includes checks", () => {
        expect(includes([1, 46, true, "foo"], true)).toBe(true);
        expect(includes([1, 46, true, "foo"], false)).toBe(false);
        expect(includes([1, 46, 47, "foo"], 47)).toBe(true);
        expect(includes([1, 46, "47", "foo"], 47)).toBe(false);
        expect(includes([1, 46, { foo: 47 }, "foo"], { foo: 47 })).toBe(true);
        expect(includes([1, 46, { foo: 47, bar: 42 }, "foo"], { foo: 47 })).toBe(false);
    });

    it("Deep clone", () => {
        expect(clone(undefined)).toBe(undefined);
        /* tslint:disable-next-line:no-null-keyword */
        expect(clone(null)).toBe(JSON.parse(JSON.stringify(null)));
        expect(clone(42)).toBe(JSON.parse(JSON.stringify(42)));
        /* tslint:disable-next-line:no-construct */
        expect(clone(new Number(42))).toBe(JSON.parse(JSON.stringify(new Number(42))));
        expect(clone("42")).toBe(JSON.parse(JSON.stringify("42")));
        /* tslint:disable-next-line:no-construct */
        expect(clone(new String("42"))).toBe(JSON.parse(JSON.stringify(new String("42"))));
        expect(clone(true)).toBe(JSON.parse(JSON.stringify(true)));
        expect(clone(false)).toBe(JSON.parse(JSON.stringify(false)));
        /* tslint:disable-next-line:no-construct */
        expect(clone(new Boolean(true))).toBe(JSON.parse(JSON.stringify(new Boolean(true))));
        /* tslint:disable-next-line:no-construct */
        expect(clone(new Boolean(false))).toBe(JSON.parse(JSON.stringify(new Boolean(false))));
        expect(clone(false)).toBe(JSON.parse(JSON.stringify(false)));
        expect(clone(new Date(2006, 0, 2, 15, 4, 5))).toBe(JSON.parse(JSON.stringify(new Date(2006, 0, 2, 15, 4, 5))));
        expect(equals(clone([]), JSON.parse(JSON.stringify([])))).toBe(true);
        expect(equals(clone([1, 46, true, "foo"]), JSON.parse(JSON.stringify([1, 46, true, "foo"])))).toBe(true);
        expect(equals(clone({ [Symbol.for("foo")]: "foo" }), JSON.parse(JSON.stringify({ [Symbol.for("foo")]: "foo" })))).toBe(true);
        expect(equals(clone({}), JSON.parse(JSON.stringify({})))).toBe(true);
        expect(equals(clone({ x: [10, undefined, () => 10, Symbol("")] }),
            JSON.parse(JSON.stringify({ x: [10, undefined, () => 10, Symbol("")] })))).toBe(true);
        /* tslint:disable-next-line:no-null-keyword */
        expect(equals(clone(Object.create(null, { x: { value: "x", enumerable: false }, y: { value: "y", enumerable: true } })),
            JSON.parse(JSON.stringify(
                /* tslint:disable-next-line:no-null-keyword */
                Object.create(null, { x: { value: "x", enumerable: false }, y: { value: "y", enumerable: true } }))))).toBe(true);

        const obj1 = { x: 1, z: 2 };
        obj1.z = obj1 as any;
        expect(() => clone(obj1)).toThrow();

        const obj2 = { x: [1], y: 2 };
        obj2.x.push(obj2 as any);
        expect(() => clone(obj2)).toThrow();
    });

});
