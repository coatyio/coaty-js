---
layout: default
title: Coaty JS Documentation
---

# Coaty Communication Protocol

> This specification conforms to Coaty Communication Protocol Version 2

## Version History

* **Version 2**: add Call-Return pattern; backward compatible with v1
* **Version 1**: initial specification

## Table of Contents

* [Introduction](#introduction)
* [Message Topics and Payloads](#message-topics-and-payloads)
* [Events and Event Patterns](#events-and-event-patterns)
* [Topic Structure](#topic-structure)
  * [Readable Topics](#readable-topics)
* [Topic Filters](#topic-filters)
* [Topic Payloads](#topic-payloads)
  * [Payload for Advertise Event](#payload-for-advertise-event)
  * [Payload for Deadvertise Event](#payload-for-deadvertise-event)
  * [Payload for Channel Event](#payload-for-channel-event)
  * [Payloads for Discover - Resolve Event](#payloads-for-discover---resolve-event)
  * [Payloads for Query - Retrieve Event](#payloads-for-query---retrieve-event)
  * [Payloads for Update - Complete Event](#payloads-for-update---complete-event)
  * [Payloads for Call - Return Event](#payloads-for-call---return-event)
  * [Payload for Associate Event](#payload-for-associate-event)
  * [IO Routing](#io-routing)

## Introduction

Communication between components in the Coaty framework is based
on distributed publish-subscribe messaging using an MQTT message broker.
A communication message is comprised of a topic name and a payload.
The format of topic names and payloads conforms to the [MQTT](https://mqtt.org/)
Specification Version 3.1.1.

## Message Topics and Payloads

A topic name is structured into topic levels separated by a topic level separator
`/`. A topic name consists of UTF-8 encoded characters except `NULL (U+0000)`,
`# (U+0023)`, and `+ (U+002B)`. A topic name must not contain more than 65535
UTF-8 encoded bytes. Topic names are case sensitive. Client defined topic
names should not start with a `$` character, it is reserved for broker usage
(e.g. `$SYS/` topics).

Topic filters are used to subscribe to published topics. A topic filter is a
topic name that can contain wildcard tokens for topic levels:

* `#` matches any number of topic levels and sublevels. Only allowed in
  trailing position, e.g. `#`or `/level1/level2/#`
* `+`  matches a single topic level, e.g. `level1/+` matches `level1/` and
  `level/level2` but not `level1`

Within the framework, message payloads are always specified as UTF-8 encoded
strings in JavaScript Object Notation ([JSON](http://www.json.org)) format (see
[RFC 4627](https://www.ietf.org/rfc/rfc4627.txt)). Binary payload formats are
not supported. The reason behind is that messaging should only be used to transfer object
metadata but not content itself, such as multimedia content in the form of audio,
video or documents. To upload or download content data an appropriate data transfer
communication protocol should be used that gets the target data location (e.g. a URL)
from the message payload.

Note that MQTT allows applications to send MQTT Control Packets of size up to
256 MB. For Publish messages, this includes the message topic of size up to 64K,
the payload, as well as some bytes of header data.

> To debug MQTT messages published by a Coaty agent, you can use any MQTT client
> and subscribe to the `#` topic. We recommend [mqtt-spy](https://kamilfb.github.io/mqtt-spy/)
> or [MQTT.fx](http://www.mqttfx.org/), both cross-platform clients provide
> graphical user interfaces for message inspection.

## Events and Event Patterns

The framework uses a minimum set of predefined events and event patterns to
discover, distribute, and share object information in a decentralized application:

* **Advertise** an object: broadcast an object to parties interested in objects of a
  specific core or object type.
* **Deadvertise** an object by its unique ID: notify subscribers when capability is
  no longer available; for abnormal disconnection of a party, last will concept can
  be implemented by sending this event.
* **Channel** Broadcast objects to parties interested in any kind of objects delivered
  through a channel with a specific channel identifier.
* **Discover - Resolve** Discover an object and/or related objects by external ID,
  internal ID, or object type, and receive responses by Resolve events.
* **Query - Retrieve**  Query objects by specifying selection and ordering criteria,
  receive responses by Retrieve events.
* **Update - Complete**  Request or suggest an object update and receive
  accomplishments by Complete events.
* **Call - Return**  Request execution of a remote operation and receive results by Return events.
* **Associate** Used by IO Router to dynamically associate/disassociate IO sources with IO actors.
* **IoValue** Send IO values from a publishing IO source to associated IO actors.

## Topic Structure

Any topic used in the framework consists of the following topic levels:

* **Protocol Version** - for versioning the communication protocol.
  The protocol version number conforming to this specification is shown at the top of
  this page.
* **Associated User ID** - globally unique ID (UUID) of a user associated with the
  source component; specify a dash (`-`) if component is not associated with a user.
* **Source Object ID** - globally unique ID (UUID) of the event source that is
  publishing a topic. Each component can act as an event source.
* **Event** - one of the predefined events listed above.
* **Message Token** - UUID that uniquely identifies a messages. Used to
  correlate a response message to the request message in Discover-Resolve,
  Query-Retrieve, Update-Complete, and Call-Return event patterns.

UUIDs (Universally Unique Identifiers) must conform to the UUID version 4 format as
specified in RFC 4122. In the string representation of a UUID the hexadecimal
values "a" through "f" are output as lower case characters.

A topic name is composed as follows:

`/coaty/<ProtocolVersion>/<Event>/<AssociatedUserId>/<SourceObjectId>/<MessageToken>/`

The protocol version topic level represents the communication protocol version of
the publishing party, as a positive integer. The receiving party should check the
protocol version in the topic of any incoming message against its own protocol version.
If both versions are not equal, the incoming message should be ignored.

When publishing an Advertise event the Event topic level **must** include a filter
field of the form: `Advertise:<filter>`. The filter field
must not be empty. It must not contain the characters `NULL (U+0000)`, `# (U+0023)`,
`+ (U+002B)`, and `/ (U+002F)`. Framework implementations specify the core type
(`Advertise:<coreType>`) or the object type (`Advertise::<objectType>`) of the
advertised object (see section [Topic Playloads](#topic-payloads)) as filter in order
to allow subscribers to listen just to objects of a specific core or object type.
To support subscriptions on both types of filters every Advertise event should be
published twice, once for the core type and once for the object type of the object
to be advertised.

When publishing a Channel event the Event topic level **must** include a channel
identifier field of the form: `Channel:<channelId>`. The channel ID field must
not be empty. It must not contain the characters `NULL (U+0000)`, `# (U+0023)`,
`+ (U+002B)`, and `/ (U+002F)`.

When publishing a Call event the Event topic level **must** include an operation
name field of the form: `Call:<operationname>`. The operation name field must
not be empty. It must not contain the characters `NULL (U+0000)`, `# (U+0023)`,
`+ (U+002B)`, and `/ (U+002F)`.

For any request-response event pattern the receiving party must respond with an
outbound message containing the original message token of the incoming message topic.

### Readable Topics

To support optimized testing and debugging for published topics, instead of
using a UUID alone, a readable name can be part of the topic levels of
Associated User ID, Source Object ID, and Message Tokens.

Readable Associated User ID and Source Object ID levels are composed of the name
of the user/object and the original UUID, separated by an underscore.
The name must be normalized to conform to the topic specification: any
occurrences of the characters `NULL (U+0000)`, `# (U+0023)`, `+ (U+002B)`, and
`/ (U+002F)` must be replaced by an underscore character `_ (U+005F)`.

The readable option for Associated User ID *must* *not* be used
in combination with the Associate event (see section 'Topic Filters' below).

A readable message token is composed of the readable Source Object ID and a
local decimal integer counter value separated by an underscore. The counter
should be incremented by a client locally whenever a new message token is generated
and used. The counter can be used to easily trace and count the number of
request-response events published by a client.

The readable topic option is intended for debugging and should not be used
in production systems.

## Topic Filters

Each communication client should subscribe to topics according to the defined
topic structure. These subscriptions should be kept for the lifetime of the
communication client. Associated User ID, Source Object ID, Message Token and
Protocol Version levels should be treated as wildcards.

Basically, the Event level is filtered to support event-specific subscriptions:

```
/coaty/+/Event/+/+/+/
```

When subscribing to an Advertise event the Event topic level **must** include
the Advertise filter field: `Advertise:<filter>` or `Advertise::<filter>`.

When subscribing to a Channel event the Event topic level **must** include
the channel ID field: `Channel:<channelId>`.

When subscribing to a Call event the Event topic level **must** include
the operation name field: `Call:<operationname>`.

When subscribing to Associate events which are published by an IO router,
the Associated User ID level should also be filtered (the readable topic option
does *not* apply for topic filters):

```
/coaty/+/Associate/<Associated User ID>/+/+/
```

For IoValue events the topic name must *not* contain any wildcard tokens on topic
levels, since both IO source and IO actor use this topic; the IO actor subscribes
on it and the IO source publishes on it.

## Topic Payloads

A Coaty object is defined by the following generic properties:

```
{
  coreType: "CoatyObject" | "User" | "Device" | ...,
  objectType: string,
  name: string,
  objectId: Uuid,
  externalId?: string,
  parentObjectId?: Uuid,
  assigneeUserId?: Uuid,
  locationId?: Uuid,
  isDeactivated?: boolean
}
```

The property `coreType` is the framework core type name of the object;
it corresponds to the name of the interface that defines the object's shape.

The `objectType` property is the concrete type name of the object in a canonical
form. It should be defined using a hierarchical naming pattern with some levels in the
hierarchy separated by periods (`.`, pronounced "dot") to avoid name collisions,
following Java package naming conventions (i.e. `com.domain.package.Type`).
All predefined object types use the form `coaty.<InterfaceName>`,
e.g. `coaty.CoatyObject` (see constants in `CoreTypes` class). Do not use the
reserved toplevel namespace `coaty.*` for your application defined object types.

The concrete and core type names of all predefined object types are defined
as static properties of the `CoreTypes` class in the framework `model` module.

The `objectId` property defines the unique identity of an object within the system.

The optional `externalId` property defines the identity of an object relative to
an external system, such as the primary key for this object in an external database.
Note that external IDs are not guaranteed to be unique across
the whole universe of system objects. Usually, external IDs are only unique for
a specific type of objects.

The optional `parentObjectId` property refers to the unique UUID of the parent object.
It is used to model parent-child relationships of objects. For example,
Annotation objects can be modelled as children of target objects they are attached to.

The optional `assigneeUserId` property specifies the unique UUID of the user object
that this object has been assigned to currently.

The optional `locationId` property refers to the unique UUID of the Location
object that this object has been associated with.

The optional `isDeactivated` property marks an object that is no longer used. The
concrete definition meaning of this property is defined by the application.
The property value is optional and defaults to false.

Application specific object types can be defined based on the predefined core object
types by adding additional property-value pairs. Allowed value types must conform to
JSON data types.

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
{ "externalId": "extId", "objectTypes": ["object type", ...], "coreTypes": ["core type", ...] }
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

The Update-Complete pattern is used to update and synchronize object state across
agents. An Update request or proposal for a Coaty object may be either *partial*
or *full*.

For a *partial* update, the object id and the property name-value pairs that
change are specified as payload:

```js
{
  "objectId": UUID,
  "changedValues": { "<name of prop>": <newValue>, ... }
}
```

The interpretation of the new value for a property depends on the application
context: For example, if the new value is not a primitive value, but an object
consisting of attribute-value pairs, the update operation could be interpreted
as a partial or a full update on this value object. Also, the interpretation
of the property name itself depends on the application context. For example, the name
could specify a chain of property/subproperty names to support updating values
of a subproperty object on any level (e.g. `<property>.<subproperty>.<subsubproperty>`).
It could also be a virtual property that is *not* even defined in the associated object.

For a *full* update, the entire Coaty object is specified as payload:

```js
{
  "object": <object>
}
```

Both partial and full Update events signal accomplishment by sending back
a Complete event with the entire (usually changed) object in the payload.
This approach avoids complex merging operations of incremental change deltas in
the client. Since objects are treated as immutable entities on the client
this approach is in line.

The payload for the Complete response event looks like the following:

```js
{
  "object": <object>,
  "privateData": <any>
}
```

The property `privateData` is optional. It contains application-specific
options in the form of an object hash (key-value pairs).

### Payloads for Call - Return Event

The Call-Return pattern is used to request execution of a remote operation and to receive
results - or errors in case the operation fails - by one or multiple agents.

The name of the remote operation is not specified in the payload but in
the Event topic level of the Call Event (`Call:<operationname>`). The operation
name should be defined using a hierarchical naming pattern with some levels in the
hierarchy separated by periods (`.`, pronounced "dot") to avoid name collisions,
following Java package naming conventions (i.e. `com.domain.package.operationname`).
For example, the remote operation to switch on/off lights in the `lights` package
of domain `mydomain` could be named `"com.mydomain.lights.switchLight"`.

The payload of the Call event contains the optional parameter values passed to
the referenced operation to be invoked, and an optional context filter that
defines conditions under which the operation should be executed by a remote end.

```json
{
  "parameters": [ <valueParam1>, ... ] | { "<nameParam1>": <valueParam1>, ... },
  "filter": ContextFilter
}
```

If parameters are given, they must be specified either by-position through a JSON array
or by-name through a JSON object.

The optional `filter` property defines contextual constraints by conditions that must match
a local context object provided by the remote end in order to allow execution of the remote
operation:

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

A filter match fails if and only if a context filter in the payload and a context object
at the remote end are *both* specified and they do not match (by checking object property values
against the filter conditions). In all other cases, the match is considered successfull.

The payload for the Return response event has two forms. If the remote operation
executes successfully, the payload looks like the following:

```js
{
  "result": <any>,
  "executionInfo": <any>
}
```

The `result` property contains the return value of the operation call which can be
any JSON value.

The optional `executionInfo` property (any JSON value) in the Return event data
may be used to specify additional parameters of the execution environment, such
as the execution time of the operation, or the ID and name of the operated
control unit.

If an error occurred while executing the remote operation, the response payload looks
like the following:

```js
{
  "error": { "code": <integer>, "message": <string> },
  "executionInfo": <any>
}
```

The error code given is an integer that indicates the error type
that occurred, either a predefined error or an application defined one.
Predefined error codes are within the range -32768 to -32000.
Any code within this range, but not defined explicitly in the table below is reserved
for future use. Application defined error codes must be defined outside this range.

| Error Code   | Error Message    |
|--------------|------------------|
| -32602       | Invalid params   |

The error message provides a short description of the error. Predefined
error messages exist for all predefined error codes.

### Payload for Associate Event

An Associate event is published by an IO router to associate or disassociate
an IO source with an IO actor (see next section). Associate events accept the
following JSON payload:

```js
{
  "ioSource": <IO source object definition>,
  "ioActor": <IO actor object definition>,
  "associatedTopic": <topic name>,
  "updateRate": <number>
}
```

The properties `ioSource` and `ioActor` are mandatory.
The property `associatedTopic` defines the subscription or publication
topic for an association; if undefined the association should be removed.
`updateRate` is optional; if given it specifies the recommended update rate
(in milliseconds) for publishing `IOValue` events.

### IO Routing

IO sources publish `IoValue` events or external events. IO actors can receive
such events by subscribing to the topics on which IO sources publish values.
IO sources are dynamically associated with IO actors depending on the
context of the associated user.

The communication event flow of IO routing comprises the following steps:

1. `Device` objects with their IO capabilities, i.e. IO sources and IO actors,
  are advertised/deadvertised by user-associated device objects.

2. The IO router associates/disassociates the currently advertised IO sources
   and IO actors based on application-specific logic which usually considers the
   user's context, such as user's role or profile, user's task flow, location, and
   other environmental factors. On context changes, the IO router should change
   associations accordingly.

   An IO source is associated/disassociated with an IO actor by publishing
   an Associate event. Since the associated topic is used for both
   publication and subscription, it must never contain wildcard tokens (i.e.
   `#` or `+`) on topic levels.

   Associated topics for framework components are generated by the
   IO router using the topic structure with an `IoValue` event type as described
   above. Associated topics published by external IO sources or subscribed to by
   external IO actors need not conform to this topic structure but can be of any
   valid MQTT topic shape.

   The payload data published by both external and internal IO sources
   must conform to the protocol specification, i.e. it must be specified as
   UTF-8 encoded strings in JSON format.

   Associations of IO sources with IO actors are constrained as follows:

* An IO source can only be associated with an IO actor if their value types
  are compatible, i.e. they produce/consume data in the same underlying data format.

* Each pair of IO source and IO actor publishes/subscribes to exactly one
  associated topic.

* An IO source can be associated with different IO actors.

* An IO actor can be associated with different IO sources. Values are
  received on all the topic subscriptions for the associated IO sources.

* An IO source publishes values on exactly one associated topic.

* Different IO sources must not publish values on the same topic.
  Otherwise, an IO actor could receive values from a non-associated source.

---
Copyright (c) 2018 Siemens AG. This work is licensed under a
[Creative Commons Attribution-ShareAlike 4.0 International License](http://creativecommons.org/licenses/by-sa/4.0/).
