---
layout: default
title: Coaty JS Documentation
---

# Coaty JS Migration Guide

The jump to a new major release of Coaty involves breaking changes to the Coaty
JS framework API. This guide describes what they are and how to update your
Coaty JS application to comply with the new release.

## Coaty 1 -> Coaty 2

The primary goal of Coaty 2 is to streamline the framework API, as well as to
get rid of unused and deprecated functionality. Coaty 2 also prepares for
so-called "communication bindings", a mechanism to make the publish-subscribe
messaging protocol that Coaty uses internally interchangeable.

Among other refactorings, Coaty 2 carries breaking changes regarding package
naming and import declarations, IO routing, and the communication protocol.
Therefore, Coaty 2 applications are no longer backward-compatible and
interoperable with Coaty 1 applications. However, the essential set of
communication event patterns didn't change.

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

Coaty 2 provides a scoped npm package named `@coaty/core` instead of `coaty`.
Rewrite all import declarations `coaty/<modulename>` to use `@coaty/core` as
follows:

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

---
Copyright (c) 2020 Siemens AG. This work is licensed under a
[Creative Commons Attribution-ShareAlike 4.0 International License](http://creativecommons.org/licenses/by-sa/4.0/).
