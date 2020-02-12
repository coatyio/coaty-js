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

Coaty 1 is still available on npm package `coaty@1.x.y`. Coaty 2 is deployed
separately on scoped npm package `@coaty/core@2.x.y`.

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

Rewrite all import and require declarations `coaty/<modulename>` to use this
scoped package as follows:

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
* `coaty/scripts` -> `@coaty/core/scripts`
* `coaty/tslint-config` -> `@coaty/core/tslint-config`

Refactor import declarations of the following type references:

* `DbConnectionInfo` - import from `@coaty/core`
* `HistorianController` - import from `@coaty/core/db`

### Deprecated functionality

All features marked as deprecated in Coaty 1 have been removed:

* `CommunicationManager.observeAdvertise()` - use either
  `observeAdvertiseWithCoreType()` or `observeAdvertiseWithObjectType()`
* `CommunicationOptions.brokerOptions` - use
  `CommunicationOptions.mqttClientOptions`
* `Container.getRuntime()` - use `Container.runtime`
* `Container.getCommunicationManager()` - use `Container.communicationManager`

### Changes in `util` module

* The `Async.inSeries()` function no longer returns a boolean promise that
  indicates whether an async operation has terminated prematurely. Instead, the
  promise resolves the index of the last item that the async operation has been
  applied to successfully.

### Changes in `runtime-node` module

Refactor the following definitions:

* `provideConfiguration()` -> `NodeUtils.provideConfiguration()`
* `provideConfigurationAsync()` -> `NodeUtils.provideConfigurationAsync()`

### Changes in `Configuration` options

* The `mergeConfigurations` function now accepts *partial* primary or secondary
  configuration parameters.
* The `Configuration.common` property is now optional.
* Move extra properties defined on `Configuration.common` into its new `extra`
  property.
* Stop defining `Configuration.common.associatedUser` as this property has been
  removed. If needed for any other purpose than IO routing, define and access
  your User object in `Configuration.common.extra`. For more details, see
  section "Changes in IO routing".
* Stop defining `Configuration.common.associatedDevice` as this property has
  been removed. For details, see section "Changes in IO routing".
* Rename `Runtime.options` to `Runtime.commonOptions`. Its value is `undefined`
  if the `Configuration.common` property is not specified.

### Changes in `Container`

* If you call `Container.registerController()` replace the third argument
  `ControllerConfig` by `ControllerOptions`.

### Changes in Coaty object types

* Rename core object type `Component` to `Identity`. This name better reflects
  its intent to provide the unique identity of a Coaty agent.
* Stop using `Config` as this core type has been removed. If needed, define an
  equivalent object type in your application code.
* Stop using `Device` as this object type has been removed. For details, see
  section "Changes in IO routing".
* Stop using `CoatyObject.assigneeUserId` as this property has been removed.
* Stop using `Task.workflowId` as this property has been removed. If needed,
  define an equivalent property in your custom task type.
* Use new property `Task.assigneeObjectId` to reference an object, e.g. a user
  or machine, that this task is assigned to.
* Change type of `Task.requirements` property to consist of key-value pairs.
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
* The container's identity is *always* advertised and discoverable to support
  distributed lifecycle management. You can no longer disable this behavior.
* When publishing or observing communication events, an identity object no
  longer needs to be specified as event source or event target, respectively.
* By design, echo suppression of communication events has been revoked. The
  communication manager dispatches *any* incoming event to every controller that
  *observes* it, even if the controller published the event itself.

Upgrade to the new approach as follows:

* If you call static creation methods of a communication event type, e.g.
  `AdvertiseEvent.withObject()`, remove the first argument `eventSource`.
* If you call communication event observation methods
  `CommunicationManager.observeXXX()` remove the first argument `eventTarget`.
* Stop using `CommunicationManager.identity` as this getter have been removed.
  Instead, use `Container.identity` to access the container's identity object,
  i.e. from within a controller use `this.container.identity`.
* Stop configuring identity properties in `CommunicationOptions.identity` as
  this property has been removed. Instead, customize properties of the
  container's identity object in the new `CommonOptions.agentIdentity` property.
* Stop using `CommunicationOptions.shouldAdvertiseIdentity` as this property has
  been removed.
* Stop using `Controller.identity` as this getter has been removed. Use
  `Container.identity` instead.
* Stop defining `Controller.initializeIdentity()` as this method has been
  removed.
* Stop using `ControllerOptions.shouldAdvertiseIdentity` as this property has
  been removed.
* Stop defining `Controller.onContainerResolved()` as this method has been
  removed. Perform these side effects in `Controller.onInit`, accessing the
  container by `Controller.container` getter.
* Stop expecting `ObjectLifecycleController` or your custom controllers to track
  the identity of controllers. Only identity of containers can be observed or
  discovered.

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

* Rename `CommunicationEvent.eventData` getter to `CommunicationEvent.data`.
* Rename `CommunicationEvent.eventSourceId` getter to `CommunicationEvent.sourceId`.
* Stop using `CommunicationEvent.eventSource` as this getter has been removed.
  Use `CommunicationEvent.sourceId` instead.
* Stop using `CommunicationEvent.eventUserId` as this getter has been removed.
  For details, see section "Changes in IO routing".
* Rename `IoStateEvent.eventData` getter to `IoStateEvent.data`.
* Stop using `OperatingState.Starting` and `OperatingState.Stopping` as these
  enum members have been removed. Use `OperatingState.Started` and
  `OperatingState.Stopped` instead.
* Stop using `CommunicationOptions.useReadableTopics` as this property has been
  removed. This feature is no longer supported.
* The MQTT topic structure has been optimized. Your application code is not
  affected by this change.
* You can now specify the MQTT QoS level for all publications, subscriptions,
  and last will messages in `CommunicationOptions.mqttClientOptions`. The
  default level is 0.
* You can now specify partial options, i.e. changed options only, for
  `CommunicationManager.restart()`.
* Take further actions after calling `CommunicationManager.restart()` not until
  the returned promise resolves.
* A [namespacing
  concept](https://coatyio.github.io/coaty-js/man/developer-guide/#namespacing)
  has been added to isolate different Coaty applications (see
  `CommunicationOptions.namespace` and
  `CommunicationOptions.shouldEnableCrossNamespacing`). Communication events are
  only routed between agents within a common namespace. This feature is
  backward-compatible with Coaty 1.

#### Changes in Update event

We abandon *partial* Update events in favor of full Update events where you can
choose to observe Update events for a specific core type or object type,
analogous to Advertise events. This reduces messaging traffic because Update
events are no longer submitted to all Update event observers but only to the
ones interested in a specific type of object.

* Stop publishing partial Update events using `UpdateEvent.withPartial()`.
  Replace them by full Update events.
* Stop using `UpdateEventData.isPartialUpdate()`,
  `UpdateEventData.isFullUpdate()`, `UpdateEventData.objectId` and
  `UpdateEventData.changedProperties` as these getters have been removed.
* Rename `UpdateEvent.withFull()` to `UpdateEvent.withObject()`.
* Stop observing Update events with `CommunicationManager.observeUpdate()` as
  this method has been removed. Use either
  `CommunicationManager.observeUpdateWithCoreType()` or
  `CommunicationManager.observeUpdateWithObjectType()`.

#### Changes in Call event

When observing Call events by `CommunicationManager.observeCall()` with a
context argument specified, the logic of matching the context filter of an
incoming Call event to the given context object has changed: A Call event is *no
longer* emitted by the observable if context filter is *not* supplied *and*
context object *is* specified.

#### Changes in Raw event

* `CommunicationManager.observeRaw()` no longer emits messages related to Coaty
  communication patterns.

### Changes in Sensor Things

* You can now call `SensorSourceController.findSensor(predicate)` to look up a
  registered sensor satisfying a certain predicate.
* Sensor objects emitted by `SourceCodeController.registeredSensorsChangeInfo$`
  are read-only. If you need to modify one, clone the object first (using
  `clone()` function in `@coaty/core`).

### Changes in IO routing

In Coaty 1, the scope of IO routing is restricted to a single user and its
devices that define IO sources and actors. IO value events are only routed
between the IO sources and actors of these devices.

Coaty 2 redesigns IO routing by generalizing and broadening the scope of
routing. `User` and `Device` objects are no longer used for IO routing. They are
replaced by `IoContext` and `IoNode` objects, respectively:

* An *IO context* represents a context-specific scope for routing (replaces
  associated user) and is associated with an IO router.
* An *IO node* consists of a set of IO sources and actors (replaces
  ioCapabilities of associated device), and node-specific characteristics
  (replaces device properties) to be used by IO routers to control routes.
* Each IO node is associated with exactly one IO context. A router routes IO
  values between IO sources and actors of all IO nodes which belong to its
  associated IO context.
* *Multiple* IO nodes for *different* IO contexts can be registered with a Coaty
  agent.
* An IO router is responsible for establishing routes between IO sources and
  actors of all IO nodes which belong to its associated IO context.

To migrate to the new concept, read the updated section on [IO
routing](https://coatyio.github.io/coaty-js/man/developer-guide/#io-routing) in
the Developer Guide and follow these steps:

* Rename `IoSource.externalTopic` property to `IoSource.externalRoute`.
* Rename `IoActor.externalTopic` property to `IoActor.externalRoute`.
* Stop discovering object type `Device` as this functionality has been removed.
* Stop using `CommonOptions.associatedUser` and `CommonOptions.associatedDevice`
  as these properties have been removed. For IO routing, use
  `CommonOptions.ioNodes` and `CommunicationManager.getIoNodeByContext()`
  instead.
* Stop using `CommunicationOptions.shouldAdvertiseDevice` as this property has
  been removed.
* Stop defining `externalDevices` for `IoRouter` classes as this router option
  has been removed.
* Stop using `IoRouter.getAssociatedUser()` as this method has been removed.
  Instead, use `IoRouter.ioContext` and configure the IO context by router
  controller option `ioContext`.
* Stop using `IoRouter.getAssociatedDevices()` as this method has been
  removed. Use `IoRouter.managedIoNodes` instead.
* Stop using `IoRouter.findAssociatedDevice()` as qthis method has been
  removed. Use `IoRouter.findManagedIoNode()` instead.
* Stop defining `IoRouter.onDeviceAdvertised()` as this method has been
  removed. Use `IoRouter.onIoNodeManaged()` instead.
* Stop defining `IoRouter.onDevicesDeadvertised()` as this method has been
  removed. Use `IoRouter.onIoNodesUnmanaged()` instead.
* If you define rules for `RuleBasedIoRouter` expect the fifth argument of the
  `IoRoutingRuleConditonFunc` to be the `IoContext` of the router, and the sixth
  argument to be the router itself.

---
Copyright (c) 2020 Siemens AG. This work is licensed under a
[Creative Commons Attribution-ShareAlike 4.0 International License](http://creativecommons.org/licenses/by-sa/4.0/).
