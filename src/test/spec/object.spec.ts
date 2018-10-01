/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

/**
 * Test suite for framework objects.
 */

import { CoatyObject, CoreTypes, filterOp, ObjectFilter, ObjectMatcher } from "../../model";
import { Runtime } from "../../runtime";

describe("Objects", () => {

    const filterObj = {
        name: "TestObjectFilter",
        coreType: "CoatyObject",
        objectType: CoreTypes.OBJECT_TYPE_OBJECT,
        objectId: Runtime.newUuid(),
        filterUndefined: undefined,
        filterBoolean: true,
        filterNumber: 42,
        filterString: "Abc",
        filterLikeString: "hello abc\\d_",
        filterLikeString1: ".*+?^${}()|[]",
        filterArray: [42, [43, 44], [[45, 46]]],
        filterObject: { foo: 42, bar: [42, 43], baz: { mumble: [42, 45] } },
        filterObject1: { foo: 42 },
    } as CoatyObject;

    it("Object filters", () => {
        let filter: ObjectFilter = {};
        expect(ObjectMatcher.matchesFilter(undefined, undefined)).toBe(false);
        expect(ObjectMatcher.matchesFilter(undefined, filter)).toBe(false);
        expect(ObjectMatcher.matchesFilter(filterObj, undefined)).toBe(true);
        expect(ObjectMatcher.matchesFilter(filterObj, filter)).toBe(true);

        filter = {
            conditions: {
                and: [
                    ["foo", filterOp.notExists()],
                    ["filterUndefined", filterOp.notExists()],
                    ["filterBoolean", filterOp.exists()],
                    ["filterBoolean", filterOp.equals(true)],
                    ["filterBoolean", filterOp.notEquals(false)],
                    ["filterNumber", filterOp.equals(42)],
                    ["filterNumber", filterOp.notEquals(43)],
                    ["filterString", filterOp.equals("Abc")],
                    ["filterString", filterOp.notEquals("abc")],
                    ["filterArray", filterOp.equals([42, [43, 44], [[45, 46]]])],
                    ["filterArray", filterOp.notEquals([42, [43, 44], [[45, 47]]])],
                    ["filterObject", filterOp.equals({ foo: 42, bar: [42, 43], baz: { mumble: [42, 45] } })],
                    ["filterObject", filterOp.notEquals({ foo: 42, bar: [42, 43], baz: { mumble: [43, 45] } })],
                    ["filterNumber", filterOp.lessThan(43)],
                    ["filterNumber", filterOp.lessThan("43")],
                    ["filterString", filterOp.lessThan("Abce")],
                    ["filterNumber", filterOp.lessThanOrEqual(42)],
                    ["filterNumber", filterOp.lessThanOrEqual("42")],
                    ["filterString", filterOp.lessThanOrEqual("ABc")],
                    ["filterNumber", filterOp.greaterThan(41)],
                    ["filterNumber", filterOp.greaterThan("41")],
                    ["filterString", filterOp.greaterThan("abc")],
                    ["filterNumber", filterOp.greaterThanOrEqual(42)],
                    ["filterNumber", filterOp.greaterThanOrEqual("42")],
                    ["filterString", filterOp.greaterThanOrEqual("Abc")],
                    ["filterNumber", filterOp.between(42, 42)],
                    ["filterNumber", filterOp.between(41, 43)],
                    ["filterNumber", filterOp.between(43, 41)],
                    ["filterString", filterOp.between("Abc", "Abc")],
                    ["filterString", filterOp.between("Abb", "Abd")],
                    ["filterString", filterOp.between("Abd", "Abb")],
                    ["filterNumber", filterOp.notBetween(43, 47)],
                    ["filterNumber", filterOp.notBetween(47, 43)],
                    ["filterNumber", filterOp.notBetween(41, 41)],
                    ["filterString", filterOp.notBetween("Abd", "Abf")],
                    ["filterString", filterOp.notBetween("Abf", "Abd")],
                    ["filterString", filterOp.notBetween("Abb", "Abb")],
                    ["filterString", filterOp.like("Abc")],
                    ["filterString", filterOp.like("Ab_")],
                    ["filterString", filterOp.like("_b_")],
                    ["filterString", filterOp.like("___")],
                    ["filterString", filterOp.like("%")],
                    ["filterString", filterOp.like("%_")],
                    ["filterString", filterOp.like("%__")],
                    ["filterString", filterOp.like("%___")],
                    ["filterString", filterOp.like("_%_")],
                    ["filterString", filterOp.like("__%_")],
                    ["filterString", filterOp.like("_%")],
                    ["filterString", filterOp.like("__%")],
                    ["filterString", filterOp.like("___%")],
                    ["filterString", filterOp.like("A%bc")],
                    ["filterString", filterOp.like("A%c")],
                    ["filterString", filterOp.like("A%")],
                    ["filterString", filterOp.like("%c")],
                    ["filterString", filterOp.like("%%")],
                    ["filterLikeString", filterOp.like("%a_c\\\\d\\_")],
                    ["filterLikeString1", filterOp.like(".*+?^${}()|[]")],
                    ["filterArray", filterOp.contains(42)],
                    ["filterArray", filterOp.contains([42, [43], [[46]]])],
                    ["filterObject", filterOp.contains({ foo: 42, bar: [42], baz: { mumble: [45] } })],
                    ["filterArray", filterOp.notContains(43)],
                    ["filterArray", filterOp.notContains([41, [45], [[43]]])],
                    ["filterObject", filterOp.notContains({ foo: 43 })],
                    ["filterObject", filterOp.notContains({ bar: [44] })],
                    ["filterObject", filterOp.notContains({ baz: { mumble: [43] } })],
                    ["filterObject", filterOp.notContains({ mumble: [45] })],
                    ["filterNumber", filterOp.in([43, 42, "42"])],
                    ["filterString", filterOp.in([43, 42, "Abc"])],
                    ["filterBoolean", filterOp.in([43, true, "Abc"])],
                    ["filterObject1", filterOp.in([{ bar: 43 }, { foo: 42 }])],
                    ["filterNumber", filterOp.notIn([43, 41, "42"])],
                    ["filterString", filterOp.notIn([43, 42, "abc"])],
                    ["filterBoolean", filterOp.notIn([43, false, "Abc"])],
                    ["filterObject1", filterOp.notIn([{ foo: 42, bar: 43 }])],
                ],
            },
        };
        expect(ObjectMatcher.matchesFilter(filterObj, filter)).toBe(true);

        filter.conditions.or = filter.conditions.and;
        filter.conditions.and = undefined;
        expect(ObjectMatcher.matchesFilter(filterObj, filter)).toBe(true);
    });

});
