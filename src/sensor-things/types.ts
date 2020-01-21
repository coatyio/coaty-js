/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { CoreTypes, isTimeInterval } from "..";
import {
    FeatureOfInterestObjectTypeLiteral,
    ObservationObjectTypeLiteral,
    SensorObjectTypeLiteral,
    ThingObjectTypeLiteral,
} from "./internal";

export class SensorThingsTypes {

    static readonly OBJECT_TYPE_FEATURE_OF_INTEREST: FeatureOfInterestObjectTypeLiteral = "coaty.sensorThings.FeatureOfInterest";
    static readonly OBJECT_TYPE_OBSERVATION: ObservationObjectTypeLiteral = "coaty.sensorThings.Observation";
    static readonly OBJECT_TYPE_SENSOR: SensorObjectTypeLiteral = "coaty.sensorThings.Sensor";
    static readonly OBJECT_TYPE_THING: ThingObjectTypeLiteral = "coaty.sensorThings.Thing";

    /**
     * Checks if the given object is a valid Sensor object.
     */
    public static isSensor(obj: any) {
        return CoreTypes.isObject(obj, "CoatyObject") &&
            obj.objectType === SensorThingsTypes.OBJECT_TYPE_SENSOR &&
            typeof obj.description === "string" &&
            typeof obj.encodingType === "string" &&
            obj.metadata !== undefined &&
            SensorThingsTypes._isUnitOfMeasurement(obj.unitOfMeasurement) &&
            typeof obj.observationType === "string" &&
            typeof obj.parentObjectId !== undefined /* thing */ &&
            SensorThingsTypes._isObservedProperty(obj.observedProperty) &&
            (obj.observedArea === undefined ||
                typeof obj.observedArea === "object") &&
            (obj.phenomenonTime === undefined ||
                isTimeInterval(obj.phenomenonTime)) &&
            (obj.resultTime === undefined ||
                isTimeInterval(obj.resultTime));
    }

    /**
     * Checks if the given object is a valid FeatureOfInterest object.
     */
    public static isFeatureOfInterest(obj: any) {
        return CoreTypes.isObject(obj, "CoatyObject") &&
            obj.objectType === SensorThingsTypes.OBJECT_TYPE_FEATURE_OF_INTEREST &&
            typeof obj.description === "string" &&
            typeof obj.encodingType === "string" &&
            obj.metadata !== undefined;
    }

    /**
     * Checks if the given object is a valid Observation object.
     */
    public static isObservation(obj: any) {
        return CoreTypes.isObject(obj, "CoatyObject") &&
            obj.objectType === SensorThingsTypes.OBJECT_TYPE_OBSERVATION &&
            typeof obj.phenomenonTime === "number" &&
            obj.phenomenonTime >= 0 &&
            obj.result !== undefined &&
            typeof obj.resultTime === "number" &&
            obj.resultTime >= 0 &&
            typeof obj.parentObjectId !== undefined /* sensor */ &&
            (obj.resultQuality === undefined ||
                CoreTypes.isStringArray(obj.resultQuality)) &&
            (obj.validTime === undefined ||
                isTimeInterval(obj.validTime)) &&
            (obj.parameters === undefined ||
                typeof obj.parameters === "object") &&
            (obj.featureOfInterestId === undefined ||
                (typeof obj.featureOfInterestId === "string" &&
                    obj.featureOfInterestId.length > 0));
    }

    /**
     * Checks if the given object is a valid Thing object.
     */
    public static isThing(obj: any) {
        return CoreTypes.isObject(obj, "CoatyObject") &&
            obj.objectType === SensorThingsTypes.OBJECT_TYPE_THING &&
            typeof obj.description === "string" &&
            (obj.properties === undefined ||
                typeof obj.properties === "object") &&
            (obj.locations === undefined ||
                CoreTypes.isStringArray(obj.locations));
    }

    private static _isUnitOfMeasurement(obj: any) {
        return typeof obj === "object" &&
            (obj.name === undefined ||
                typeof obj.name === "string") &&
            (obj.symbol === undefined ||
                typeof obj.symbol === "string") &&
            (obj.definition === undefined ||
                typeof obj.definition === "string");
    }

    private static _isObservedProperty(obj: any) {
        return obj && typeof obj === "object" &&
            typeof obj.name === "string" && obj.name.length > 0 &&
            typeof obj.definition === "string" &&
            typeof obj.description === "string";
    }
}
