---
layout: default
title: Coaty JS Documentation
---

# Coaty Communication Protocol

> This specification conforms to Coaty Communication Protocol Version 3

## Version History

* **Version 3**: complies with Coaty 2, not backward compatible with v2
  * remove readable topic feature
  * change topic structure and topic filters
  * change topic and payload of Update event (removing partial updates)
  * redesign events related to IO routing
* **Version 2**: add Call-Return pattern; backward compatible with v1
* **Version 1**: initial specification

## Table of Contents

* [Introduction](#introduction)
* [Message Topics and Payloads](#message-topics-and-payloads)
* [Events and Event Patterns](#events-and-event-patterns)
* [Topic Structure](#topic-structure)
* [Topic Filters](#topic-filters)
* [Topic Payloads](#topic-payloads)
  * [Payload for Advertise Event](#payload-for-advertise-event)
  * [Payload for Deadvertise Event](#payload-for-deadvertise-event)
  * [Payload for Channel Event](#payload-for-channel-event)
  * [Payloads for Discover - Resolve Event](#payloads-for-discover---resolve-event)
  * [Payloads for Query - Retrieve Event](#payloads-for-query---retrieve-event)
  * [Payloads for Update - Complete Event](#payloads-for-update---complete-event)
  * [Payloads for Call - Return Event](#payloads-for-call---return-event)
  * [Payload for Raw Event](#payload-for-raw-event)
  * [Payload for Associate Event](#payload-for-associate-event)
  * [Payload for IoValue Event](#payload-for-iovalue-event)

## Introduction

Communication between Coaty agents in the Coaty framework is based on
distributed publish-subscribe messaging using an MQTT message broker. A
communication message is comprised of a topic name and a payload. The format of
topic names and payloads conforms to the [MQTT](https://mqtt.org/) Specification
Version 3.1.1.

For publishing messages, subscribing to topics, and for last will messages,
Coaty should support any MQTT Quality of Service level: QoS 0, QoS 1, or QoS 2.
If not specified by a Coaty application, the default QoS level should be 0.

## Message Topics and Payloads

A topic name is structured into topic levels separated by a topic level
separator `/`. A topic name consists of UTF-8 encoded characters except `NULL
(U+0000)`, `# (U+0023)`, and `+ (U+002B)`. A topic name must not contain more
than 65535 UTF-8 encoded bytes. Topic names are case sensitive. Client defined
topic names should not start with a `$` character, it is reserved for broker
usage (e.g. `$SYS/` topics).

Topic filters are used to subscribe to published topics. A topic filter is a
topic name that can contain wildcard tokens for topic levels:

* `#` matches any number of topic levels and sublevels. Only allowed in trailing
  position, e.g. `#`or `/level1/level2/#`
* `+`  matches a single topic level, e.g. `level1/+` matches `level1/` and
  `level/level2` but not `level1`

Within the framework, message payloads are always specified as UTF-8 encoded
strings in JavaScript Object Notation ([JSON](http://www.json.org)) format (see
[RFC 4627](https://www.ietf.org/rfc/rfc4627.txt)). Binary payload formats are
not supported. The reason behind is that messaging should only be used to
transfer object metadata but not content itself, such as multimedia content in
the form of audio, video or documents. To upload or download content data an
appropriate data transfer communication protocol should be used that gets the
target data location (e.g. a URL) from the message payload.

Note that MQTT allows applications to send MQTT Control Packets of size up to
256 MB. For Publish messages, this includes the message topic of size up to 64K,
the payload, as well as some bytes of header data.

> To debug MQTT messages published by a Coaty agent, you can use any MQTT client
> and subscribe to the `coaty/#` topic. We recommend [MQTT
> Explorer](https://mqtt-explorer.com/) or
> [mqtt-spy](https://kamilfb.github.io/mqtt-spy/), both cross-platform clients
> provide graphical user interfaces for message inspection.

## Events and Event Patterns

Coaty provides an essential set of one-way and two-way communication event
patterns to exchange data in a decentralized application:

* **Advertise** an object: broadcast an object to parties interested in objects
  of a specific core or object type.
* **Deadvertise** an object by its unique ID: notify subscribers when capability
  is no longer available; for abnormal disconnection of a party, last will
  concept of Coaty is implemented by sending this event.
* **Channel** Broadcast objects to parties interested in any kind of objects
  delivered through a channel with a specific channel identifier.
* **Discover - Resolve** Discover an object and/or related objects by external
  ID, internal ID, or object type, and receive responses by Resolve events.
* **Query - Retrieve**  Query objects by specifying selection and ordering
  criteria, receive responses by Retrieve events.
* **Update - Complete**  Request or suggest an object update and receive
  accomplishments by Complete events.
* **Call - Return**  Request execution of a remote operation and receive results
  by Return events.
* **Raw** Used to publish and observe topic-specific application data in binary
  format.
* **Associate** Used by IO routing infrastructure to dynamically
  associate/disassociate IO sources with IO actors (see section on "IO routing"
  below).
* **IoValue** Used by IO routing infrastructure to submit IO values from a
  publishing IO source to associated IO actors.

## Topic Structure

Any topic used in the framework comprises the following topic levels:

* **ProtocolName** - the name of the protocol, i.e. `coaty`.
* **ProtocolVersion** - for versioning the communication protocol. The protocol
  version number conforming to this specification is shown at the top of this
  page.
* **Namespace** - namespace used to isolate different Coaty applications.
  Communication events are only routed between agents within a common namespace.
* **Event** - shortcut versions of the predefined events listed above.
* **SourceObjectID** - globally unique ID (UUID) of the event source that is
  publishing a topic, either an agent's identity or that of the related IO
  source.
* **CorrelationID** - UUID that correlates a response message with its request
  message. This level is only present in two-way event patterns, i.e.
  Discover-Resolve, Query-Retrieve, Update-Complete, and Call-Return event
  patterns.

UUIDs (Universally Unique Identifiers) must conform to the UUID version 4 format
as specified in RFC 4122. In the string representation of a UUID the hexadecimal
values "a" through "f" are output as lower case characters.

> **Note**: Raw events and external IO value events do not conform to this topic
> specification. They are published and subscribed on an application-specific
> topic string, which can be any valid MQTT topic.

A topic name for publication is composed as follows:

```
// Publication of one-way event
<ProtocolName>/<ProtocolVersion>/<Namespace>/<Event>/<SourceObjectId>

// Publication of two-way event (both request and response)
<ProtocolName>/<ProtocolVersion>/<Namespace>/<Event>/<SourceObjectId>/<CorrelationId>
```

The ProtocolVersion topic level represents the communication protocol version of
the publishing party, as a positive integer.

To denote event types in the Event topic level, 3-character shortcuts are used:

| Event Type            | Shortcut       |
|-------------------    |--------------- |
| Advertise             | ADV            |
| Deadvertise           | DAD            |
| Channel               | CHN            |
| Associate             | ASC            |
| IoValue               | IOV            |
| Discover              | DSC            |
| Resolve               | RSV            |
| Query                 | QRY            |
| Retrieve              | RTV            |
| Update                | UPD            |
| Complete              | CPL            |
| Call                  | CLL            |
| Return                | RTN            |

The Namespace topic level **must** specify a non-empty string.

When publishing an Advertise event the Event topic level **must** include a
filter of the form: `ADV:<filter>`. The filter must not be empty. It must not
contain the characters `NULL (U+0000)`, `# (U+0023)`, `+ (U+002B)`, and `/
(U+002F)`. Framework implementations specify the core type (`ADV:<coreType>`) or
the object type (`ADV::<objectType>`) of the advertised object (see section
[Topic Payloads](#topic-payloads)) as filter in order to allow subscribers to
listen just to objects of a specific core or object type. To support
subscriptions on both types of filters every Advertise event should be published
twice, once for the core type and once for the object type of the object to be
advertised.

When publishing an Update event the Event topic level **must** include a
filter of the form: `UPD:<filter>`. The filter must not be empty. It must not
contain the characters `NULL (U+0000)`, `# (U+0023)`, `+ (U+002B)`, and `/
(U+002F)`. Framework implementations specify the core type (`UPD:<coreType>`) or
the object type (`UPD::<objectType>`) of the updated object (see section [Topic
Payloads](#topic-payloads)) as filter in order to allow subscribers to listen
just to objects of a specific core or object type. To support subscriptions on
both types of filters every Update event should be published twice, once for the
core type and once for the object type of the object to be updated.

When publishing a Channel event the Event topic level **must** include a channel
identifier of the form: `CHN:<channelId>`. The channel ID must not be empty. It
must not contain the characters `NULL (U+0000)`, `# (U+0023)`, `+ (U+002B)`, and
`/ (U+002F)`.

When publishing a Call event the Event topic level **must** include an operation
name of the form: `CLL:<operationname>`. The operation name must not be empty.
It must not contain the characters `NULL (U+0000)`, `# (U+0023)`, `+ (U+002B)`,
and `/ (U+002F)`.

When publishing an Associate event the Event topic level **must** include an IO
context name of the form: `ASC:<contextName>`. The context name must not be
empty. It must not contain the characters `NULL (U+0000)`, `# (U+0023)`, `+
(U+002B)`, and `/ (U+002F)`.

For any request-response event pattern the receiving party must respond with an
outbound message topic containing the original CorrelationID of the incoming
message topic. Note that the Event topic level of response events **must never**
include a filter field.

## Topic Filters

Each communication client must subscribe to topics according to the defined
topic structure:

```
// Subscription for one-way events
<ProtocolName>/<ProtocolVersion>/<Namespace>/<Event>/+
<ProtocolName>/<ProtocolVersion>/+/<Event>/+

// Subscription for two-way request events
<ProtocolName>/<ProtocolVersion>/<Namespace>/<Event>/+/+
<ProtocolName>/<ProtocolVersion>/+/<Event>/+/+

// Subscription for two-way response events
<ProtocolName>/<ProtocolVersion>/<Namespace>/<Event>/+/<CorrelationID>
<ProtocolName>/<ProtocolVersion>/+/<Event>/+/<CorrelationID>
```

These subscriptions, especially response subscriptions, should be unsubscribed
as soon as they are no longer needed by the agent. Since Coaty uses Reactive
Programming `Observables` to observe communication events, subscription topics
should be unsubscribed whenever the corresponding observable is unsubscribed by
the application.

The Namespace topic level **must** either specify a non-empty string or a
single-level wildcard (`+`), depending on whether the agent should restrict
communication to a given namespace or enable cross-namespacing communication.

When subscribing to a response event, the Event topic level **must not** include
an event filter.

When subscribing to an Advertise event, the Event topic level **must** include
the Advertise filter: `ADV:<filter>` or `ADV::<filter>`.

When subscribing to a Channel event, the Event topic level **must** include the
channel ID: `CHN:<channelId>`.

When subscribing to an Update event, the Event topic level **must** include
the Update filter: `UPD:<filter>` or `UPD::<filter>`.

When subscribing to a Call event, the Event topic level **must** include the
operation name: `CLL:<operationname>`.

When subscribing to an Associate event, the Event topic level **must** include
the IO context name: `ASC:<contextName>`.

When subscribing to a response event, the CorrelationID topic level **must** be
filtered.

## Topic Payloads

A Coaty object is defined by the following generic properties:

```
{
  coreType: "CoatyObject" | ...,
  objectType: string,
  name: string,
  objectId: Uuid,
  externalId?: string,
  parentObjectId?: Uuid,
  locationId?: Uuid,
  isDeactivated?: boolean
}
```

The property `coreType` is the framework core type name of the object; it
corresponds to the name of the interface that defines the object's shape.

The `objectType` property is the concrete type name of the object in a canonical
form. It should be defined using a hierarchical naming pattern with some levels
in the hierarchy separated by periods (`.`, pronounced "dot") to avoid name
collisions, following Java package naming conventions (i.e.
`com.domain.package.Type`). All predefined object types use the form
`coaty.<InterfaceName>`, e.g. `coaty.CoatyObject` (see constants in `CoreTypes`
class). Do not use the reserved toplevel namespace `coaty.*` for your
application defined object types.

The concrete and core type names of all predefined object types are defined as
static properties of the `CoreTypes` class in the framework `model` module.

The `objectId` property defines the unique identity of an object within the system.

The optional `externalId` property defines the identity of an object relative to
an external system, such as the primary key for this object in an external
database. Note that external IDs are not guaranteed to be unique across the
whole universe of system objects. Usually, external IDs are only unique for a
specific type of objects.

The optional `parentObjectId` property refers to the UUID of the parent object.
It is used to model parent-child relationships of objects. For example,
Annotation objects can be modelled as children of target objects they are
attached to.

The optional `locationId` property refers to the UUID of the Location object
that this object is associated with.

The optional `isDeactivated` property marks an object that is no longer used.
The concrete definition meaning of this property is defined by the application.
The property value is optional and defaults to false.

Application specific object types can be defined based on the predefined core
object types by adding additional property-value pairs. Allowed value types must
conform to JSON data types.

### Payload for Advertise Event

An Advertise event accepts this JSON payload:

```js
{
  "object": <object>,
  "privateData": <any>
}
```

The property `privateData` is optional. It contains application-specific
options in the form of an object hash (key-value pairs).

### Payload for Deadvertise Event

A Deadvertise event accepts the following JSON payload:

```js
{ "objectIds": [ UUID1, UUID2, ... ] }
```

The `objectIds` property specifies all objects that should be deadvertised.

### Payload for Channel Event

A Channel event accepts the following JSON payloads:

```js
{
  "object": <object1>,
  "privateData": <any>
}
```

or

```js
{
  "objects": [ <object1>, <object2>, ... ],
  "privateData": <any>
}
```

The property `privateData` is optional. It contains application-specific
options in the form of an object hash (key-value pairs).

### Payloads for Discover - Resolve Event

The Discover pattern is used to resolve an object based on its external ID,
its object ID, or type restrictions. It accepts the following JSON payloads:

```js
{ 
    "externalId": "extId",
    "objectTypes": ["object type", ...],
    "coreTypes": ["core type", ...]
}
```

Discover an object by specifying its external ID (e.g. barcode scan id).
Since external IDs are not guaranteed to be unique, results can be restricted by
one of the specified object types or core types (optional).

```js
{ "objectId": UUID }
```

Discover an object based on its internal UUID.

```js
{ "externalID": "extId", "objectId": objUUID }
```

Discover an object based on its external ID and its internal UUID.
Useful for finding an object with an external representation that is
persisted in an external data store.

```js
{ "objectTypes": ["object type", ...], "coreTypes": ["core type", ...] }
```

Discover an object based on the specified object type or core type.
Exactly one of the properties `objectTypes` or `coreTypes` must
be specified. To discover a series of objects based on type
restrictions and object attribute filtering, use the Query - Retrieve
event pattern.

The Resolve response event accepts the following JSON payloads:

```js
{
  "object": <object>,
  "privateData": <any>
}
```

or

```js
{
  "relatedObjects": [<object>, ...],
  "privateData": <any>
}
```

or

```js
{
  "object": <object>,
  "relatedObjects": [<object>, ...],
  "privateData": <any>
}
```

The property `privateData` is optional. It contains application-specific
options in the form of an object hash (key-value pairs).

### Payloads for Query - Retrieve Event

The Query pattern is used to retrieve objects based on type restrictions and
object attribute filtering and joining:

```js
{
  "objectTypes": ["object type", ...],
  "coreTypes": ["core type", ...],
  "objectFilter": ObjectFilter,
  "objectJoinConditions": ObjectJoinCondition | ObjectJoinCondition[]
}
```

Query objects are retrieved based on the specified object types or core types, an optional
object filter, and optional join conditions. Exactly one of the properties `objectTypes`
or `coreTypes` must be specified.

The optional `objectFilter` defines conditions for filtering and arranging result objects:

```js
{
  // Conditions for filtering objects by logical 'and' or 'or' combination.
  "conditions": ["<propertyName>[.<subpropertyName>]*", <filterOperator1>, ...<filterOperands1>] |
  {
     and: | or: [
       ["<propertyName1>[.<subpropertyName1>]*", <filterOperator1>, ...<filterOperands1>],
       ["<propertyName2>[.<subpropertyName2>]*", <filterOperator2>, ...<filterOperands2>],
       ...
     ]
  },

  // Sort result objects by the given property names (optional)
  "orderByProperties": [["<propertyName>[.<subpropertyName>]*", "Asc" | "Desc"], ...],

  // Take no more than the given number of results (optional).
  "take": <number>,

  // Skip the given number of results (optional).
  "skip": <number>

}
```

The following filter operators are defined (for details see framework
source documentation of enum `ObjectFilterOperator`):

```
LessThan,
LessThanOrEqual,
GreaterThan,
GreaterThanOrEqual,
Between,
NotBetween,
Like,
Equals,
NotEquals,
Exists,
NotExists,
Contains,
NotContains,
In,
NotIn
```

The optional join conditions are used to join related objects into a result set of
objects. Result objects are augmented by resolving object references to related
objects and storing them in an extra property. A join condition looks like the following:

```js
{
  // Specifies the property name of an object reference to be resolved by joining.
  "localProperty": "<property to resolve>",

  // Specifies the name of the extra property to be added to the result objects.
  "asProperty": "<extra property for resolved object(s)>",

  // Specifies whether the value of the local property is an array
  // whose individual elements should be matched for equality against the value of the
  // corresponding property of the related object (optional).
  "isLocalPropertyArray": <boolean>,

  // Specifies whether the join between the 'localProperty' and the corresponding
  // property of the related object is a one to one relation. If true, the extra property
  // 'asProperty' contains a single related object; otherwise it contains an array of
  // related objects (optional).
  "isOneToOneRelation": <boolean>

}
```

The Retrieve response event accepts the following JSON payload:

```js
{
  "objects": [ <object>, ... ],
  "privateData": <any>
}
```

The property `privateData` is optional. It contains application-specific
options in the form of an object hash (key-value pairs).

### Payloads for Update - Complete Event

The Update-Complete pattern is used to update and synchronize object state
across agents. An Update request or proposal specifies an entire Coaty object as
payload:

```js
{
  "object": <object>
}
```

An Update event signals accomplishment by responding with a Complete event with
the entire (usually changed) object in the payload. This approach avoids complex
merging operations of incremental change deltas in the agents. Since objects are
treated as immutable entities on the agent this approach is in line.

The payload for the Complete response event looks like the following:

```js
{
  "object": <object>,
  "privateData": <any>
}
```

The property `privateData` is optional. It contains application-specific options
in the form of an object hash (key-value pairs).

### Payloads for Call - Return Event

The Call-Return pattern is used to request execution of a remote operation and
to receive
results - or errors in case the operation fails - by one or multiple agents.

The name of the remote operation is not specified in the payload but in the
Event topic level of the Call Event (`Call:<operationname>`). The operation name
should be defined using a hierarchical naming pattern with some levels in the
hierarchy separated by periods (`.`, pronounced "dot") to avoid name collisions,
following Java package naming conventions (i.e.
`com.domain.package.operationname`). For example, the remote operation to switch
on/off lights in the `lights` package of domain `mydomain` could be named
`"com.mydomain.lights.switchLight"`.

The payload of the Call event contains the optional parameter values passed to
the referenced operation to be invoked, and an optional context filter that
defines conditions under which the operation should be executed by a remote end.

```json
{
  "parameters": [ <valueParam1>, ... ] | { "<nameParam1>": <valueParam1>, ... },
  "filter": ContextFilter
}
```

If parameters are given, they must be specified either by-position through a
JSON array or by-name through a JSON object.

The optional `filter` property defines contextual constraints by conditions that
must match a local context object provided by the remote end in order to allow
execution of the remote operation:

```js
{
  // Conditions for filtering objects by logical 'and' or 'or' combination.
  "conditions": ["<propertyName>[.<subpropertyName>]*", <filterOperator1>, ...<filterOperands1>] |
  {
     and: | or: [
       ["<propertyName1>[.<subpropertyName1>]*", <filterOperator1>, ...<filterOperands1>],
       ["<propertyName2>[.<subpropertyName2>]*", <filterOperator2>, ...<filterOperands2>],
       ...
     ]
  }
}
```

More details and valid filter operators are specified [here](#payloads-for-query---retrieve-event).

A filter match fails if and only if a context filter in the payload and a
context object at the remote end are *both* specified and they do not match (by
checking object property values against the filter conditions). In all other
cases, the match is considered successfull.

The payload for the Return response event has two forms. If the remote operation
executes successfully, the payload looks like the following:

```js
{
  "result": <any>,
  "executionInfo": <any>
}
```

The `result` property contains the return value of the operation call which can
be any JSON value.

The optional `executionInfo` property (any JSON value) in the Return event data
may be used to specify additional parameters of the execution environment, such
as the execution time of the operation, or the ID and name of the operated
control unit.

If an error occurred while executing the remote operation, the response payload
looks like the following:

```js
{
  "error": { "code": <integer>, "message": <string> },
  "executionInfo": <any>
}
```

The error code given is an integer that indicates the error type that occurred,
either a predefined error or an application defined one. Predefined error codes
are within the range -32768 to -32000. Any code within this range, but not
defined explicitly in the table below is reserved for future use. Application
defined error codes must be defined outside this range.

| Error Code   | Error Message    |
|--------------|------------------|
| -32602       | Invalid params   |

The error message provides a short description of the error. Predefined error
messages exist for all predefined error codes.

### Payload for Raw Event

A Raw event is publishing arbitrary binary data (byte array) as its payload.
Encoding and decoding is left to the application.

### Payload for Associate Event

An Associate event is published by an IO router to associate or disassociate an
IO source with an IO actor. Associate events accept the following JSON payload:

```js
{
  "ioSourceId": <IO source objectId>,
  "ioActorId": <IO actor objectId>,
  "associatingRoute": <topic name>,
  "updateRate": <number>
}
```

The properties `ioSourceId` and `ioActorId` are mandatory.

`updateRate` is optional; if given it specifies the recommended drain rate (in
milliseconds) for publishing `IoValue` events.

The property `associatingRoute` defines the subscription or publication topic of
the association; if undefined the association should be dissolved. Since an
associating route is used for both MQTT topic publication *and* subscription, it
**must not** contain wildcard tokens (i.e. `#` or `+`) on topic levels.

Associating routes between Coaty-defined IO sources and IO actors use the topic
structure of an `IoValue` event as specified in [this
section](#topic-structure). The topic level **SourceObjectID** specifies the
object ID of the publishing IO source and not the agent's identity.

Associating routes published by external IO sources or subscribed to by external
IO actors **must not** use the Coaty topic structure, but any other valid MQTT
topic shape that doesn't start with `<ProtocolName>/`.

### Payload for IoValue Event

For Coaty-defined IO sources, an IoValue event is published to submit IO values
to associated IO actors. Such events accept any valid UTF-8 encoded string in
JSON format as payload.

Optionally, the payload published by an **external** IO source can be specified
as raw data, i.e. arbitrary binary data (byte array). Decoding is left to the
application logic of the receiving IO actor.

---
Copyright (c) 2018 Siemens AG. This work is licensed under a
[Creative Commons Attribution-ShareAlike 4.0 International License](http://creativecommons.org/licenses/by-sa/4.0/).
