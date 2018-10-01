/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

import { CoatyObject } from "./object";

/**
 * Object model representing location information
 * including geolocation according to W3C Geolocation API Specification.
 * 
 * This interface can be extended to allow additional attributes 
 * that provide other information about this position (e.g. street address,
 * shop floor number, etc.).
 */
export interface Location extends CoatyObject {

    coreType: "Location";

    /**
     * Represents geolocation information according to W3C Geolocation API Specification.
     */
    geoLocation: GeoLocation;
}

/**
 * Represents geolocation information according to W3C Geolocation 
 * API Specification.
 * 
 * This version of the specification allows one attribute of 
 * type GeoCoordinates and a timestamp.
 */
export interface GeoLocation {

    /**
     * Contains a set of geographic coordinates together with their associated 
     * accuracy, as well as a set of other optional attributes such as altitude 
     * and speed.
     */
    coords: GeoCoordinates;

    /**
     * Represents the time when the GeoLocation object was acquired 
     * and is represented as a number of milliseconds, either as an absolute time 
     * (relative to some epoch) or as a relative amount of time.
     */
    timestamp: number;
}

/** 
 * Represent geographic coordinates. The reference system used by the properties 
 * in this interface is the World Geodetic System (2d) [WGS84]. 
 */
export interface GeoCoordinates {

    /**
     * The latitude is a geographic coordinate specified in decimal degrees.
     */
    latitude: number;

    /**
     * The longitude is a geographic coordinates specified in decimal degrees.
     */
    longitude: number;

    /**
     * The altitude attribute (optional) denotes the height of the position, specified in meters 
     * above the [WGS84] ellipsoid. If the implementation cannot provide altitude 
     * information, the value of this attribute must be undefined.
     */
    altitude?: number;

    /**
     * The accuracy attribute denotes the accuracy level of the latitude and longitude 
     * coordinates. It is specified in meters and must be supported by all implementations. 
     * The value of the accuracy attribute must be a non-negative real number.
     */
    accuracy: number;

    /**
     * The altitudeAccuracy attribute (optional) is specified in meters. If the implementation 
     * cannot provide altitude information, the value of this attribute must be undefined. 
     * Otherwise, the value of the altitudeAccuracy attribute must be a non-negative real number.
     */
    altitudeAccuracy?: number;

    /**
     * The heading attribute denotes the direction of travel of the hosting device and is 
     * specified in degrees, where 0° ≤ heading < 360°, counting clockwise relative to the 
     * true north. If the implementation cannot provide heading information, the value of 
     * this attribute must be undefined. If the hosting device is stationary (i.e. the value 
     * of the speed attribute is 0), then the value of the heading attribute must be NaN.  
     */
    heading?: number;

    /**
     * The speed attribute denotes the magnitude of the horizontal component of the hosting 
     * device's current velocity and is specified in meters per second. If the implementation 
     * cannot provide speed information, the value of this attribute must be undefined. Otherwise, 
     * the value of the speed attribute must be a non-negative real number.
     */
    speed?: number;

}
