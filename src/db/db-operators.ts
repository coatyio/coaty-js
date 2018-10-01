/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

/**
 * Defines aggregation operators to be used to aggregate numeric or
 * boolean values.
 */
export enum AggregateOp {

    /**
     * Maximum value across all numeric input values
     */
    Max,

    /**
     * Minimum value across all numeric input values
     */
    Min,

    /**
     * Sum of all numeric input values
     */
    Sum,

    /**
     * Average of all numeric input values
     */
    Avg,

    /**
     * True if all boolean input values are true, otherwise false
     */
    Every,

    /**
     * True if at least one boolean input value is true, otherwise false
     */
    Some,
}
