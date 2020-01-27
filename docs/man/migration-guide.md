---
layout: default
title: Coaty JS Documentation
---

# Coaty JS Migration Guide

The jump to a new major release of Coaty involves breaking changes to the Coaty
JS framework API. This guide describes what they are and how to upgrade your
Coaty JS application to a new release.

## Coaty 1 -> Coaty 2

Coaty 2 incorporates experience and feedback gathered with Coaty 1. It pursues
the main goal to streamline the framework API, to get rid of unused and
deprecated functionality, and to prepare for future extensions.

Coaty 2 introduces "communication bindings", a mechanism to make Coaty's
underlying publish-subscribe messaging protocol interchangeable, while keeping
the set of communication event patterns.

Among other refactorings, Coaty 2 carries breaking changes regarding package
naming and import declarations, object types, distributed lifecycle management,
IO routing, and the communication protocol. Therefore, Coaty 2 applications are
no longer backward-compatible and interoperable with Coaty 1 applications.

To update to Coaty 2, follow the migration steps described in the following
sections.

### Before migrating

To update the build infrastructure of your application, follow these steps:

* Remove `package-lock.json` and `node_modules` folder from your project.
* Update your project dependencies and devDependencies in `package.json` to
  comply with Coaty 2:
  * Replace "coaty@1.x.y" by "@coaty/core@^2.0.0".
  * Update the versions of other dependencies such as "rxjs", "typescript", etc.
  
  The easiest way to achieve this is to take over the dependency versions
  defined in the [template
  project](https://github.com/coatyio/coaty-examples/blob/master/template/js/package.json)
  located in the "coaty-examples" repository.
* Reinstall project dependencies with `npm install`.

### Changes to package naming and import declarations

Coaty 2 introduces a common npm package scope named `@coaty` for current and
future framework projects of the Coaty JS platform. The Coaty 2 core framework
is published in the scoped npm package named `@coaty/core`.

Rewrite all import declarations `coaty/<modulename>` to use this scoped package
as follows:

* `coaty/com`, `coaty/controller`, `coaty/model`, `coaty/runtime`, `coaty/util`
  -> `@coaty/core`
* `coaty/db` -> `@coaty/core/db`
* `coaty/db-adapter-in-memory` -> `@coaty/core/db/adapter-in-memory`
* `coaty/db-adapter-postgres` -> `@coaty/core/db/adapter-postgres`
* `coaty/db-adapter-sqlite-cordova` -> `@coaty/core/db/adapter-sqlite-cordova`
* `coaty/db-adapter-sqlite-node` -> `@coaty/core/db/adapter-sqlite-node`
* `coaty/io` -> `@coaty/core/io-routing`
* `coaty/runtime-angular` -> `@coaty/core/runtime-angular`
* `coaty/runtime-node` -> `@coaty/core/runtime-node`
* `coaty/sensor-things` -> `@coaty/core/sensor-things`
* `coaty/sensor-things-io` -> `@coaty/core/sensor-things/io`

Refactor import declarations of the following type references:

* `DbConnectionInfo` - import from `@coaty/core`
* `HistorianController` - import from `@coaty/core/db`

> **Note**: All Coaty JS extensions are also publishing scoped packages within
> the `@coaty/` scope.

### Deprecated functionality

All features marked as deprecated in Coaty 1 have been removed:

* `CommunicationManager.observeAdvertise()` - use either
  `observeAdvertiseWithCoreType()` or `observeAdvertiseWithObjectType()`
* `CommunicationOptions.brokerOptions` - use
  `CommunicationOptions.mqttClientOptions`
* `Container.getRuntime()` - use `Container.runtime`
* `Container.getCommunicationManager()` - use `Container.communicationManager`

### Changes in `runtime-node` module

Refactor the following definitions:

* `provideConfiguration()` -> `NodeUtils.provideConfiguration()`
* `provideConfigurationAsync()` -> `NodeUtils.provideConfigurationAsync()`

### Changes in `Configuration` options

* The `Configuration.common` property is now optional.
* Move extra properties defined on `Configuration.common` into its new `extra`
  property.
* Rename `Runtime.options` to `Runtime.commonOptions`. Its value is `undefined`
  if the `Configuration.common` property is not specified.

### Changes in `Container`

* If you call `Container.registerController()` replace the third argument
  `ControllerConfig` by `ControllerOptions`.

### Changes in Coaty object types

* Stop using `CoatyObject.assigneeUserId` as this property has been removed. If
  needed, add it to your custom object type.
* Stop using `Config` as this core type has been removed. If needed, define an
  equivalent object type in your application code.
* Rename core object type `Component` to `Identity`. This name better reflects
  its intent to provide the unique identity of a Coaty agent.
* Optional property `logLabels` has been added to `Log` object type. Useful in
  providing multi-dimensional context-specific data along with a log.
* Stop adding extra properties to `Log` object type directly. Add them to the
  new `Log.logLabels` property.
* Stop adding extra properties to `LogHost` objects directly. Extend the
  `LogHost` interface to provide them.

### Changes in distributed lifecycle management

To realize distributed lifecycle management for Coaty agents in Coaty 1,
individual identity objects were assigned to the communication manager as well
as to each controller, in order to be advertised and to be discoverable by other
agents. The identity objects were also used to provide event source IDs for
communication events to realize echo suppression on the controller level so that
events published by a controller could never be observed by itself.

In Coaty 2, distributed lifecycle management has been simplified and made more
efficient:

* The agent container is assigned a unique identity object to be shared by all
  controllers and the communication manager. Controllers and the communication
  manager no longer own separate identities.
* The container's identity is *always* advertised and discoverable. You can no
  longer disable this behavior.
* When publishing or observing communication events, an identity object no
  longer needs to be specified as event source or event target, respectively.
* By design, echo suppression of communication events has been revoked. The
  communication manager dispatches any incoming event to every controller that
  *observes* it, even if the controller published the event itself.

Upgrade to the new approach as follows:

* Stop using `CommunicationManager.identity` as this getter have been removed.
  Instead, use `Container.identity` to access the container's identity object.
* Stop configuring identity properties in `CommunicationOptions.identity` as
  this property has been removed. Instead, customize properties of the
  container's identity object, usually its name, in the new
  `CommonOptions.agentIdentity` property.
* Stop using `CommunicationOptions.shouldAdvertiseIdentity` as this property has
  been removed.
* Stop expecting `ObjectLifecycleController` or your custom controllers to track
  identity of controllers. Only identity of containers can be observed or
  discovered.
* Stop using `Controller.identity` as this getter have been removed. Use
  `Container.identity`  instead.
* Stop defining `Controller.initializeIdentity()` as this method has been
  removed.
* Stop using `ControllerOptions.shouldAdvertiseIdentity` as this property has
  been removed.
* Stop defining `Controller.onContainerResolved()` as this method has been
  removed. Perform these side effects in `Controller.onInit`, accessing the
  container by `Controller.container` getter.
* If you call static creation methods of a communication event type, e.g.
  `AdvertiseEvent.withObject()`, remove the first argument `eventSource`.
* If you call communication event observation methods
  `CommunicationManager.observeXXX()` remove the first argument `eventTarget`.

If echo suppression of communication events is required for your custom
controller, place it into its *own* container and *filter out* observed events
whose event source ID equals the object ID of the container's identity, like
this:

```ts
this.communicationManager.observeDiscover()
    .pipe(filter(event => event.sourceId !== this.container.identity.objectId))
    .subscribe(event => {
        // Handle non-echo events only.
    });
```

### Changes in communication

* Stop using `OperatingState.Starting` and `OperatingState.Stopping` as these
  enum members have been removed. Use `OperatingState.Started` and
  `OperatingState.Stopped` instead.
* Rename `IoStateEvent.eventData` getter to `IoStateEvent.data`.
* Rename `CommunicationEvent.eventData` getter to `CommunicationEvent.data`.
* Rename `CommunicationEvent.eventSourceId` getter to `CommunicationEvent.sourceId`.
* Stop using `CommunicationEvent.eventSource` as this getter has been removed.
  Use `CommunicationEvent.sourceId` instead.
* Stop using `CommunicationEvent.eventUserId` as this getter has been removed.
  For details, see section "Changes in IO routing".
* Stop using `CommunicationOptions.useReadableTopics` as this property has been
  removed. This feature is no longer supported.

### Changes in communication protocol

* The MQTT topic structure has been optimized. Your application code is not
  affected by this change.
* You can now specify the MQTT QoS level for all publications, subscriptions,
  and last will messages in `CommunicationOptions.mqttClientOptions`. The
  default level is 0.
* You can now specify partial options for `CommunicationManager.restart()`.
* Take further actions after calling `CommunicationManager.restart()` not until
  the returned promise resolves.
* `CommunicationManager.observeRaw()` no longer emits messages for non-raw Coaty
  communication event types.
* A [namespacing
  concept](https://coatyio.github.io/coaty-js/man/developer-guide/#namespacing)
  has been added to isolate different Coaty applications (see
  `CommunicationOptions.namespace` and
  `CommunicationOptions.shouldEnableCrossNamespacing`). Communication events are
  only routed between agents within a common namespace. This feature is
  backward-compatible with Coaty 1.

---
Copyright (c) 2020 Siemens AG. This work is licensed under a
[Creative Commons Attribution-ShareAlike 4.0 International License](http://creativecommons.org/licenses/by-sa/4.0/).
