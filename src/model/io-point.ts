/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { CoatyObject } from "./object";

/**
 * Defines strategies for coping with IO sources that produce IO values more
 * rapidly than specified in their currently recommended update rate.
 */
export enum IoSourceBackpressureStrategy {

    /**
     * Use a default strategy for publishing values.
     *
     * If no recommended update rate is assigned to the IO source, use the
     * `None` strategy; otherwise use the `Sample` strategy.
     */
    Default,

    /**
     * Publish all values immediately.
     *
     * Note that this strategy ignores the recommended update rate assigned to
     * the IO source.
     */
    None,

    /**
     * Publish the most recent values within periodic time intervals according
     * to the recommended update rate assigned to the IO source.
     *
     * If no update rate is given, fall back to the `None` strategy.
     */
    Sample,

    /**
     * Only publish a value if a particular timespan has passed without it
     * publishing another value.
     *
     * The timespan is determined by the recommended update rate assigned to the
     * IO source. If no update rate is given, fall back to the `None` strategy.
     */
    Throttle,
}

/**
 * Defines meta information of an IO point.
 *
 * This abstract base object has no associated framework base object type. For
 * instantiation use one of the concrete subtypes `IoSource` or `IoActor`.
 */
export interface IoPoint extends CoatyObject {

    /**
     * Determines whether IO values published by IO sources or received by IO
     * actors should be treated as raw data that is not encoded/decoded as JSON
     * objects.
     *
     * In order to associate an IO source with an IO actor their values of this
     * property must match, i.e. **both** properties must be either true or false
     * to ensure that IO values transmitted between an IO source and and an IO actor
     * can be properly encoded and decoded on each side.
     *
     * Set this property to true to indicate that the IO source or IO actor
     * should handle IO values in raw data format, i.e as a byte array of type
     * `Uint8Array` (or `Buffer` in Node.js, a subclass thereof).
     *
     * If set to false (default), the IO values sent by an IO source should be
     * encodable as JSON and decodable as JSON by an associated IO actor.
     */
    useRawIoValues?: boolean;

    /**
     * The update rate (in milliseconds) for publishing IoValue events:
     * - desired rate for IO actors
     * - maximum possible drain rate for IO sources
     *
     * The IO router specifies the recommended update rate in Associate event
     * data. If undefined, there is no limit on the rate of published events.
     */
    updateRate?: number;

    /**
     * A topic specification used for routing IO values from *external* sources
     * to Coaty-defined IO actors or from Coaty-defined IO sources to *external*
     * sinks (optional).
     *
     * Only used for associating routes that are not created by an IO router,
     * but defined by an external non-Coaty component.
     *
     * @remarks Note that the format of an external route is binding-specifc. In
     * order to deliver IO values from/to an external source/actor, the format
     * of the external route must correspond with the configured communication
     * binding. That means, it must be in a valid format and must not have a
     * Coaty-event-like shape. As the external route must be publishable and
     * subscribable, it must not be pattern-based (no wildcard tokens allowed).
     */
    externalRoute?: string;
}

/**
 * Defines meta information of an IO source.
 */
export interface IoSource extends IoPoint {

    coreType: "IoSource";

    /**
     * The semantic, application-specific data type of values to be represented
     * by the IO source, such as Temperature, Notification, Task, etc.
     *
     * In order to be associated with an IO actor their value types must match.
     *
     * The property value must be a non-empty string. You should choose
     * canonical names for value types to avoid naming collisions. For example,
     * by following the naming convention for Java packages, such as
     * `com.mydomain.myapp.Temperature`.
     *
     * Note that this value type is different from the underlying data format
     * used by the IO source to publish IO data values. For example, an IO
     * source for a temperature sensor could emit values as numbers or as a
     * Value1D object with specific properties.
     */
    valueType: string;

    /**
     * The backpressure strategy for publishing IO values (optional).
     *
     * If not specified, the value defaults to
     * `IoSourceBackpressureStrategy.Default`.
     */
    updateStrategy?: IoSourceBackpressureStrategy;
}

/**
 * Defines meta information of an IO actor.
 */
export interface IoActor extends IoPoint {

    coreType: "IoActor";

    /**
     * The semantic, application-specific data type of values to be consumed by
     * the IO actor, such as Temperature, Notification, Task, etc.
     *
     * In order to be associated with an IO source their value types must match.
     *
     * The property value must be a non-empty string. You should choose
     * canonical names for value types to avoid naming collisions. For example,
     * by following the naming convention for Java packages, such as
     * `com.mydomain.myapp.Temperature`.
     *
     * Note that this value type is different from the underlying data format
     * used by the IO source to publish IO data values. For example, an IO
     * source for a temperature sensor could emit values as numbers or as a
     * Value1D object with specific properties.
     */
    valueType: string;
}
