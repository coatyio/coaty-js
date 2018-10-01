/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { CoatyObject } from "../model/object";
import { contains, equals, includes } from "../util/deep";

/**
 * Defines criteria for filtering and ordering a result
 * set of Coaty objects. Used in combination with query events.
 */
export interface ObjectFilter {

    /**
     * Conditions for filtering objects (optional).
     * If not specified or empty, all objects are selected.
     *
     * Filter conditions can be combined by logical AND or OR.
     *
     * Object filter conditions are defined as an array of tuples
     * specifying object property name - filter expression pairs.
     * The filter expression must evaluate to true when applied to the
     * property's value for the condition to become true.
     */
    conditions?: {

        /**
         * Individual filter conditions are combined by logical AND.
         * Specify either the `and` or the `or` property, or none, but never both.
         */
        and?: ObjectFilterCondition[];


        /**
         * Individual filter conditions are combined by logical OR.
         * Specify either the `and` or the `or` property, or none, but never both.
         */
        or?: ObjectFilterCondition[];
    };

    /**
     * Determines the ordering of result objects by an array of
     * (property name - sort order) tuples. The results are ordered by the
     * first tuple, then by the second tuple, etc.
     */
    orderByProperties?: Array<[string, "Asc" | "Desc"]>;

    /**
     * If a take count is given, no more than that many objects will be returned
     * (but possibly less, if the request itself yields less objects).
     * Typically, this option is only useful if the `orderByProperties` option
     * is also specified to ensure consistent ordering of paginated results.
     */
    take?: number;

    /**
     * If skip count is given that many objects are skipped before beginning to
     * return result objects.
     * Typically, this option is only useful if the `orderByProperties` option
     * is also specified to ensure consistent ordering of paginated results.
     */
    skip?: number;

}

/**
 * An object filter condition is defined as a tuple
 * specifying an object property name - filter expression pair.
 * The filter expression must evaluate to true when applied to the
 * property's value for the condition to become true.
 */
export interface ObjectFilterCondition extends Array<string | ObjectFilterExpression> {
    0: string;
    1: ObjectFilterExpression;
}

/**
 * A filter expression is a tuple consisting of a filter operator and an
 * operator-specific number of filter operands.
 *
 * Tip: use one of the typesafe `filterOp` functions to specify a filter
 * expression.
 */
export interface ObjectFilterExpression extends Array<ObjectFilterOperator | any> {
    0: ObjectFilterOperator;
    1?: any;
    2?: any;
}

/**
 * Defines filter operator functions that yield object filter expressions.
 */
export const filterOp = {

    /**
     * Checks if the filter property is less than the given value.
     * For string comparison, an application-specific lexical ordering is used.
     * For database queries, the default database collation is used.
     */
    lessThan: (value: number | string): [ObjectFilterOperator, number | string] =>
        [ObjectFilterOperator.LessThan, value],

    /**
     * Checks if the filter property is less than or equal to the given value.
     * For string comparison, an application-specific lexical ordering is used.
     * For database queries, the default database collation is used.
     */
    lessThanOrEqual: (value: number | string): [ObjectFilterOperator, number | string] =>
        [ObjectFilterOperator.LessThanOrEqual, value],

    /**
     * Checks if the filter property is greater than the given value.
     * For string comparison, an application-specific lexical ordering is used.
     * For database queries, the default database collation is used.
     */
    greaterThan: (value: number | string): [ObjectFilterOperator, number | string] =>
        [ObjectFilterOperator.GreaterThan, value],

    /**
     * Checks if the filter property is greater than or equal to the given value.
     * For string comparison, an application-specific lexical ordering is used.
     * For database queries, the default database collation is used.
     */
    greaterThanOrEqual: (value: number | string): [ObjectFilterOperator, number | string] =>
        [ObjectFilterOperator.GreaterThanOrEqual, value],

    /**
     * Checks if the filter property is between the given values, i.e.
     * prop >= value1 AND prop <= value2.
     * If the first argument `value1` is not less than or equal to the second
     * argument `value2`, those two arguments are automatically swapped.
     * For string comparison, an application-specific lexical ordering is used.
     * For database queries, the default database collation is used.
     */
    between: (value1: number | string, value2: number | string): [ObjectFilterOperator, number | string, number | string] =>
        [ObjectFilterOperator.Between, value1, value2],

    /**
     * Checks if the filter property is not between the given values, i.e.
     * prop < value1 OR prop > value2.
     * If the first argument `value1` is not less than or equal to the second
     * argument `value2`, those two arguments are automatically swapped.
     * For string comparison, an application-specific lexical ordering is used.
     * For database queries, the default database collation is used.
     */
    notBetween: (value1: number | string, value2: number | string): [ObjectFilterOperator, number | string, number | string] =>
        [ObjectFilterOperator.NotBetween, value1, value2],

    /**
     * Checks if the filter property string matches the given pattern.
     * If pattern does not contain percent signs or underscores, then the pattern
     * only represents the string itself; in that case LIKE acts like the equals
     * operator (but less performant). An underscore (_) in pattern stands for
     * (matches) any single character; a percent sign (%) matches any sequence of
     * zero or more characters.
     *
     * LIKE pattern matching always covers the entire string. Therefore, if it's
     * desired to match a sequence anywhere within a string, the pattern must
     * start and end with a percent sign.
     *
     * To match a literal underscore or percent sign without matching other
     * characters, the respective character in pattern must be preceded by the
     * escape character. The default escape character is the backslash.
     * To match the escape character itself, write two escape characters.
     * 
     * For example, the pattern string `%a_c\\d\_` matches `abc\d_` in `hello abc\d_`
     * and `acc\d_` in `acc\d_`, but nothing in `hello abc\d_world`. Note that
     * in programming languages like JavaScript, Java, or C#, where the backslash
     * character is used as escape character for certain special characters you have
     * to double backslashes in literal string constants. Thus, for the example above the
     * pattern string literal would look like `"%a_c\\\\d\\_"`.
     */
    like: (pattern: string): [ObjectFilterOperator, string] =>
        [ObjectFilterOperator.Like, pattern],

    /**
     * Checks if the filter property is deep equal to the given value
     * according to a recursive equality algorithm.
     * 
     * Note: do not check for `undefined` value as it is converted 
     * to `null` implicitely by JSON. Use the `NotExists` operator instead.
     */
    equals: (value: any): [ObjectFilterOperator, any] =>
        [ObjectFilterOperator.Equals, value],

    /**
     * Checks if the filter property is not deep equal to the given value
     * according to a recursive equality algorithm.
     * 
     * Note: do not check for `undefined` value as it is converted 
     * to `null` implicitely by JSON. Use the `Exists` operator instead.
     */
    notEquals: (value: any): [ObjectFilterOperator, any] =>
        [ObjectFilterOperator.NotEquals, value],

    /**
     * Checks if the filter property exists.
     */
    exists: (): [ObjectFilterOperator] =>
        [ObjectFilterOperator.Exists],

    /**
     * Checks if the filter property doesn't exist.
     */
    notExists: (): [ObjectFilterOperator] =>
        [ObjectFilterOperator.NotExists],

    /**
     * Checks if the filter property value (usually an object or array) contains the
     * given values. Primitive value types (number, string, boolean, null) contain
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
     */
    contains: (values: any): [ObjectFilterOperator, any] =>
        [ObjectFilterOperator.Contains, values],

    /**
     * Checks if the filter property value (usually an object or array) do not contain the
     * given values. Primitive value types (number, string, boolean, null) contain
     * only the identical value. Object properties match if all the key-value
     * pairs of the specified object are not contained in them. Array properties
     * match if all the specified array elements are not contained in them.
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
     * notContains([1, 2, 3], [4]) => true
     * notContains([1, 2, 3], 4) => true
     * ```
     */
    notContains: (values: any): [ObjectFilterOperator, any] =>
        [ObjectFilterOperator.NotContains, values],

    /**
     * Checks if the filter property value is included on toplevel in the given
     * operand array of values which may be primitive types (number, string, boolean, null)
     * or object types compared using the deep equality operator.
     *
     * For example:
     * ```ts
     * in(47, [1, 46, 47, "foo"]) => true
     * in(47, [1, 46, "47", "foo"]) => false
     * in({ "foo": 47 }, [1, 46, { "foo": 47 }, "foo"]) => true
     * in({ "foo": 47 }, [1, 46, { "foo": 47, "bar": 42 }, "foo"]) => false
     * ```
     */
    in: (values: any[]): [ObjectFilterOperator, any[]] =>
        [ObjectFilterOperator.In, values],

    /**
     * Checks if the filter property value is not included on toplevel in the given
     * operand array of values which may be primitive types (number, string, boolean, null)
     * or object types compared using the deep equality operator.
     *
     * For example:
     * ```ts
     * notIn(47, [1, 46, 47, "foo"]) => false
     * notIn(47, [1, 46, "47", "foo"]) => true
     * notIn({ "foo": 47 }, [1, 46, { "foo": 47 }, "foo"]) => false
     * notIn({ "foo": 47 }, [1, 46, { "foo": 47, "bar": 42 }, "foo"]) => true
     * ```
     */
    notIn: (values: any[]): [ObjectFilterOperator, any[]] =>
        [ObjectFilterOperator.NotIn, values],

};

/**
 * Defines filter operators for object filter conditions.
 */
export enum ObjectFilterOperator {

    /**
     * Checks if the filter property is less than the given value.
     * For string comparison, an application-specific lexical ordering is used.
     * For database queries, the default database collation is used.
     */
    LessThan,

    /**
     * Checks if the filter property is less than or equal to the given value.
     * For string comparison, an application-specific lexical ordering is used.
     * For database queries, the default database collation is used.
     */
    LessThanOrEqual,

    /**
     * Checks if the filter property is greater than the given value.
     * For string comparison, an application-specific lexical ordering is used.
     * For database queries, the default database collation is used.
     */
    GreaterThan,

    /**
     * Checks if the filter property is greater than or equal to the given value.
     * For string comparison, an application-specific lexical ordering is used.
     * For database queries, the default database collation is used.
     */
    GreaterThanOrEqual,

    /**
     * Checks if the filter property is between the two given operands, i.e.
     * prop >= operand AND prop <= operand2.
     * If the first operand is not less than or equal to the second
     * operand, those two arguments are automatically swapped.
     * For string comparison, an application-specific lexical ordering is used.
     * For database queries, the default database collation is used.
     */
    Between,

    /**
     * Checks if the filter property is not between the given operands, i.e.
     * prop < operand1 OR prop > operand2.
     * If the first operand is not less than or equal to the second
     * operand, those two arguments are automatically swapped.
     * For string comparison, an application-specific lexical ordering is used.
     * For database queries, the default database collation is used.
     */
    NotBetween,

    /**
     * Checks if the filter property string matches the given pattern.
     * If pattern does not contain percent signs or underscores, then the pattern
     * only represents the string itself; in that case LIKE acts like the equals
     * operator (but less performant). An underscore (_) in pattern stands for
     * (matches) any single character; a percent sign (%) matches any sequence of
     * zero or more characters.
     *
     * LIKE pattern matching always covers the entire string. Therefore, if it's
     * desired to match a sequence anywhere within a string, the pattern must
     * start and end with a percent sign.
     *
     * To match a literal underscore or percent sign without matching other
     * characters, the respective character in pattern must be preceded by the
     * escape character. The default escape character is the backslash.
     * To match the escape character itself, write two escape characters.
     * 
     * For example, the pattern string `%a_c\\d\_` matches `abc\d_` in `hello abc\d_`
     * and `acc\d_` in `acc\d_`, but nothing in `hello abc\d_world`. Note that 
     * in programming languages like JavaScript, Java, or C#, where the backslash
     * character is used as escape character for certain special characters you have
     * to double backslashes in literal string constants. Thus, for the example above
     * the pattern string literal would look like `"%a_c\\\\d\\_"`. 
     */
    Like,

    /**
     * Checks if the filter property is deep equal to the given value
     * according to a recursive equality algorithm.
     * 
     * Note: do not check for `undefined` value as it is converted 
     * to `null` implicitely by JSON. Use the `NotExists` operator instead.
     */
    Equals,

    /**
     * Checks if the filter property is not deep equal to the given value
     * according to a recursive equality algorithm.
     * 
     * Note: do not check for `undefined` value as it is converted 
     * to `null` implicitely by JSON. Use the `Exists` operator instead.
     */
    NotEquals,

    /**
     * Checks if the filter property exists.
     */
    Exists,

    /**
     * Checks if the filter property doesn't exist.
     */
    NotExists,

    /**
     * Checks if the filter property value (usually an object or array) contains the
     * given values. Primitive value types (number, string, boolean, null) contain
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
     * Contains([1, 2, 3], [3]) => true
     * Contains([1, 2, 3], 3) => true
     * ```
     */
    Contains,

    /**
     * Checks if the filter property value (usually an object or array) do not contain the
     * given values. Primitive value types (number, string, boolean, null) contain
     * only the identical value. Object properties match if all the key-value
     * pairs of the specified object are not contained in them. Array properties
     * match if all the specified array elements are not contained in them.
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
     * NotContains([1, 2, 3], [4]) => true
     * NotContains([1, 2, 3], 4) => true
     * ```
     */
    NotContains,

    /**
     * Checks if the filter property value is included on toplevel in the given
     * operand array of values which may be primitive types (number, string, boolean, null)
     * or object types compared using the deep equality operator.
     *
     * For example:
     * ```ts
     * In(47, [1, 46, 47, "foo"]) => true
     * In(47, [1, 46, "47", "foo"]) => false
     * In({ "foo": 47 }, [1, 46, { "foo": 47 }, "foo"]) => true
     * In({ "foo": 47 }, [1, 46, { "foo": 47, "bar": 42 }, "foo"]) => false
     * ```
     */
    In,

    /**
     * Checks if the filter property value is not included on toplevel in the given
     * operand array of values which may be primitive types (number, string, boolean, null)
     * or object types compared using the deep equality operator.
     *
     * For example:
     * ```ts
     * NotIn(47, [1, 46, 47, "foo"]) => false
     * NotIn(47, [1, 46, "47", "foo"]) => true
     * NotIn({ "foo": 47 }, [1, 46, { "foo": 47 }, "foo"]) => false
     * NotIn({ "foo": 47 }, [1, 46, { "foo": 47, "bar": 42 }, "foo"]) => true
     * ```
     */
    NotIn,

}

/**
 * Provides a static `matchesFilter` method to match an object against a
 * given object filter.
 */
export class ObjectMatcher {

    /**
     * Gets an Intl.Collator instance that is shared by all callers.
     * To be used to efficiently perform language-sensitive string comparison.
     * The returned collator object uses default locales and options.
     */
    static get collator() {
        let collator = ObjectMatcher.COLLATOR;
        if (!collator) {
            collator = ObjectMatcher.COLLATOR = new Intl.Collator();
        }
        return collator;
    }

    private static COLLATOR: Intl.Collator;

    /**
     * Determines whether the given object matches the given object filter.
     * Only the filter conditions are heeded for the result.
     * @param obj The object to pass the filter on.
     * @param filter The filter to apply.
     */
    static matchesFilter(obj: CoatyObject, filter: ObjectFilter): boolean {
        if (obj === undefined) {
            return false;
        }
        if (filter === undefined) {
            return true;
        }
        if (filter.conditions === undefined) {
            return true;
        }
        if (filter.conditions.and) {
            return filter.conditions.and.every(cond => ObjectMatcher._matchesCondition(obj, cond));
        }
        if (filter.conditions.or) {
            return filter.conditions.or.some(cond => ObjectMatcher._matchesCondition(obj, cond));
        }
        return true;
    }

    private static _matchesCondition(obj: CoatyObject, condition: ObjectFilterCondition) {
        const [prop, [op, value1, value2]] = condition;
        const value = obj[prop];

        if (op === ObjectFilterOperator.NotExists) {
            return value === undefined;
        }
        if (value === undefined) {
            return false;
        }

        switch (op) {
            case ObjectFilterOperator.LessThan:
                if (typeof value === "string" && typeof value1 === "string") {
                    return ObjectMatcher.collator.compare(value, value1) < 0;
                }
                return value < value1;
            case ObjectFilterOperator.LessThanOrEqual:
                if (typeof value === "string" && typeof value1 === "string") {
                    return ObjectMatcher.collator.compare(value, value1) <= 0;
                }
                return value <= value1;
            case ObjectFilterOperator.GreaterThan:
                if (typeof value === "string" && typeof value1 === "string") {
                    return ObjectMatcher.collator.compare(value, value1) > 0;
                }
                return value > value1;
            case ObjectFilterOperator.GreaterThanOrEqual:
                if (typeof value === "string" && typeof value1 === "string") {
                    return ObjectMatcher.collator.compare(value, value1) >= 0;
                }
                return value >= value1;
            case ObjectFilterOperator.Between:
                if (typeof value === "string" && typeof value1 === "string" && typeof value2 === "string") {
                    if (ObjectMatcher.collator.compare(value1, value2) > 0) {
                        return ObjectMatcher.collator.compare(value, value2) >= 0 &&
                            ObjectMatcher.collator.compare(value, value1) <= 0;
                    }
                    return ObjectMatcher.collator.compare(value, value1) >= 0 &&
                        ObjectMatcher.collator.compare(value, value2) <= 0;
                }
                if (value1 > value2) {
                    return value >= value2 && value <= value1;
                }
                return value >= value1 && value <= value2;
            case ObjectFilterOperator.NotBetween:
                if (typeof value === "string" && typeof value1 === "string" && typeof value2 === "string") {
                    if (ObjectMatcher.collator.compare(value1, value2) > 0) {
                        return ObjectMatcher.collator.compare(value, value2) < 0 ||
                            ObjectMatcher.collator.compare(value, value1) > 0;
                    }
                    return ObjectMatcher.collator.compare(value, value1) < 0 ||
                        ObjectMatcher.collator.compare(value, value2) > 0;
                }
                if (value1 > value2) {
                    return value < value2 || value > value1;
                }
                return value < value1 || value > value2;
            case ObjectFilterOperator.Like:
                if (typeof value !== "string" || typeof value1 !== "string") {
                    return false;
                }
                // To speed up regexp matching, generate regexp once and 
                // cache it as extra property on object filter expression array.
                const cachedRegex = condition[1]["likeRegex"];
                const likeRegex: RegExp = cachedRegex || ObjectMatcher._createLikeRegexp(value1);
                if (!cachedRegex) {
                    condition[1]["likeRegex"] = likeRegex;
                }
                return likeRegex.test(value);
            case ObjectFilterOperator.Equals:
                return equals(value, value1);
            case ObjectFilterOperator.NotEquals:
                return !equals(value, value1);
            case ObjectFilterOperator.Exists:
                return true;
            case ObjectFilterOperator.Contains:
                return contains(value, value1);
            case ObjectFilterOperator.NotContains:
                return !contains(value, value1);
            case ObjectFilterOperator.In:
                return includes(value1, value);
            case ObjectFilterOperator.NotIn:
                return !includes(value1, value);
            default:
                return false;
        }
    }

    private static _createLikeRegexp(pattern: string) {
        // Convert underscore/percent based SQL LIKE pattern into JavaScript regexp
        let regexStr = "^";
        let isEscaped = false;
        for (const c of pattern) {
            if (c === "\\") {
                if (isEscaped) {
                    isEscaped = false;
                    regexStr += "\\\\";
                } else {
                    isEscaped = true;
                }
                continue;
            }
            if (".*+?^${}()|[]".indexOf(c) !== -1) {
                regexStr += "\\" + c;
                isEscaped = false;
                continue;
            }
            if (c === "_" && !isEscaped) {
                regexStr += ".";
                continue;
            }
            if (c === "%" && !isEscaped) {
                regexStr += ".*";
                continue;
            }
            regexStr += c;
            isEscaped = false;
        }
        regexStr += "$";
        return new RegExp(regexStr);
    }
}
