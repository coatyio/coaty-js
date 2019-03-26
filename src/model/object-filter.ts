/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

/**
 * Defines criteria for filtering Coaty objects. Used in combination with Call events,
 * and with the `ObjectMatcher` functionality.
 */
export interface ContextFilter {

    /**
     * A single condition or a set of conditions for filtering objects (optional).
     * If not specified or empty, all objects are selected.
     *
     * A set of filter conditions can be combined by logical AND or OR.
     * 
     * An object filter condition is defined as a tuple
     * specifying the name of an object property and a filter expression.
     * The filter expression must evaluate to true when applied to the
     * property's value for the condition to become true.
     *
     * The object property to be applied for filtering is specified either
     * in dot notation or array notation. In dot notation, the name of the
     * object property is specified as a string (e.g. `"objectId"`). It may
     * include dots (`.`) to access nested properties of subobjects (e.g.
     * `"message.name"`). If a single property name contains dots itself,
     * you obviously cannot use dot notation. Instead, specify the property
     * or nested properties as an array of strings (e.g.
     * `["property.with.dots, "subproperty.with.dots"]`).
     *
     * A filter expression is a tuple consisting of a filter operator and an
     * operator-specific number of filter operands. You should use one of the
     * typesafe `filterOp` functions to specify a filter expression.
     */
    conditions?: ObjectFilterCondition | ObjectFilterConditions;
}

/**
 * Defines criteria for filtering and ordering a result
 * set of Coaty objects. Used in combination with Query events
 * and database operations, and with the `ObjectMatcher` functionality.
 */
export interface ObjectFilter extends ContextFilter {

    /**
     * Determines the ordering of result objects by an array of
     * (property name - sort order) tuples. The results are ordered by the
     * first tuple, then by the second tuple, etc.
     * 
     * The object property used for ordering can be specified either in dot notation
     * or array notation. In dot notation, the name of the
     * object property is specified as a string (e.g. `"objectId"`). It may
     * include dots (`.`) to access nested properties of subobjects (e.g.
     * `"message.name"`). If a single property name contains dots itself, you obviously
     * cannot use dot notation. Instead, specify the property or nested properties
     * as an array of strings (e.g. `["property.with.dots, "subproperty.with.dots"]`).
     */
    orderByProperties?: Array<[ObjectFilterProperties, "Asc" | "Desc"]>;

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
 * Defines the format of nested properties used in ObjectFilter `conditions` and 
 * `orderByProperties` clauses. Both dot notation (`"property.subproperty.subsubproperty"`)
 * and array notation (`["property", "subproperty", "subsubproperty"]`) are supported for
 * naming nested properties. Note that dot notation cannot be used if one of the properties
 * contains a dot (.) in its name. In such cases, array notation must be used.
 */
export type ObjectFilterProperties = string | string[];

/**
 * Defines a set of conditions for filtering objects.
 * Filter conditions can be combined by logical AND or OR
 * as follows:
 * 
 * ```
 * {
 *    and: ObjectFilterCondition[],
 * }
 * ```
 * 
 * ```
 * {
 *    or: ObjectFilterCondition[],
 * }
 * ```
 */
export type ObjectFilterConditions = {
    /**
     * Multiple filter conditions combined by logical AND.
     * Specify either the `and` or the `or` property, or none, but *never* both.
     * 
     * An object filter condition is defined as a tuple
     * specifying the name of an object property and a filter expression.
     * The filter expression must evaluate to true when applied to the
     * property's value for the condition to become true.
     * 
     * The object property to be applied for filtering is specified either
     * in dot notation or array notation. In dot notation, the name of the
     * object property is specified as a string (e.g. `"objectId"`). It may
     * include dots (`.`) to access nested properties of subobjects (e.g.
     * `"message.name"`). If a single property name contains dots itself,
     * you obviously cannot use dot notation. Instead, specify the property
     * or nested properties as an array of strings (e.g.
     * `["property.with.dots, "subproperty.with.dots"]`).
     *
     * A filter expression is a tuple consisting of a filter operator and an
     * operator-specific number of filter operands. You should use one of the
     * typesafe `filterOp` functions to specify a filter expression.
     */
    and?: ObjectFilterCondition[];


    /**
     * Multiple filter conditions combined by logical OR.
     * Specify either the `and` or the `or` property, or none, but *never* both.
     * 
     * An object filter condition is defined as a tuple
     * specifying the name of an object property and a filter expression.
     * The filter expression must evaluate to true when applied to the
     * property's value for the condition to become true.
     *
     * The object property to be applied for filtering is specified either
     * in dot notation or array notation. In dot notation, the name of the
     * object property is specified as a string (e.g. `"objectId"`). It may
     * include dots (`.`) to access nested properties of subobjects (e.g.
     * `"message.name"`). If a single property name contains dots itself,
     * you obviously cannot use dot notation. Instead, specify the property
     * or nested properties as an array of strings (e.g.
     * `["property.with.dots, "subproperty.with.dots"]`).
     *
     * A filter expression is a tuple consisting of a filter operator and an
     * operator-specific number of filter operands. You should use one of the
     * typesafe `filterOp` functions to specify a filter expression.
     */
    or?: ObjectFilterCondition[];
};

/**
 * An object filter condition is defined as a tuple
 * specifying an object property name - filter expression pair.
 * The filter expression must evaluate to true when applied to the
 * property's value for the condition to become true.
 */
export interface ObjectFilterCondition extends Array<ObjectFilterProperties | ObjectFilterExpression> {
    0: ObjectFilterProperties;
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
     * For string comparison, a default lexical ordering is used.
     * Note: Do not compare a number with a string, as the result is not defined.
     */
    lessThan: (value: number | string): [ObjectFilterOperator, number | string] =>
        [ObjectFilterOperator.LessThan, value],

    /**
     * Checks if the filter property is less than or equal to the given value.
     * For string comparison, a default lexical ordering is used.
     * Note: Do not compare a number with a string, as the result is not defined.
     */
    lessThanOrEqual: (value: number | string): [ObjectFilterOperator, number | string] =>
        [ObjectFilterOperator.LessThanOrEqual, value],

    /**
     * Checks if the filter property is greater than the given value.
     * For string comparison, a default lexical ordering is used.
     * Note: Do not compare a number with a string, as the result is not defined.
     */
    greaterThan: (value: number | string): [ObjectFilterOperator, number | string] =>
        [ObjectFilterOperator.GreaterThan, value],

    /**
     * Checks if the filter property is greater than or equal to the given value.
     * For string comparison, a default lexical ordering is used.
     * Note: Do not compare a number with a string, as the result is not defined.
     */
    greaterThanOrEqual: (value: number | string): [ObjectFilterOperator, number | string] =>
        [ObjectFilterOperator.GreaterThanOrEqual, value],

    /**
     * Checks if the filter property is between the given values, i.e.
     * prop >= value1 AND prop <= value2.
     * If the first argument `value1` is not less than or equal to the second
     * argument `value2`, those two arguments are automatically swapped.
     * For string comparison, a default lexical ordering is used.
     * Note: Do not compare a number with a string, as the result is not defined.
     */
    between: (value1: number | string, value2: number | string): [ObjectFilterOperator, number | string, number | string] =>
        [ObjectFilterOperator.Between, value1, value2],

    /**
     * Checks if the filter property is not between the given values, i.e.
     * prop < value1 OR prop > value2.
     * If the first argument `value1` is not less than or equal to the second
     * argument `value2`, those two arguments are automatically swapped.
     * For string comparison, a default lexical ordering is used.
     * Note: Do not compare a number with a string, as the result is not defined.
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
     * Checks if the filter property value (usually an object or array) does not contain the
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
     * For string comparison, a default lexical ordering is used.
     * Note: Do not compare a number with a string, as the result is not defined.
     */
    LessThan,

    /**
     * Checks if the filter property is less than or equal to the given value.
     * For string comparison, a default lexical ordering is used.
     * Note: Do not compare a number with a string, as the result is not defined.
     */
    LessThanOrEqual,

    /**
     * Checks if the filter property is greater than the given value.
     * For string comparison, a default lexical ordering is used.
     * Note: Do not compare a number with a string, as the result is not defined.
     */
    GreaterThan,

    /**
     * Checks if the filter property is greater than or equal to the given value.
     * For string comparison, a default lexical ordering is used.
     * Note: Do not compare a number with a string, as the result is not defined.
     */
    GreaterThanOrEqual,

    /**
     * Checks if the filter property is between the two given operands, i.e.
     * prop >= operand AND prop <= operand2.
     * If the first operand is not less than or equal to the second
     * operand, those two arguments are automatically swapped.
     * For string comparison, a default lexical ordering is used.
     * Note: Do not compare a number with a string, as the result is not defined.
     */
    Between,

    /**
     * Checks if the filter property is not between the given operands, i.e.
     * prop < operand1 OR prop > operand2.
     * If the first operand is not less than or equal to the second
     * operand, those two arguments are automatically swapped.
     * For string comparison, a default lexical ordering is used.
     * Note: Do not compare a number with a string, as the result is not defined.
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
     * Checks if the filter property value (usually an object or array) does not contain the
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

/* Type validation for ContextFilter and ObjectFilter */

export function isContextFilterValid(filter: ContextFilter): boolean {
    if (filter === undefined) {
        return true;
    }
    /* tslint:disable-next-line:no-null-keyword */
    return filter !== null &&
        typeof filter === "object" &&
        areFilterConditionsValid(filter.conditions);
}

export function isObjectFilterValid(filter: ObjectFilter): boolean {
    return isContextFilterValid(filter) &&
        (filter.skip === undefined || typeof filter.skip === "number") &&
        (filter.take === undefined || typeof filter.take === "number") &&
        (filter.orderByProperties === undefined ||
            areOrderByPropertiesValid(filter.orderByProperties));
}

function areFilterConditionsValid(conds: any): boolean {
    if (conds === undefined) {
        return true;
    }
    /* tslint:disable-next-line:no-null-keyword */
    return conds !== null &&
        isFilterConditionValid(conds) ||
        (typeof conds === "object" &&
            !(conds.and && conds.or) &&
            (conds.and === undefined || isFilterConditionArrayValid(conds.and)) &&
            (conds.or === undefined || isFilterConditionArrayValid(conds.or)));
}

function isFilterConditionArrayValid(acond: ObjectFilterCondition[]) {
    return Array.isArray(acond) &&
        acond.every(cond => isFilterConditionValid(cond));
}

function isFilterConditionValid(cond: ObjectFilterCondition) {
    // @todo(HHo) refine validation checks for filter operator parameters
    return Array.isArray(cond) &&
        cond.length === 2 &&
        cond[0] &&
        (typeof cond[0] === "string" ||
            (Array.isArray(cond[0]) && (<any[]>cond[0]).every(prop => typeof prop === "string"))) &&
        Array.isArray(cond[1]) &&
        cond[1].length >= 1 &&
        typeof cond[1][0] === "number" &&
        ObjectFilterOperator[cond[1][0]] !== undefined;
}

function areOrderByPropertiesValid(orderProps: Array<[ObjectFilterProperties, "Asc" | "Desc"]>): boolean {
    return Array.isArray(orderProps) &&
        orderProps.every(o => Array.isArray(o) &&
            o.length === 2 &&
            (typeof o[0] === "string" ||
                (Array.isArray(o[0]) && (<any[]>o[0]).every(prop => typeof prop === "string"))) &&
            (o[1] === "Asc" || o[1] === "Desc"));
}
