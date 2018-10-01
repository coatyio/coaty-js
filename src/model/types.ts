/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { clone } from "../util/deep";
import { AnnotationStatus, AnnotationType } from "./annotation";
import { DisplayType } from "./device";
import { IoSourceBackpressureStrategy } from "./io-point";
import { LogLevel } from "./log";
import { CoatyObject } from "./object";
import { TaskStatus } from "./task";

/**
 * Type alias for all framework core types. This type is used for the
 * coreType property of objects based on the CoatyObject interface.
 */
export type CoreType =
    "CoatyObject" |
    "User" |
    "Device" |
    "Annotation" |
    "Task" |
    "IoSource" |
    "IoActor" |
    "Component" |
    "Config" |
    "Log" |
    "Location" |
    "Snapshot";

/**
 * Provides utility methods and constants for core object types.
 */
export class CoreTypes {

    // Constants for naming Coaty object types.
    static readonly OBJECT_TYPE_PREFIX = "coaty.";
    static readonly OBJECT_TYPE_OBJECT = CoreTypes.OBJECT_TYPE_PREFIX + "CoatyObject";
    static readonly OBJECT_TYPE_USER = CoreTypes.OBJECT_TYPE_PREFIX + "User";
    static readonly OBJECT_TYPE_DEVICE = CoreTypes.OBJECT_TYPE_PREFIX + "Device";
    static readonly OBJECT_TYPE_ANNOTATION = CoreTypes.OBJECT_TYPE_PREFIX + "Annotation";
    static readonly OBJECT_TYPE_TASK = CoreTypes.OBJECT_TYPE_PREFIX + "Task";
    static readonly OBJECT_TYPE_IO_SOURCE = CoreTypes.OBJECT_TYPE_PREFIX + "IoSource";
    static readonly OBJECT_TYPE_IO_ACTOR = CoreTypes.OBJECT_TYPE_PREFIX + "IoActor";
    static readonly OBJECT_TYPE_COMPONENT = CoreTypes.OBJECT_TYPE_PREFIX + "Component";
    static readonly OBJECT_TYPE_CONFIG = CoreTypes.OBJECT_TYPE_PREFIX + "Config";
    static readonly OBJECT_TYPE_LOG = CoreTypes.OBJECT_TYPE_PREFIX + "Log";
    static readonly OBJECT_TYPE_LOCATION = CoreTypes.OBJECT_TYPE_PREFIX + "Location";
    static readonly OBJECT_TYPE_SNAPSHOT = CoreTypes.OBJECT_TYPE_PREFIX + "Snapshot";

    /* tslint:disable:member-ordering */
    private static readonly _coreTypesMap = {
        CoatyObject: CoreTypes.OBJECT_TYPE_OBJECT,
        User: CoreTypes.OBJECT_TYPE_USER,
        Device: CoreTypes.OBJECT_TYPE_DEVICE,
        Annotation: CoreTypes.OBJECT_TYPE_ANNOTATION,
        Task: CoreTypes.OBJECT_TYPE_TASK,
        IoSource: CoreTypes.OBJECT_TYPE_IO_SOURCE,
        IoActor: CoreTypes.OBJECT_TYPE_IO_ACTOR,
        Component: CoreTypes.OBJECT_TYPE_COMPONENT,
        Config: CoreTypes.OBJECT_TYPE_CONFIG,
        Log: CoreTypes.OBJECT_TYPE_LOG,
        Location: CoreTypes.OBJECT_TYPE_LOCATION,
        Snapshot: CoreTypes.OBJECT_TYPE_SNAPSHOT,
    };

    /**
     * Determines whether the given object has the shape of a concrete subtype
     * of CoatyObject, i.e. satisfies either the concrete interface defined by the
     * object's coreType property or the specified coreType parameter.
     * @param obj any
     * @param coreType a framework core type to check for (optional)
     */
    static isObject(obj: any, coreType?: CoreType): boolean {
        if (coreType) {
            return CoreTypes._isAssignable(obj, coreType);
        }
        return obj && typeof obj === "object" && typeof obj.coreType === "string" &&
            CoreTypes._isAssignable(obj, obj.coreType);
    }

    /**
     * Returns the given object if has the shape of a concrete subtype
     * of CoatyObject, i.e. satisfies the concrete interface defined by the
     * object's coreType property or the specified coreType parameter.
     * Otherwise, undefined is returned.
     * @param obj any
     * @param coreType a framework core type to check for (optional)
     */
    static asObject(obj: any, coreType?: CoreType): CoatyObject {
        if (coreType) {
            return CoreTypes._assignableAs(obj, coreType);
        }
        if (obj && typeof obj.coreType === "string") {
            return CoreTypes._assignableAs(obj, obj.coreType);
        }
        return undefined;
    }

    /**
     * Determines whether the specified value is an array of non-empty strings.
     * @param obj any
     */
    static isStringArray(obj: any) {
        return Array.isArray(obj) &&
            (<string[]>obj).every(o => o && typeof o === "string" && o.length > 0);
    }

    /**
     * Determines whether the specified value is an array of CoreType strings.
     * @param obj
     */
    static isCoreTypeArray(obj: any) {
        return this.isStringArray(obj) &&
            (<string[]>obj).every(t => !!CoreTypes._coreTypesMap[t]);
    }

    /**
     * Determines whether the specified value is an array of objects
     * of the given core type(s) or of the core type specified on each object.
     * @param obj any
     * @param coreType a framework core type or an array of core types
     */
    static isObjectArray(obj: any, coreType?: CoreType | CoreType[]) {
        const isTypesArray = Array.isArray(coreType);
        return Array.isArray(obj) &&
            (<any[]>obj).every(o => {
                if (isTypesArray) {
                    return (<any[]>coreType).some(t => CoreTypes.isObject(o, t));
                }
                return CoreTypes.isObject(o, coreType as CoreType);
            });
    }

    /**
     * Gets an array of all defined framework core types.
     */
    static getCoreTypes() {
        const coreTypes = [];
        Object.keys(CoreTypes._coreTypesMap).forEach(t => coreTypes.push(t));
        return coreTypes;
    }

    /**
     * Gets the object type for the given core type.
     * @param coreType a core type
     */
    static getObjectTypeFor(coreType: CoreType) {
        return CoreTypes._coreTypesMap[coreType];
    }

    /**
     * Gets the core type for the given core object type, or
     * `undefined` if the given object type doesn't represent a 
     * core object.
     * 
     * @param objectType an object type string
     */
    static getCoreTypeFor(objectType: string) {
        for (const coreType in CoreTypes._coreTypesMap) {
            if (CoreTypes._coreTypesMap.hasOwnProperty(coreType)) {
                if (CoreTypes._coreTypesMap[coreType] === objectType) {
                    return coreType;
                }
            }
        }
        return undefined;
    }

    /**
     * Determines whether the given type string defines a framework core type.
     * @param type a type string
     */
    static isCoreType(type: string) {
        return !!CoreTypes._coreTypesMap[type];
    }

    /**
     * Determines whether the given type string defines a framework core object type.
     * @param type a type string
     */
    static isCoreObjectType(type: string) {
        return Object.keys(CoreTypes._coreTypesMap).some(coreType => CoreTypes._coreTypesMap[coreType] === type);
    }

    /**
     * Returns a deep copy of the specified `CoatyObject` according to JSON conventions. If the object passed in
     * is `undefined`, `undefined` is returned. Note that all (own and inherited) enumerable properties of the 
     * given object are copied, not only the properties defined in the interface definition of the corresponding 
     * core type. Properties are copied according to JSON data type conventions. In effect, this clone method 
     * always yields the same result as `JSON.parse(JSON.stringify(obj))`.
     * 
     * Note: by default the passed in argument is validated to conform to a framework core type.
     * This method throws a TypeError if the given argument is not a valid CoatyObject.
     * To skip this validation test, use the `shouldSkipValidation` argument.
     *
     * @param obj a CoatyObject to clone or undefined
     */
    static clone<T extends CoatyObject>(obj: T, shouldSkipValidation = false): T {
        if (obj === undefined) {
            return undefined;
        }

        if (!shouldSkipValidation && !CoreTypes.isObject(obj)) {
            throw new TypeError(`CoreTypes.clone: argument 'obj' is not a valid CoatyObject: ${JSON.stringify(obj)}`);
        }

        return clone(obj);
    }

    /**
     * Determines wether the given parameter is a Date
     * @param obj any
     */
    static isDate(obj: any) {
        return obj &&
            ((obj instanceof Date && isFinite(obj.getTime())) ||
                typeof obj === "string");
    }

    /**
     * Determines whether the given object has the shape of the given subtype
     * of CoatyObject, i.e. satisfies the concrete interface defined by the
     * object's coreType property.
     * @param obj any
     * @param coreType a framework core type
     */
    private static _isAssignable(obj: any, coreType: CoreType): boolean {
        switch (coreType) {
            case "CoatyObject":
                return CoreTypes._isObject(obj);
            case "User":
                return CoreTypes._isUser(obj);
            case "Device":
                return CoreTypes._isDevice(obj);
            case "Annotation":
                return CoreTypes._isAnnotation(obj);
            case "Task":
                return CoreTypes._isTask(obj);
            case "IoSource":
                return CoreTypes._isIoSource(obj);
            case "IoActor":
                return CoreTypes._isIoActor(obj);
            case "Component":
                return CoreTypes._isComponent(obj);
            case "Config":
                return CoreTypes._isConfig(obj);
            case "Log":
                return CoreTypes._isLog(obj);
            case "Location":
                return CoreTypes._isLocation(obj);
            case "Snapshot":
                return CoreTypes._isSnapshot(obj);

            default:
                return false;
        }
    }

    /**
     * Returns the given object if it is assignable to the given
     * framework core type. Otherwise, undefined is returned.
     * @param obj any
     * @param coreType a framework core type
     */
    private static _assignableAs(obj: any, coreType: CoreType): CoatyObject {
        if (CoreTypes._isAssignable(obj, coreType)) {
            return obj as CoatyObject;
        }
        return undefined;
    }

    // Type checkers for framework core types

    private static _isObject(obj: any) {
        return obj &&
            typeof obj === "object" &&
            typeof obj.name === "string" &&
            typeof obj.objectType === "string" &&
            obj.objectType.length > 0 &&
            typeof obj.coreType === "string" &&
            CoreTypes.isCoreType(obj.coreType) &&
            typeof obj.objectId === "string" &&
            obj.objectId.length > 0 &&
            (obj.parentObjectId === undefined ||
                (typeof obj.parentObjectId === "string" &&
                    obj.parentObjectId.length > 0)) &&
            (obj.assigneeUserId === undefined ||
                (typeof obj.assigneeUserId === "string" &&
                    obj.assigneeUserId.length > 0)) &&
            (obj.externalId === undefined ||
                (typeof obj.externalId === "string" &&
                    obj.externalId.length > 0)) &&
            (obj.locationId === undefined ||
                (typeof obj.locationId === "string" &&
                    obj.locationId.length > 0)) &&
            (obj.isDeactivated === undefined ||
                typeof obj.isDeactivated === "boolean");
    }

    private static _isUser(obj: any) {
        return CoreTypes._isObject(obj) &&
            obj.coreType === "User" &&
            CoreTypes._isScimNames(obj.names) &&
            (obj.displayName === undefined || typeof obj.displayName === "string") &&
            (obj.nickName === undefined || typeof obj.nickName === "string") &&
            (obj.title === undefined || typeof obj.title === "string") &&
            (obj.userType === undefined || typeof obj.userType === "string") &&
            (obj.preferredLanguage === undefined || typeof obj.preferredLanguage === "string") &&
            (obj.locale === undefined || typeof obj.locale === "string") &&
            (obj.timezone === undefined || typeof obj.timezone === "string") &&
            (obj.active === undefined || typeof obj.active === "boolean") &&
            (obj.password === undefined || typeof obj.password === "string") &&
            (obj.emails === undefined || CoreTypes._isScimMultiValuedAttributes(obj.emails)) &&
            (obj.phoneNumbers === undefined || CoreTypes._isScimMultiValuedAttributes(obj.phoneNumbers)) &&
            (obj.ims === undefined || CoreTypes._isScimMultiValuedAttributes(obj.ims)) &&
            (obj.photos === undefined || CoreTypes._isScimMultiValuedAttributes(obj.photos)) &&
            (obj.addresses === undefined || CoreTypes._isScimAddresses(obj.addresses)) &&
            (obj.groups === undefined || CoreTypes._isScimMultiValuedAttributes(obj.groups)) &&
            (obj.entitlements === undefined || Array.isArray(obj.entitlements)) &&
            (obj.roles === undefined || CoreTypes.isStringArray(obj.roles)) &&
            (obj.x509Certificates === undefined || CoreTypes.isStringArray(obj.x509Certificates));
    }

    private static _isScimNames(names: any) {
        return names &&
            typeof names === "object" &&
            (names.formatted === undefined ||
                (typeof names.formatted === "string" &&
                    names.formatted.length > 0)) &&
            (names.familyName === undefined ||
                typeof names.familyName === "string") &&
            (names.givenName === undefined ||
                typeof names.givenName === "string") &&
            ((names.familyName !== undefined &&
                names.givenName !== undefined) ||
                (names.familyName === undefined &&
                    names.givenName === undefined)) &&
            (!(names.formatted === undefined &&
                names.familyName === undefined)) &&
            (names.middleName === undefined ||
                typeof names.middleName === "string") &&
            (names.honorificPrefix === undefined ||
                typeof names.honorificPrefix === "string") &&
            (names.honorificSuffix === undefined ||
                typeof names.honorificSuffix === "string");
    }

    private static _isScimMultiValuedAttribute(attr: any) {
        return attr && typeof attr === "object" &&
            typeof attr.type === "string" && typeof attr.value === "string" &&
            (attr.primary === undefined || typeof attr.primary === "boolean") &&
            (attr.display === undefined || typeof attr.display === "string");
    }

    private static _isScimMultiValuedAttributes(attrs: any) {
        return Array.isArray(attrs) &&
            (<any[]>attrs).every(attr => CoreTypes._isScimMultiValuedAttribute(attr));
    }

    private static _isScimAddresses(obj: any) {
        return Array.isArray(obj) &&
            (<any[]>obj).every(o => {
                return CoreTypes._isScimMultiValuedAttribute(o) &&
                    (o.formatted === undefined || typeof o.formatted === "string") &&
                    (o.streetAddress === undefined || typeof o.streetAddress === "string") &&
                    (o.locality === undefined || typeof o.locality === "string") &&
                    (o.region === undefined || typeof o.region === "string") &&
                    (o.postalCode === undefined || typeof o.postalCode === "string") &&
                    (o.country === undefined || typeof o.country === "string");
            });
    }

    private static _isDevice(obj: any) {
        return CoreTypes._isObject(obj) &&
            obj.coreType === "Device" &&
            typeof obj.displayType === "number" &&
            DisplayType[obj.displayType] !== undefined &&
            (obj.ioCapabilities === undefined ||
                CoreTypes.isObjectArray(obj.ioCapabilities, ["IoSource", "IoActor"]));
    }

    private static _isAnnotation(obj: any) {
        return CoreTypes._isObject(obj) &&
            obj.coreType === "Annotation" &&
            typeof obj.type === "number" &&
            AnnotationType[obj.type] !== undefined &&
            typeof obj.creatorId === "string" &&
            obj.creatorId.length > 0 &&
            typeof obj.creationTimestamp === "number" &&
            typeof obj.status === "number" &&
            AnnotationStatus[obj.status] !== undefined &&
            (obj.variants === undefined ||
                (Array.isArray(obj.variants) &&
                    (<any[]>obj.variants).every(o =>
                        o &&
                        (typeof o === "object") &&
                        (typeof o.variant === "string") &&
                        o.variant.length > 0 &&
                        (typeof o.downloadUrl === "string"))));
    }

    private static _isTask(obj: any) {
        return CoreTypes._isObject(obj) &&
            obj.coreType === "Task" &&
            typeof obj.creatorId === "string" &&
            obj.creatorId.length > 0 &&
            typeof obj.creationTimestamp === "number" &&
            (obj.startTimestamp === undefined ||
                typeof obj.startTimestamp === "number") &&
            (obj.duration === undefined ||
                typeof obj.duration === "number") &&
            typeof obj.status === "number" &&
            TaskStatus[obj.status] !== undefined &&
            (obj.requirements === undefined ||
                CoreTypes.isStringArray(obj.requirements)) &&
            (obj.description === undefined ||
                typeof obj.description === "string") &&
            (obj.workflowId === undefined ||
                (typeof obj.workflowId === "string" &&
                    obj.workflowId.length > 0));
    }

    private static _isIoSource(obj: any) {
        return CoreTypes._isObject(obj) &&
            obj.coreType === "IoSource" &&
            typeof obj.valueType === "string" &&
            obj.valueType.length > 0 &&
            (obj.externalTopic === undefined ||
                typeof obj.externalTopic === "string") &&
            (obj.updateRate === undefined ||
                (typeof obj.updateRate === "number" &&
                    obj.updateRate >= 0)) &&
            (obj.updateStrategy === undefined ||
                (typeof obj.updateStrategy === "number" &&
                    IoSourceBackpressureStrategy[obj.updateStrategy] !== undefined));
    }

    private static _isIoActor(obj: any) {
        return CoreTypes._isObject(obj) &&
            obj.coreType === "IoActor" &&
            typeof obj.valueType === "string" &&
            obj.valueType.length > 0 &&
            (obj.externalTopic === undefined ||
                typeof obj.externalTopic === "string") &&
            (obj.updateRate === undefined ||
                (typeof obj.updateRate === "number" &&
                    obj.updateRate >= 0)) &&
            (obj.useRawIoValues === undefined ||
                typeof obj.useRawIoValues === "boolean");
    }

    private static _isComponent(obj: any) {
        return CoreTypes._isObject(obj) &&
            obj.coreType === "Component";
    }

    private static _isConfig(obj: any) {
        return CoreTypes._isObject(obj) &&
            obj.coreType === "Config" &&
            typeof obj.targetId === "string" &&
            obj.targetId.length > 0 &&
            (obj.shouldAssociateUser === undefined ||
                (obj.shouldAssociateUser === true &&
                    CoreTypes._isUser(obj.associatedUser)) ||
                (obj.shouldAssociateUser === false &&
                    obj.associatedUser === undefined));
    }

    private static _isLog(obj: any) {
        return CoreTypes._isObject(obj) &&
            obj.coreType === "Log" &&
            typeof obj.logLevel === "number" &&
            LogLevel[obj.logLevel] !== undefined &&
            typeof obj.logMessage === "string" &&
            typeof obj.logDate === "string" &&
            (obj.logHost === undefined || CoreTypes._isLogHost(obj.logHost));
    }

    private static _isLogHost(obj: any) {
        return obj &&
            typeof obj === "object" &&
            (obj.agentInfo === undefined || CoreTypes._isAgentInfo(obj.agentInfo)) &&
            (obj.pid === undefined || typeof obj.pid === "number") &&
            (obj.hostname === undefined || typeof obj.hostname === "string") &&
            (obj.userAgent === undefined || typeof obj.userAgent === "string");
    }

    private static _isAgentInfo(obj: any) {
        return obj &&
            typeof obj === "object" &&
            (obj.packageInfo &&
                typeof obj.packageInfo === "object" &&
                typeof obj.packageInfo.name === "string" &&
                typeof obj.packageInfo.version === "string") &&
            (obj.buildInfo &&
                typeof obj.buildInfo === "object" &&
                typeof obj.buildInfo.buildDate === "string" &&
                typeof obj.buildInfo.buildMode === "string") &&
            (obj.configInfo &&
                typeof obj.configInfo === "object" &&
                typeof obj.configInfo.serviceHost === "string");
    }

    private static _isLocation(obj: any) {
        return CoreTypes._isObject(obj) &&
            obj.coreType === "Location" &&
            obj.geoLocation &&
            typeof obj.geoLocation === "object" &&
            typeof obj.geoLocation.timestamp === "number" &&
            obj.geoLocation.coords &&
            typeof obj.geoLocation.coords === "object" &&
            typeof obj.geoLocation.coords.latitude === "number" &&
            typeof obj.geoLocation.coords.longitude === "number" &&
            typeof obj.geoLocation.coords.accuracy === "number" &&
            (obj.geoLocation.coords.altitude === undefined ||
                typeof obj.geoLocation.coords.altitude === "number") &&
            (obj.geoLocation.coords.altitudeAccuracy === undefined ||
                typeof obj.geoLocation.coords.altitudeAccuracy === "number") &&
            (obj.geoLocation.coords.heading === undefined ||
                typeof obj.geoLocation.coords.heading === "number") &&
            (obj.geoLocation.coords.speed === undefined ||
                typeof obj.geoLocation.coords.speed === "number");
    }

    private static _isSnapshot(obj: any) {
        return CoreTypes._isObject(obj) &&
            // Check parentObjectId is set as this is mandatory for a snapshot
            (typeof obj.parentObjectId === "string" &&
                obj.parentObjectId.length > 0) &&
            obj.coreType === "Snapshot" &&
            obj.creationTimestamp &&
            typeof obj.creationTimestamp === "number" &&
            obj.creatorId &&
            typeof obj.creatorId === "string" &&
            obj.creatorId.length > 0 &&
            (obj.tags === undefined ||
                CoreTypes.isStringArray(obj.tags)) &&
            CoreTypes.isObject(obj.object);
    }
}
