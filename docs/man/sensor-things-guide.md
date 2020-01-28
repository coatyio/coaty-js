---
layout: default
title: Coaty JS Documentation
---

# Sensor Things in Coaty Applications

## Table of Contents

* [Sensor Things Types](#sensor-things-types)
  * [Thing](#thing)
  * [Location](#location)
  * [Sensor](#sensor)
  * [Observation](#observation)
  * [Feature of Interest](#feature-of-interest)
* [Sensor Things Additional Objects and Types](#sensor-things-additional-objects-and-types)
  * [Unit of Measurement](#unit-of-measurement)
  * [Observed Property](#observed-property)
  * [Encoding Type](#encoding-type)
  * [Observation Type](#observation-type)
* [Controllers](#controllers)
  * [Sensor Source Controller](#sensor-source-controller)
  * [Thing Observer Controller](#thing-observer-controller)
  * [Sensor Observer Controller](#sensor-observer-controller)
  * [Thing Sensor Observation Observer Controller](#thing-sensor-observation-observer-controller)
  * [Discovering Sensor Things](#discovering-sensor-things)
  * [Detecting online and offline state of Sensor Things agents](#detecting-online-and-offline-state-of-sensor-things-agents)

## Sensor Things Types

Sensor Things objects are inspired by the
[OGC SensorThings API](http://docs.opengeospatial.org/is/15-078r6/15-078r6.html). The Coaty
implementation, however, heavily simplifies the
[entity schema](http://docs.opengeospatial.org/is/15-078r6/15-078r6.html#24) that is specified in the
OGC specification:

```
   ________________________________                      _____________________________________
  |            Sensor              |                    |              Observation            |
  |--------------------------------| 1 +parentObjectId  |-------------------------------------|
  | coreType: CoatyObject          |<-------------------| coreType: CoatyObject               |
  | objectType: OBJECT_TYPE_SENSOR |                    | objectType: OBJECT_TYPE_OBSERVATION |
  |________________________________|                    |_____________________________________|
                            |                                    |
                            | 1 +parentObjectId                  | 0..1 +featureOfInterestId
  0..1 +parentObjectId      |                                    |
   +-------------+          |               +--------------------+
   |             |          |               |                    |
   |     ________|__________v___________    |    ________________v____________________________
   +--> |            Thing              |   |   |              FeatureOfInterest               |
        |-------------------------------|   |   |---------------------------------------------|
        | coreType: CoatyObject         |   |   | coreType: CoatyObject                       |
        | objectType: OBJECT_TYPE_THING |   |   | objectType: OBJECT_TYPE_FEATURE_OF_INTEREST |
        |_______________________________|   |   |_____________________________________________|
              |                             |
              | 0..1 +locationId            |
              |                             |
         _____v___________________          |
        |        Location         |<--------+
        |------------------------ |
        | coreType: Location      |
        |_________________________|

```

All the displayed objects in the diagram are Coaty objects. Except `Location`, all other objects are
application objects and therefore defined by their unique `objectType`. Like with all Coaty objects,
sensor things objects can be advertised, discovered, queried, and updated.

### Thing

According to the OCG, a Thing is:

> The OGC SensorThings API follows the ITU-T definition, i.e.,
> with regard to the Internet of Things, a thing is an object
> of the physical world (physical things) or the information
> world (virtual things) that is capable of being identified
> and integrated into communication networks [ITU-T Y.2060].

[Link to official Thing specification](http://docs.opengeospatial.org/is/15-078r6/15-078r6.html#25)

For instance, a RapberryPI can be a Thing.

A Thing defines the following properties:

```ts
{
    name: string,
    objectType: SensorThingsTypes.OBJECT_TYPE_THING,
    coreType: "CoatyObject",
    objectId: Uuid,
    description: string,
    properties?: { [key: string]: any; },
    locationId?: Uuid
}
```

The `name` property is a label for the Thing.

The `description` property is a short description of the corresponding Thing.

The `properties` attribute is a Javascript object, supposed to contain properties
as key-value pairs. For instance, `{'model': '410F', 'power': '7W'}` is a valid
`properties` object.

The `locationId` property is optional and can reference a Coaty Location object
that locates the Thing.

**Note:** Unlike the OGC standard, the Coaty Thing does not have historical locations.
In case of a location change, you can generate snapshots and track the changes by
listening to them. You can use a specific tag for these snapshots to query them easily.

### Location

Coaty reuses the core type `Location` for SensorThings instead of creating a new
type. OGC defines location as:

> The Location locates the Thing or the Things it associated with.
> A Thing’s Location is defined as the last known location of the Thing.
>
> A Thing’s Location may be identical to the Thing’s Observations' FeatureOfInterest.

[Link to official Location specification](http://docs.opengeospatial.org/is/15-078r6/15-078r6.html#26)

### Sensor

A Coaty sensor is an instrument that observes and measures a single property and
provides these observations of the same type. As a consequence, it is the merged form of
OGC's Sensor, Datastream and ObservedProperty.

OGC defines these three terms as the following:

> A Datastream groups a collection of Observations measuring the same
> ObservedProperty and produced by the same Sensor.

[Link to official Datastream specification](http://docs.opengeospatial.org/is/15-078r6/15-078r6.html#28)

> A Sensor is an instrument that observes a property or phenomenon with the
> goal of producing an estimate of the value of the property.

[Link to official Sensor specification](http://docs.opengeospatial.org/is/15-078r6/15-078r6.html#29)

> An ObservedProperty specifies the phenomenon of an Observation.

[Link to official Observed Property specification](http://docs.opengeospatial.org/is/15-078r6/15-078r6.html#30)

As a result of the merge of these three terms, Coaty allows a single Sensor to only provide one
type of data (of one single observed property) and one Sensor to be used by a single Thing. This is
done in the sake of simplification of the whole system.

A Sensor defines the following properties:

```ts
{
    name: string,
    objectType: SensorThingsTypes.OBJECT_TYPE_SENSOR,
    coreType: "CoatyObject",
    objectId: Uuid,
    parentObjectId: Uuid,
    description: string,
    unitOfMeasurement: UnitOfMeasurement,
    observationType: ObservationType,
    observedArea?: Polygon,
    phenomenonTime?: TimeInterval,
    resultTime?: TimeInterval,
    observedProperty: ObservedProperty,
    encodingType: SensorEncodingType,
    metadata: any
}
```

The `unitOfMeasurement` property  is the unit of the datastream, matching UCUM convention. See details
[here](#unit-of-measurement),

The `observationType` property is a reference to one Observation Type as defined in
[http://www.opengis.net/def/observationType/OGC-OM/2.0/](http://www.opengis.net/def/observationType/OGC-OM/2.0/).
Expected values are described in [Observation Type](#observation-type) paragraph.

The `observedArea` property is a [GeoJSON Polygon](https://tools.ietf.org/html/rfc7946#section-3.1.6) describing
the spatial bounding of all FeaturesOfInterest that belong to the Observations associated with this Datastream.
For instance this is a valid GeoJson object:

```ts
{
    "type": "Polygon",
    "coordinates": [
        [
            [100,0],
            [101,0],
            [101,1],
            [100,1],
            [100,0]
        ]
    ]
}
```

The `phenomenonTime` property is the temporal interval of the phenomenon times of all observations belonging
to this Sensor. TimeInterval interface is defined in `@coaty/core`.

The `resultTime` property is the temporal interval of the result times of all observations belonging to this
Sensor. TimeInterval interface is defined in `@coaty/core`.

The `parentObjectId` property is the objectId of the Thing associated to this Sensor.

The `observedProperty`  property is the property that is observed at all observations. The Observations of
different Sensors may observe the same observed property. See [Observed Property](#observed-property) paragraph for
more details.

The `encodingType` property defines the encoding type of `metadata` property. Allowed types are described
in [Encoding Type](#encoding-type) paragraph.

The `metadata` property can store a detailed description of the sensor or the system.

### Observation

According to OGC:

> An Observation is the act of measuring or otherwise determining the value
> of a property [OGC 10-004r3 and ISO 19156:2011]

[Link to official Observation specification](http://docs.opengeospatial.org/is/15-078r6/15-078r6.html#31)

An Observation defines the following properties:

```ts
{
    name: string,
    objectType: SensorThingsTypes.OBJECT_TYPE_OBSERVATION,
    coreType: "CoatyObject",
    objectId: Uuid,
    parentObjectId: Uuid,
    phenomenonTime: number,
    result: any,
    resultTime: number,
    resultQuality?: string[],
    validTime?: TimeInterval,
    parameters?: { [key: string]: any; },
    featureOfInterestId?: Uuid
}
```

The `parentObjectId` property is the objectId of the Sensor which emitted this Observation.

The `phenomenonTime` property is the time instant or period when the Observation happens.

The `result` property is the estimated value of an ObservedProperty from the
Observation. It depends on the observationType defined in the associated Sensor.

The `resultTime` property is the time instant when the Observation result was generated.

The `resultQuality` property describes the quality of the result.

**Note :** `resultQuality` is supposed to be of type [DQ_Element](https://geo-ide.noaa.gov/wiki/index.php?title=DQ_Element).
However DQ\_Element is a class composed of many subclasses, thus it would be a large piece of code for a minor feature.
As long as even the [OGC test suite](https://github.com/opengeospatial/ets-sta10/search?q=resultquality) considered it
as a string, so do we.

The `validTime` property is an optional property which describes the time period during which the result may be used.
It uses the time interval interface defined in `@coaty/core`.

The `parameters` property is an optional Javascript object, containing the environmental conditions during measurement
as key-value pairs. For instance, `{'battery': '0.55', 'uptime': '86400'}` is a valid `parameters` object.

The `featureOfInterestId` property is an optional reference to the observed feature of interest. This can both be a
FeatureOfInterest object or a Location.

### Feature of Interest

According to OGC:

> An Observation results in a value being assigned to a phenomenon. The phenomenon
> is a property of a feature, the latter being the FeatureOfInterest of the Observation
> [OGC and ISO 19156:2011]. In the context of the Internet of Things, many Observations’
> FeatureOfInterest can be the Location of the Thing. For example, the FeatureOfInterest of
> a wifi-connect thermostat can be the Location of the thermostat (i.e., the living room
> where the thermostat is located in). In the case of remote sensing, the FeatureOfInterest
> can be the geographical area or volume that is being sensed.

[Link to the official Feature of Interest specification](http://docs.opengeospatial.org/is/15-078r6/15-078r6.html#32)

A FeatureOfInterest defines the following properties:

```ts
{
    name: string,
    objectType: SensorThingsTypes.OBJECT_TYPE_FEATURE_OF_INTEREST,
    coreType: "CoatyObject",
    description: string,
    encodingType: EncodingType,
    metadata: any
}
```

The `description` property is a description about the FeatureOfInterest.

The `encodingType` property defines the data type of the feature property.

The `metadata` property is a detailed description of the feature.

## Sensor Things Additional Objects and Types

Here is a list of objects and types used in SensorThings API that are not Coaty objects.

### Unit of Measurement

A unit of measurement is a Json object containing three key-value pairs:

* The name property presents the full name of the unitOfMeasurement.
* The symbol property shows the textual form of the unit symbol.
* and the definition contains the URI defining the unitOfMeasurement.

Values of these properties SHOULD follow the Unified Code for Unit of Measure (UCUM).

```ts
{
  name: "Celsius",
  symbol: "degC",
  definition: "http://www.qudt.org/qudt/owl/1.0.0/unit/Instances.html#DegreeCelsius"
}
```

[http://www.qudt.org/qudt/owl/1.0.0/unit/Instances.html](http://www.qudt.org/qudt/owl/1.0.0/unit/Instances.html)

A unit of measurement itself cannot be undefined, however, it's fields can be for instance when there
is an observation of type truth.

### Observed Property

According to OGC:

> An ObservedProperty specifies the phenomenon of an Observation.

An observed property is a simple interface and defines the following properties:

```ts
{
    name: string,
    description: string,
    definition: string
}
```

For instance the temperature is a valid observed property:

```ts
{
    name: "DewPoint Temperature",
    description: "The dewpoint temperature is the temperature to which the air must be cooled, at constant pressure, for dew to form.",
    definition: "http://dbpedia.org/page/Dew_point",
}
```

The `definition` property expects a reference to an ontology, e.g. as defined [here](http://www.qudt.org).

### Encoding Type

Encoding Type is used by `encodingType` properties to describe the encoding type of another property. Technically,
one can have any kind of encoding types as it also takes generic strings. However, there are some certain predefined
encoding types.

Sensors use SensorEncodingType, which have some custom values defined in SensorEncodingTypes object:

* `undefined`: An empty encoding type.
* `application/pdf` because  most sensor manufacturers provide their sensor datasheets in a PDF format.
* `http://www.opengis.net/doc/IS/SensorML/2.0` sensorML for sensors using the sensorML specification.

The general EncodingType value is derived from SensorEncodingType and is used with FeatureOfInterests. As the feature
of interest can also be the sensor itself, it can use the SensorEncodingTypes. In addition, EncodingTypes object
also has the following type:

* `application/vnd.geo+json` the only supported type for locations, defining it in latitude and longitudes.

### Observation Type

Observation Type is used by `Sensor.observationType` to describe the type which
is used  by the service to encode observations.

Expected values come from [OGC OM
specification](http://www.opengis.net/def/observationType/OGC-OM/2.0/). Refer to
their respective documentation for more information.

| ObservationTypes | Content of result |
|------------------|-------------------|
| [CATEGORY](http://www.opengis.net/def/observationType/OGC-OM/2.0/OM_CategoryObservation) | URI |
| [COUNT](http://www.opengis.net/def/observationType/OGC-OM/2.0/OM_CountObservation) | integer |
| [MEASUREMENT](http://www.opengis.net/def/observationType/OGC-OM/2.0/OM_Measurement) | double |
| [ANY](http://www.opengis.net/def/observationType/OGC-OM/2.0/OM_Observation) | any JSON data |
| [TRUTH](http://www.opengis.net/def/observationType/OGC-OM/2.0/OM_TruthObservation) | boolean |

## Controllers

SensorThings provide some controllers with some convenience methods for use. These controllers are
split in two groups: source and observer controllers. The source controllers are designed to
be used by sensor data producers to provide the SensorThings objects whereas the observer controllers
should be used by sensor data consumers.

### Sensor Source Controller

`SensorSourceController` controls Sensors that are registered with it and allows them to
publish observations in real-time by either channeling or advertising them. The controller
reads the value of the Sensor by its hardware interface defined as a `SensorIo`. SensorIo
is the hardware-level communication interface that provides an async `read` and `write` method
to get and set Sensor values. SensorThings already defines four SensorIo classes:

* `Aio`: Defines an analog sensor with a predefined pin. Reads value using MRAA `pin.read()`.
* `InputGpio`: Defines a digital sensor with a predefined pin. Reads value using MRAA `pin.read()`.
* `OutputGpio`: Defines a digital sensor with a predefined pin. Writes value using MRAA
  `pin.write()`.
* `MockSensorIo`: A mock object that stores the value locally. Allows both read and write.

Note that the `Aio`, `InputGpio`, and `OutputGpio` classes require the `mraa` npm library
to be installed on the board the sensor data is processed. To use any of these classes in your
application (see below), import the definitions as follows:

```ts
import { Aio, InputGpio, OutputGpio } from "@coaty/core/sensor-things/io";
```

Users can also easily define their own SensorIo classes:

```ts
export class CPULoadSensorIo extends SensorIo {
    private _prescaler: number;

    constructor(parameters?: any) {
        this._prescaler = (parameters && parameters.prescaler) || 1;
    }

    read(callback: (value: any) => void) {
        callback(readCPU() * this._prescaler);
    }

    write(value: any) {
        throw new Error("Cannot write on CPU sensor.");
    }
}
```

A Sensor then can be registered to the SensorSourceController with the method
`registerSensor(sensor: Sensor, io: SensorIo)` at runtime. You can also define
Sensors at configuration in the `sensors` option of SensorSourceController. This
option should contain an array of `SensorDefinition`. A `SensorDefinition`
contains the Coaty sensor, the type of SensorIo used and optional parameters.
For instance, we can add a sensor using the above defined `CPUSensorIo` as such:

```ts
// In controller options:
{
    SensorSourceController: {
        sensors: [{
            sensor: {
                name: "CPU Load Sensor",
                objectType: SensorThingsTypes.OBJECT_TYPE_SENSOR,
                coreType: "CoatyObject",
                objectId: "83dfc46a-0709-4f70-9ea5-beebf8fa89af",
                unitOfMeasurement: {
                    name: "Percentage",
                    symbol: "%",
                    definition: "http://www.qudt.org/qudt/owl/1.0.0/unit/Instances.html#Percent"
                },
                observationType: ObservationTypes.MEASUREMENT,
                parentObjectId: "00tt046a-0709-4f70-9ea5-beebf8fa89af",
                observedProperty: {
                    name: "CPU Load",
                    description: "CPU Load",
                    definition: "http://wikipedia.org/page/CPULoad"
                },
                description: "The CPU load of the computer",
                encodingType: SensorEncodingTypes.UNDEFINED,
                metadata: {}
            },
            io: CPULoadSensorIo,
            parameters: {
                prescaler: 1.5
            }
        }]
    }
}
```

When a Sensor is registered, SensorSourceController contains the Sensors in its
memory in SensorContainers, which contain both the Coaty Sensor object and the
SensorIo used with it. You can access a container with
`getSensorContainer(sensorId: Uuid)` method. You can also find all containers
with `registeredSensorContainers()`. You can find a sensor satisfying a
predicate by `findSensor()`.

Once a Sensor is registered, it is advertised (unless `skipSensorAdvertise` is
set in controller options). The controller also starts to listen for Discover
and Query events for this Sensor (unless `ignoreSensorDiscoverEvents` or
`ignoreSensorQueryEvents` options are set in controller options). You can always
unregister a Sensor with `unregisterSensor(sensorId: Uuid)` method. This will
send a Deadvertise event unless `skipSensorDeadvertise` option is set under
controller options. When a Sensor is unregistered, it is no longer resolved or
retrieved.

Once a sensor is registered, you can choose to automatically sample sensor data
from its `SensorIo` and publish observations.

You can also publish observations manually for registered Sensors. You can
decide to channel the observations with `publishChanneledObservation` or
advertise them with `publishAdvertisedObservation`. For each invocation, the
controller will use the `SensorIo` interface of the sensor to read its current
value and create an Observation object with that.

### Thing Observer Controller

ThingObserverController provides three methods to observe Things in a system:

* `discoverThings()`: Sends a Discover event to find all Things in a system. The server should
  implement the counterpart function that listens and reacts to discover events.
* `observeAdvertisedThings()`: Observes advertised Things in the system. The server should
  implement the counterpart function that sends Advertise events when a Thing is created.
* `queryThingsAtLocation(locationId: Uuid)`: Sends a Query event to find all Things in a system
  with the given locationId. The server should implement the counterpart function that sends
  listens and reacts to query events.

### Sensor Observer Controller

SensorObserverController provides methods to observe Sensors in a system and to listen to
their observations.

* `observeChanneledObservations(sensorId: Uuid, channelId?: Uuid)`: Observes the channeled
  observations sent from a Sensor with the given objectId. Normally, the channelId is the
  sensorId and therefore can be omitted. However, the user can define a custom channelId in
  specific cases. This method is designed to be used along with
  `SensorSourceController.publishChanneledObservation`.
* `observeAdvertisedObservations(sensorId: Uuid)`: Observes the advertised observations sent
  from a Sensor with the given objectId. This method is designed to be used along with
  `SensorSourceController.publishAdvertisedObservation`.
* `observeAdvertisedSensors()`: Observes advertised Sensors in the system. This method can
  be used well together with `SensorSourceController` as it advertises every registered
  Sensor unless specified otherwise.
* `discoverSensors()`: Sends a Discover event to find all Sensors in a system. This can be
  used well together with `SensorSourceController` as it listens to Discover events for its
  registered Sensors unless specified otherwise.
* `querySensorsOfThing(thingId: Uuid)`: Sends a Query event to find all Sensors in a system
  with the given parentObjectId (belonging to the given Thing). This can be
  used well together with `SensorSourceController` as it listens to Query events for its
  registered Sensors unless specified otherwise.

### Thing Sensor Observation Observer Controller

`ThingSensorObservationObserverController` observes things and associated sensor and
observation objects, combining the functionality of `ThingObserverController` and
`SensorObserverController`.
This controller is designed to be used by a sensor data consumer that wants to easily handle
sensor-related events as well as sensor observations.

This controller provides the following getters to handle incoming events for sensors, and observations:

* `registeredSensorsChangeInfo$`: Gets an Observable emitting information about
  changes in the currently registered sensors. Registered sensor objects are
  augmented by a property `thing` which references the associated `Thing`
  object. Emitted sensor objects are read-only. If you need to manipulate one,
  e.g. to delete the `thing` property, clone the object first (using `clone()`
  function in `@coaty/core`).
* `sensorObservation$`: Gets an Observable emitting incoming observations on registered
  sensors.

The following filter predicates can be set to further restrict observed things and sensors:

* `thingFilter(filter: (thing: Thing) => boolean)`: Sets a filter predicate that determines whether
  an observed thing is relevant and should be registered with the controller. The filter
  predicate should return `true` if the passed-in thing is relevant; `false` otherwise.
  By default, all observed things are considered relevant.
* `sensorFilter(filter: (sensor: Sensor, thing: Thing) => boolean)`: Sets a filter predicate
  that determines whether an observed sensor is relevant
  and should be registered with the controller. The filter predicate should
  return `true` if the passed-in sensor is relevant; `false` otherwise.
  By default, all observed sensors of all relevant things are considered relevant.

The following example shows how to use this controller to observe sensors and sensor
measurements:

```ts
import { Thing, ThingSensorObservationObserverController } from "@coaty/core/sensor-things";
import { Subscription } from "rxjs";

export class SensorDataObserverController extends ThingSensorObservationObserverController {

    private _sensorsSubscription: Subscription;
    private _observationSubscription: Subscription;

    onInit() {
        super.onInit();
    }

    onCommunicationManagerStarting() {
        super.onCommunicationManagerStarting();

        // Observe sensors
        this._sensorsSubscription = this.observeSensors();

        // Observe incoming sensor measurements
        this._observationSubscription = this.observeObservations();
    }

    onCommunicationManagerStopping() {
        super.onCommunicationManagerStopping();

        this._sensorsSubscription?.unsubscribe();
        this._observationSubscription?.unsubscribe();
    }

    observeSensors() {
        // Monitor information about changes in the currently registered sensors.
        return this.registeredSensorsChangeInfo$.subscribe(changeInfo => {
            console.log("New Sensors added", JSON.stringify(changeInfo.added));
            console.log("Sensors removed", JSON.stringify(changeInfo.removed));
            console.log("Sensors changed", JSON.stringify(changeInfo.changed));
            console.log("Sensors total (after changes)", JSON.stringify(changeInfo.total));

            // Access the Thing objects associated with added/removed/changed/total sensors.
            changeInfo.added.forEach(sensor => console.log(sensor["thing"] as Thing));
            changeInfo.removed.forEach(sensor => console.log(sensor["thing"] as Thing));
            changeInfo.changed.forEach(sensor => console.log(sensor["thing"] as Thing));
            changeInfo.total.forEach(sensor => console.log(sensor["thing"] as Thing));
        });
    }

    observeObservations() {
        // Monitor incoming sensor observations.
        return this.sensorObservation$.subscribe(({ obs, sensor }) => {
            console.log(`Incoming observation for sensor ${sensor.name}: result=${obs.result} phenomenonTime=${obs.phenomenonTime}`);
        });
    }

}
```

### Discovering Sensor Things

You can discover the whole SensorThings network with the help of the provided
controllers and some addditional functions.

```
SensorObserverController                       SensorSourceController
        |                                                |
        | 1) querySensorsOfThing(thingId)                |
        |----------------------------------------------->|
        |                               RETRIEVE Sensors |
        |<-----------------------------------------------'
        |                                                |
        |                                                |
        | 2) observeAdvertisedSensors()                  |
        |                                                |<--- registerSensor()
        |                               ADVERTISE Sensor |
        |<-----------------------------------------------|
        |                                                |<--- unregisterSensor()
        |                             DEADVERTISE Sensor |
        |<-----------------------------------------------|
        |                                                |
        |                                                |
        | 3) observeChanneledObservations()              |
        |----------------------------------------------->|
        |                                                |<--- publishChanneledObservation()
        |                            CHANNEL Observation |
        |<-----------------------------------------------|
```

SensorObserverController and SensorSourceController provide full counter-operative
functionality and cover all necessary methods for Sensors. Applications can use
ThingObserverController to find the Things in the system, however, they should
create their own ThingSourceController to handle the requests from ThingObserverController.

### Detecting online and offline state of Sensor Things agents

To detect the online/offline state of Sensor Things objects, the Deadvertise
event communication pattern in combination with the MQTT last will concept can
be used. To ease programming this pattern, Coaty provides a convenience
controller class named `ObjectLifecycleController`. This is described in detail
in the Coaty Developer Guide under section [*Deadvertise event pattern - an
example*](https://coatyio.github.io/coaty-js/man/developer-guide/#deadvertise-event-pattern---an-example).

Basically, the idea is to set the parent object ID of advertised Thing objects
originating from a specific Coaty sensor agent to the identity ID (or associated
device ID) of the agent's communication manager. In case this agent is
disconnected other agents can observe Deadvertise events and check whether one
of the deadvertised object IDs correlates with the parent object ID of any Thing
objects the agent is managing and invoke specific actions.

---
Copyright (c) 2018 Siemens AG. This work is licensed under a
[Creative Commons Attribution-ShareAlike 4.0 International License](http://creativecommons.org/licenses/by-sa/4.0/).
