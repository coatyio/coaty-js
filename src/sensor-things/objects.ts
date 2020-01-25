/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { Polygon } from "geojson";

import { CoatyObject, TimeInterval, Uuid } from "..";
import {
    FeatureOfInterestObjectTypeLiteral,
    ObservationObjectTypeLiteral,
    SensorObjectTypeLiteral,
    ThingObjectTypeLiteral,
} from "./internal";

/**
 * With regard to the Internet of Things, a thing is an object 
 * of the physical world (physical things) or the information 
 * world (virtual things) that is capable of being identified 
 * and integrated into communication networks.
 */
export interface Thing extends CoatyObject {
    coreType: "CoatyObject";
    objectType: ThingObjectTypeLiteral;

    /** 
     * This is a short description of the corresponding Thing.
     */
    description: string;

    /**
     * An object hash containing user-annotated properties as key-value pairs. (optional)
     */
    properties?: { [key: string]: any; };
}

/**
 * A Sensor is an instrument that observes a property or phenomenon with the
 * goal of producing an estimate of the value of the property. It groups a collection 
 * of Observations measuring the same ObservedProperty.
 */
export interface Sensor extends CoatyObject {
    coreType: "CoatyObject";
    objectType: SensorObjectTypeLiteral;

    /** 
     * The description of the Sensor. 
     */
    description: string;

    /**
     * The Sensor encodingType allows clients to know how to interpret metadata’s value. 
     * Currently the API defines two common Sensor metadata encodingTypes. 
     * Most sensor manufacturers provide their sensor datasheets in a PDF format. 
     * As a result, PDF is a Sensor encodingType supported by SensorThings API.
     * The second Sensor encodingType is SensorML.
     */
    encodingType: SensorEncodingType;

    /**
     * The detailed description of the Sensor or system.
     * The metadata type is defined by encodingType.
     */
    metadata: any;

    /**
     * The unit of measurement of the datastream, matching UCUM convention.
     * 
     * Note: When a Datastream does not have a unit of measurement 
     * (e.g., a truth observation type), the corresponding unitOfMeasurement
     * properties SHALL have undefined values. The unitOfMeasurement itself,
     * however, cannot be undefined.
     */
    unitOfMeasurement: UnitOfMeasurement;

    /**
     * The type of Observation (with unique result type), which is used by the
     * service to encode observations.
     */
    observationType: ObservationType;

    /**
     * The spatial bounding box of the spatial extent of all FeaturesOfInterest that belong to the 
     * Observations associated with this Sensor. (optional)
     */
    observedArea?: Polygon;

    /**
     * The temporal interval of the phenomenon times of all observations belonging to this 
     * Sensor. (optional)
     * 
     * The ISO 8601 standard string can be created using the function `toLocalTimeIntervalIsoString`
     * in the `@coaty/core` module.
     */
    phenomenonTime?: TimeInterval;

    /**
     * The temporal interval of the result times of all observations belonging to this 
     * Sensor. (optional)
     * 
     * The ISO 8601 standard string can be created using the function `toLocalTimeIntervalIsoString`
     * in the `@coaty/core` module.
     */
    resultTime?: TimeInterval;

    /**
     * The Observations of a Sensor SHALL observe the same ObservedProperty. The Observations
     * of different Sensors MAY observe the same ObservedProperty.
     */
    observedProperty: ObservedProperty;
}

/**
 * An object containing three key-value pairs:
 * - The name property presents the full name of the unitOfMeasurement.
 * - The symbol property shows the textual form of the unit symbol.
 * - The definition contains the URI defining the unitOfMeasurement.
 * 
 * The values of these properties SHOULD follow the Unified Code for Unit of Measure (UCUM).
 */
export interface UnitOfMeasurement {
    /** 
     * Full name of the UnitofMeasurement such as Degree Celsius.
     */
    name: string;

    /** 
     * Symbol of the unit such as degC.
     */
    symbol: string;

    /**  
     * Link to unit definition such as:
     * http://www.qudt.org/qudt/owl/1.0.0/unit/Instances.html#DegreeCelsius
     */
    definition: string;
}

/**
 * An ObservedProperty specifies the phenomenon of an Observation.
 */
export interface ObservedProperty {
    /**
     * A property provides a label for ObservedProperty, commonly a descriptive name.
     */
    name: string;

    /**
     * The URI of the ObservedProperty. Dereferencing this URI SHOULD result in a 
     * representation of the definition of the ObservedProperty.
     */
    definition: string;

    /**
     * A description about the ObservedProperty.
     */
    description: string;
}

/**
 * An Observation is the act of measuring or otherwise determining the value
 * of a property.
 */
export interface Observation extends CoatyObject {
    coreType: "CoatyObject";
    objectType: ObservationObjectTypeLiteral;

    /**
     * The time instant or period of when the Observation happens.
     */
    phenomenonTime: number;

    /**
     * The estimated value of an ObservedProperty from the Observation.
     * Depends on the observationType defined in the associated Datastream.
     */
    result: any;

    /**
     * The time of the Observation's result was generated.
     */
    resultTime: number;

    /**
     * Describes the quality of the result.
     * 
     * Should of type DQ_Element: https://geo-ide.noaa.gov/wiki/index.php?title=DQ_Element
     * However, it is considered as a string even by the test suite:
     * https://github.com/opengeospatial/ets-sta10/search?q=resultquality
     */
    resultQuality?: string[];

    /**
     * The time period during which the result may be used.
     */
    validTime?: TimeInterval;

    /**
     * Key-value pairs showing the environmental conditions during measurement.
     */
    parameters?: { [key: string]: any; };

    /**
     * Each Observation of the Sensor observes on one-and-only-one FeatureOfInterest (optional). It should refer
     * to the objectId of either a FeatureOfInterest or a Location object. When the FeatureOfInterest
     * changes, a snaphot of the Sensor should be created to display the change.
     */
    featureOfInterestId?: Uuid;
}

/**
 * An Observation results in a value being assigned to a phenomenon. The phenomenon
 * is a property of a feature, the latter being the FeatureOfInterest of the Observation. 
 * In the context of the Internet of Things, many Observations’ FeatureOfInterest can be 
 * the Location of the Thing. For example, the FeatureOfInterest of a wifi-connect thermostat 
 * can be the Location of the thermostat (i.e., the living room where the thermostat is located 
 * in). In the case of remote sensing, the FeatureOfInterest can be the geographical area or 
 * volume that is being sensed.
 */
export interface FeatureOfInterest extends CoatyObject {
    coreType: "CoatyObject";
    objectType: FeatureOfInterestObjectTypeLiteral;

    /**
     * The description about the FeatureOfInterest.
     */
    description: string;

    /**
     * The encoding type of the feature property.
     */
    encodingType: EncodingType;

    /**
     * The detailed description of the feature. The data type is defined by encodingType.
     */
    metadata: any;
}

/**
 * Some common sensor encoding types.
 * 
 * http://docs.opengeospatial.org/is/15-078r6/15-078r6.html#table_15
 */
export class SensorEncodingTypes {
    /**
     * An undefined encoding type. Returns empty string.
     */
    static readonly UNDEFINED: SensorEncodingType = "";

    static readonly PDF: SensorEncodingType = "application/pdf";

    static readonly SENSOR_ML: SensorEncodingType = "http://www.opengis.net/doc/IS/SensorML/2.0";
}

/**
 * Sensor encoding types. For common types see `SensorEncodingTypes`.
 */
export type SensorEncodingType = "application/pdf" |
    "http://www.opengis.net/doc/IS/SensorML/2.0" |
    string;

/**
 * Some common encoding types.
 * 
 * - http://docs.opengeospatial.org/is/15-078r6/15-078r6.html#table_7
 * - http://docs.opengeospatial.org/is/15-078r6/15-078r6.html#table_15
 */
export class EncodingTypes extends SensorEncodingTypes {
    static readonly GEO_JSON: EncodingType = "application/vnd.geo+json";
}

/**
 * Encoding types. For common types see `EncodingTypes`.
 */
export type EncodingType = "application/vnd.geo+json" | SensorEncodingType | string;

/**
 * Some common observations types
 * 
 * http://docs.opengeospatial.org/is/15-078r6/15-078r6.html#table_12
 */
export class ObservationTypes {
    /**
     * Expects results in format of URLs.
     */
    static readonly CATEGORY: ObservationType = "http://www.opengis.net/def/observationType/OGC-OM/2.0/OM_Category_Observation";

    /**
     * Expects results in format of integers.
     */
    static readonly COUNT: ObservationType = "http://www.opengis.net/def/observationType/OGC-OM/2.0/OM_CountObservation";

    /**
     * Expects results in format of doubles.
     */
    static readonly MEASUREMENT: ObservationType = "http://www.opengis.net/def/observationType/OGC-OM/2.0/OM_Measurement";

    /**
     * Expects results of any type of JSON format.
     */
    static readonly ANY: ObservationType = "http://www.opengis.net/def/observationType/OGC-OM/2.0/OM_Observation";

    /**
     * Expects results in format of booleans.
     */
    static readonly TRUTH: ObservationType = "http://www.opengis.net/def/observationType/OGC-OM/2.0/OM_TruthObservation";
}

/**
 * Observation types. For common types see `ObservationTypes`.
 */
export type ObservationType = "http://www.opengis.net/def/observationType/OGC-OM/2.0/OM_Category_Observation" |
    "http://www.opengis.net/def/observationType/OGC-OM/2.0/OM_CountObservation" |
    "http://www.opengis.net/def/observationType/OGC-OM/2.0/OM_Measurement" |
    "http://www.opengis.net/def/observationType/OGC-OM/2.0/OM_Observation" |
    "http://www.opengis.net/def/observationType/OGC-OM/2.0/OM_TruthObservation";
