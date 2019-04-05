/*! Copyright (c) 2019 Siemens AG. Licensed under the MIT License. */

import { contains, equals, includes } from "../util/deep";
import { CoatyObject } from "./object";
import { ContextFilter, ObjectFilterCondition, ObjectFilterOperator, ObjectFilterProperties } from "./object-filter";

/**
 * Provides a static `matchesFilter` method to match an object against a
 * given object filter. Useful for retrieving matching objects on Query events
 * without using a database adapter. Also useful to filter out Coaty objects 
 * that match given filter conditions before publishing with Advertise or
 * Channel events.
 */
export class ObjectMatcher {

    private static COLLATOR: Intl.Collator;

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

    /**
     * Determines whether the given object matches the given context filter.
     * Note that if you pass in an `ObjectFilter`, only the filter conditions are 
     * heeded for the result.
     * 
     * @param obj The object to pass the filter on.
     * @param filter The context filter to apply.
     * @returns true on match; false otherwise
     */
    static matchesFilter(obj: CoatyObject, filter: ContextFilter): boolean {
        if (obj === undefined) {
            return false;
        }
        if (filter === undefined) {
            return true;
        }
        if (filter.conditions === undefined) {
            return true;
        }
        if (Array.isArray(filter.conditions)) {
            return ObjectMatcher._matchesCondition(obj, filter.conditions);
        }
        if (filter.conditions.and) {
            return filter.conditions.and.every(cond => ObjectMatcher._matchesCondition(obj, cond));
        }
        if (filter.conditions.or) {
            return filter.conditions.or.some(cond => ObjectMatcher._matchesCondition(obj, cond));
        }
        return true;
    }

    /**
     * Gets an array of property names for the given nested properties specified either
     * in dot notation or array notation.
     * 
     * @internal For internal use in framework only.
     * 
     * @param propNames property names as string in dot notation or as array of property names
     * @returns an array of nested property names
     */
    static getFilterProperties(propNames: ObjectFilterProperties) {
        if (typeof propNames === "string") {
            return propNames.split(".");
        }
        return propNames;
    }

    /**
     * Gets the value of a given property for the given object. Property names may be
     * specified to retrieve the value of a nested property of a subordinate object.
     * 
     * @internal For internal use in framework only.
     * 
     * @param propNames property names as string in dot notation or as array of property names
     * @param obj a Coaty object
     * @returns the value of the nested properties of the given object
     */
    static getFilterPropertyValue(propNames: ObjectFilterProperties, obj: CoatyObject) {
        return ObjectMatcher.getFilterProperties(propNames)
            .reduce((p, c) => p !== null && typeof p === "object" ? p[c] : undefined, obj);
    }

    private static _matchesCondition(obj: CoatyObject, condition: ObjectFilterCondition) {
        const [props, [op, value1, value2]] = condition;
        const value = ObjectMatcher.getFilterPropertyValue(props, obj);

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
