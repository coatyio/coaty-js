---
layout: default
title: Coaty Communication Events
---

# Coaty Communication Events

> This specification conforms to Coaty 2

## Table of Contents

* [Introduction](#introduction)
* [Event Patterns](#event-patterns)
* [Event Structure](#event-structure)
* [Event Data](#event-data)
  * [Advertise Event Data](#advertise-event-data)
  * [Deadvertise Event Data](#deadvertise-event-data)
  * [Channel Event Data](#channel-event-data)
  * [Discover - Resolve Event Data](#discover---resolve-event-data)
  * [Query - Retrieve Event Data](#query---retrieve-event-data)
  * [Update - Complete Event Data](#update---complete-event-data)
  * [Call - Return Event Data](#call---return-event-data)
  * [Raw Event Data](#raw-event-data)
  * [Associate Event Data](#associate-event-data)
  * [IoValue Event Data](#iovalue-event-data)

## Introduction

Communication in a Coaty application is based on communication events which are
published by Coaty agents and which can be subscribed to by Coaty agents. Coaty
provides an essential set of event-based communication patterns to discover,
query, share, and update data on demand in a distributed system, and to request
execution of context-filtered remote operations.

## Event Patterns

The following one-way and two-way communication event patterns are defined:

* **Advertise** an object: multicast an object to parties interested in objects
  of a specific core or object type.
* **Deadvertise** an object by its unique ID: notify subscribers when capability
  is no longer available; for abnormal disconnection of a party, last will
  concept of Coaty is implemented by sending this event.
* **Channel** Multicast objects to parties interested in any type of objects
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
  associate/disassociate IO sources with IO actors.
* **IoValue** Used by IO routing infrastructure to submit IO values from a
  publishing IO source to associated IO actors.

## Event Structure

A Coaty communication event has the following characteristics:

* **EventType** the type of event, one of `Advertise | Deadvertise | Channel |
  Discover | Resolve | Query | Retrieve | Update | Complete | Call | Return |
  Associate | IoValue`
* **EventFilter**  defines a restriction for event subscription; used by
  Advertise, Channel, Update, Call, and Associate event types
* **SourceId** the object ID (UUID) of the event source, either the publishing
  agent identity or the publishing IO source (for IoValue event)
* **CorrelationId** a UUID that correlates a response event with its request
  event in two-way event patterns
* **EventData** structured data associated with an event to be published

The definition of an event filter is specific to the following event type:

* `Advertise` - filter on the core type or object type of a Coaty object
* `Channel` - filter on a channel identifier string
* `Update` - filter on the core type or object type of a Coaty object
* `Call` - filter on the operation name of a call
* `Associate` - filter on the name of an IO Context object

> UUIDs (Universally Unique Identifiers) must conform to the UUID version 4
> format as specified in [RFC 4122](https://www.ietf.org/rfc/rfc4122.txt). In
> the string representation of a UUID the hexadecimal values "a" through "f" are
> output as lower case characters.

## Event Data

Communication event data consists of attribute-value pairs in JavaScript Object
Notation format ([JSON](http://www.json.org), see [RFC
4627](https://www.ietf.org/rfc/rfc4627.txt)). Each communication event type
defines its own data schema.

In the following sections, the JSON data schema for specific event types are
specified. Common type definitions include:

* `<object>` - a Coaty object in JSON object notation
* `<any>` - any key-value pairs in JSON object notation
* `UUID` - string representation of a UUID

> **Note**: Raw events and IO value events with raw data do not conform to this
> specification. They are published as binary data encoded in any
> application-specific format.

### Advertise Event Data

An Advertise event accepts this JSON data:

```js
{
  "object": <object>,
  "privateData": <any>
}
```

The property `privateData` is optional. It contains application-specific
options in the form of key-value pairs.

### Deadvertise Event Data

A Deadvertise event accepts the following JSON data:

```js
{ "objectIds": [ UUID1, UUID2, ... ] }
```

The `objectIds` property specifies the unique IDs of all objects that should be
deadvertised.

### Channel Event Data

A Channel event accepts the following JSON data:

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
options in the form of key-value pairs.

### Discover - Resolve Event Data

The Discover pattern is used to resolve an object based on its external ID,
its object ID, or type restrictions. It accepts the following JSON data:

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

Discover an object based on its object ID.

```js
{ "externalID": "extId", "objectId": UUID }
```

Discover an object based on its external ID and its object ID.
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

The Resolve response event accepts the following JSON data:

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
options in the form of key-value pairs.

### Query - Retrieve Event Data

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

The Retrieve response event accepts the following JSON data:

```js
{
  "objects": [ <object>, ... ],
  "privateData": <any>
}
```

The property `privateData` is optional. It contains application-specific
options in the form of key-value pairs.

### Update - Complete Event Data

The Update-Complete pattern is used to update and synchronize object state
across agents. An Update request or proposal specifies an entire Coaty object as
data:

```js
{
  "object": <object>
}
```

An Update event signals accomplishment by responding with a Complete event with
the entire (usually changed) object in the data. This approach avoids complex
merging operations of incremental change deltas in the agents. Since objects are
treated as immutable entities on the agent this approach is in line.

The data for the Complete response event looks like the following:

```js
{
  "object": <object>,
  "privateData": <any>
}
```

The property `privateData` is optional. It contains application-specific options
in the form of an key-value pairs.

### Call - Return Event Data

The Call-Return pattern is used to request execution of a remote operation and
to receive
results - or errors in case the operation fails - by one or multiple agents.

The operation name should be defined using a hierarchical naming pattern with
some levels in the hierarchy separated by periods (`.`, pronounced "dot") to
avoid name collisions, following Java package naming conventions (i.e.
`domain.package.operationname`). For example, the remote operation to switch
on/off lights in the `lights` package of domain `com.mydomain` could be named
`"com.mydomain.lights.switchLight"`.

The data of the Call event contains the optional parameter values passed to
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

More details and valid filter operators are specified
[here](#query---retrieve-event-data).

A filter match fails if and only if a context filter in the data and a
context object at the remote end are *both* specified and they do not match (by
checking object property values against the filter conditions). In all other
cases, the match is considered successfull.

The data for the Return response event has two forms. If the remote operation
executes successfully, the data looks like the following:

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

If an error occurred while executing the remote operation, the response data
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

### Raw Event Data

A Raw event is publishing arbitrary binary data (byte array) as its data.
Encoding and decoding is left to the application.

### Associate Event Data

An Associate event is published by an IO router to associate or disassociate an
IO source with an IO actor. Associate events accept the following JSON data:

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
associating route is used for both topic publication *and* subscription, it
**must not** be pattern-based.

Associating routes between Coaty-defined IO sources and IO actors use the topic
of an `IoValue` event. Note that the `<IO source objectId>` specifies the object
ID of the publishing IO source and not the agent's identity.

Associating routes published by external IO sources or subscribed to by external
IO actors **must not** use the Coaty topic structure, but any other valid topic
shape according to the specific binding used.

### IoValue Event Data

For Coaty-defined IO sources, an IoValue event is published to submit IO values
to associated IO actors. Such events either accept a valid UTF-8 encoded string
in JSON format or a binary byte array as data. In the latter case, decoding is
left to the application logic of the receiving IO actor.

Likewise, the data published by an **external** IO source can be either
specified as an UTF-8 encoded string in JSON format or as binary data (byte
array). In the latter case, decoding is left to the application logic of the
receiving IO actor.

---
Copyright (c) 2020 Siemens AG. This work is licensed under a
[Creative Commons Attribution-ShareAlike 4.0 International License](http://creativecommons.org/licenses/by-sa/4.0/).
