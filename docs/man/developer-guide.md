---
layout: default
title: Coaty JS Documentation
---

# Coaty Developer Guide

> This document refers to Coaty 2. To upgrade to Coaty 2, take a look at the
> [Migration Guide](https://coatyio.github.io/coaty-js/man/migration-guide/).

This document covers everything a developer needs to know about using the Coaty
framework to implement collaborative IoT applications targeting Node.js, as well
as mobile and web apps. We assume you know nothing about Coaty JS before reading
this guide.

## Table of Contents

* [Introduction](#introduction)
* [Learn how to use](#learn-how-to-use)
* [Getting started](#getting-started)
* [Framework technology stack](#framework-technology-stack)
* [Framework structure](#framework-structure)
* [Framework design](#framework-design)
  * [Define and configure container components](#define-and-configure-container-components)
  * [Bootstrap a Coaty container in Node.js](#bootstrap-a-coaty-container-in-nodejs)
  * [Bootstrap a Coaty container in Angular or Ionic](#bootstrap-a-coaty-container-in-angular-or-ionic)
  * [Access Coaty container components](#access-coaty-container-components)
  * [Shut down a Coaty container](#shut-down-a-coaty-container)
  * [Define an agent-specific controller class](#define-an-agent-specific-controller-class)
    * [Register controllers at run time](#register-controllers-at-run-time)
    * [Controllerless Coaty containers](#controllerless-coaty-containers)
* [Object model](#object-model)
  * [Define domain-specific object types](#define-domain-specific-object-types)
* [Communication event patterns](#communication-event-patterns)
  * [Starting and stopping communication](#starting-and-stopping-communication)
  * [Publishing events](#publishing-events)
  * [Observing events](#observing-events)
  * [Deferred publication and subscription of events](#deferred-publication-and-subscription-of-events)
  * [Namespacing](#namespacing)
  * [Advertise event pattern - an example](#advertise-event-pattern---an-example)
  * [Deadvertise event pattern - an example](#deadvertise-event-pattern---an-example)
  * [Channel event pattern - an example](#channel-event-pattern---an-example)
  * [Discover - Resolve event pattern - an example](#discover---resolve-event-pattern---an-example)
  * [Query - Retrieve event pattern - an example](#query---retrieve-event-pattern---an-example)
  * [Update - Complete event pattern - an example](#update---complete-event-pattern---an-example)
  * [Call - Return event pattern - an example](#call---return-event-pattern---an-example)
  * [Raw event pattern - an example](#raw-event-pattern---an-example)
  * [Distributed lifecycle management](#distributed-lifecycle-management)
* [IO Routing](#io-routing)
  * [IO Routing communication event flow](#io-routing-communication-event-flow)
  * [IO Routing implementation](#io-routing-implementation)
* [Unified Storage API - Query anywhere - Retrieve anywhere](#unified-storage-api---query-anywhere---retrieve-anywhere)
  * [Persistent storage and retrieval of Coaty objects](#persistent-storage-and-retrieval-of-coaty-objects)
  * [NoSQL operations](#nosql-operations)
  * [SQL operations](#sql-operations)
  * [Local storage operations](#local-storage-operations)
  * [Transactions](#transactions)
  * [Database adapter extensions](#database-adapter-extensions)
  * [Use of database adapters](#use-of-database-adapters)
  * [Postgres adapter](#postgres-adapter)
  * [In-memory adapter](#in-memory-adapter)
  * [SQLite Node.js adapter](#sqlite-nodejs-adapter)
  * [SQLite Cordova adapter](#sqlite-cordova-adapter)
  * [Implement a custom database adapter](#implement-a-custom-database-adapter)
* [Convenience controllers](#convenience-controllers)
  * [Connection State Controller](#connection-state-controller)
  * [Object Lifecycle Controller](#object-lifecycle-controller)
  * [Object Cache Controller](#object-cache-controller)
  * [Historian Controller](#historian-controller)
* [Decentralized logging](#decentralized-logging)
* [Utilities](#utilities)
  * [Asynchronous promise operations](#asynchronous-promise-operations)
  * [Binary search and insert](#binary-search-and-insert)
  * [Localized ISO date-time formatting](#localized-iso-date-time-formatting)
  * [Deep comparison checks](#deep-comparison-checks)
* [Node.js utilities](#nodejs-utilities)
* [Multicast DNS discovery](#multicast-dns-discovery)
  * [Discover configuration URLs](#discover-configuration-urls)
  * [Discover broker or router](#discover-broker-or-router)
  * [Stop publishing mDNS services](#stop-publishing-mdns-services)
* [Scripts for Coaty agent projects](#scripts-for-coaty-agent-projects)
  * [Coaty broker for development](#coaty-broker-for-development)
  * [Generate project meta info at build time](#generate-project-meta-info-at-build-time)
    * [Generate project info by script](#generate-project-info-by-script)
    * [Generate project info by gulp task](#generate-project-info-by-gulp-task)
    * [Generate project info by a function](#generate-project-info-by-a-function)
  * [Release a project](#release-a-project)
    * [Version a release](#version-a-release)
    * [Cut a release](#cut-a-release)
    * [Push a release](#push-a-release)
    * [Publish a release](#publish-a-release)

## Introduction

Using the Coaty [koʊti] framework as a middleware, you can build distributed
applications out of decentrally organized application components, so called
*Coaty agents*, which are loosely coupled and communicate with each other in
(soft) real-time. The main focus is on IoT prosumer scenarios where smart agents
act in an autonomous, collaborative, and ad-hoc fashion. Coaty agents can run on
IoT devices, mobile devices, in microservices, cloud or backend services.

The Coaty framework provides a production-ready application and communication
layer foundation for building collaborative IoT applications in an easy-to-use
yet powerful and efficient way. The key properties of the framework include:

* a lightweight and modular object-oriented software architecture favoring a
  resource-oriented and declarative programming style,
* standardized event based communication patterns on top of an open
  publish-subscribe messaging protocol such as [MQTT](https://mqtt.org) or
  [WAMP](https://wamp-proto.org/),
* a platform-agnostic, extensible object model to discover, distribute, share,
  query, and persist hierarchically typed data, and
* rule based, context driven routing of IoT (sensor) data using smart backpressure
  strategies.

Coaty supports interoperable framework implementations for multiple platforms.
The Coaty JS package provides the cross-platform implementation targeted at
JavaScript/TypeScript, running as mobile or web apps in the browser, or as
Node.js services.

Coaty JS comes with complete API documentation, a Developer Guide, a Coding
Style Guide, best-practice examples, and additional extensions.

## Learn how to use

If you are new to Coaty or would like to learn more, we recommend reviewing the
[framework documentation](https://coatyio.github.io/coaty-js/) of the
[coaty-js](https://github.com/coatyio/coaty-js) project. This documentation
includes:

* a [Developer Guide](https://coatyio.github.io/coaty-js/man/developer-guide/)
  that provides the basics to get started developing an agent project with the
  Coaty JS framework,
* a complete [API
  documentation](https://coatyio.github.io/coaty-js/api/index.html) of all
  public type and member definitions of the Coaty JS framework sources,
* a [Coding Style
  Guide](https://coatyio.github.io/coaty-js/man/coding-style-guide/) for Coaty
  framework and application developers,
* a specification of the [Coaty communication
  event patterns](https://coatyio.github.io/coaty-js/man/communication-events/),
* guidance notes on [rights
  management](https://coatyio.github.io/coaty-js/man/rights-management/) in a
  Coaty application.
* a guide on the [OGC SensorThings API
  integration](https://coatyio.github.io/coaty-js/man/sensor-things-guide/) in
  Coaty JS.
* [Migration Guide](https://coatyio.github.io/coaty-js/man/migration-guide/) - a
  guide on migrating an existing Coaty JS application to a newer Coaty JS major
  release

Coaty JS also includes a set of fully documented [code
examples](https://github.com/coatyio/coaty-examples) that demonstrate best
practices and typical usage patterns.

Coaty JS also includes a ready-to-use
[template](https://github.com/coatyio/coaty-examples/tree/master/template/js)
for a Coaty agent running in Node.js and programmed in TypeScript. Copy and use
it as a blueprint for your own Coaty agent projects.

Coaty JS is also accompanied by a set of additional extensions to the core
framework supplied in separate projects on
[github](https://github.com/coatyio/). Extensions, such as connectors, adapters,
or building blocks, provide reusable functionality for specialized use cases and
application scenarios build on top of the Coaty core.

Finally, the integration tests delivered with the framework itself also provide
a valuable source of programming examples for experienced developers.

Note that the framework makes heavy use of the Reactive Programming paradigm
using RxJS observables. Understanding observables is an indispensable
prerequisite for developing applications with the framework. An introduction to
Reactive Programming can be found [here](http://reactivex.io/). Examples and
explanations can be found on the [RxJS](https://rxjs.dev/) and [Learn
RxJS](https://www.learnrxjs.io/) websites.

If you are new to TypeScript programming, we recommend to take a look at the
official [TypeScript website](http://www.typescriptlang.org/). Its "Playground"
is especially useful to interactively try some TypeScript code in your browser.

To program Coaty applications, we recommend to use [Visual Studio
Code](https://code.visualstudio.com/), a free, open source IDE that runs
everywhere. Install the VS Code extension "TypeScript TSLint Plugin" to enable
TypeScript linting within the IDE.

## Getting started

To build and run Coaty agents with the Coaty JS technology stack you need to
install the `Node.js` JavaScript runtime (version 8 or higher) globally on your
target machine. Download and installation details can be found
[here](http://nodejs.org/).

The framework uses the package dependency manager `npm` to download dependent libraries.
npm comes with `Node.js` so you need to install it first.

You can install the latest distribution package in your agent project as follows:

```sh
npm install @coaty/core
```

For detailed installation instructions, consult the
[README](https://github.com/coatyio/coaty-js/blob/master/README.md) in
section "Installing the framework".

## Framework technology stack

The Coaty JavaScript technology stack makes use of the following core
technologies:

* **TypeScript** - the framework's main programming language
* **RxJS** - the ReactiveX JavaScript library for asynchronous programming with
  observable streams

For communication bindings, the following messaging client libraries are used:

* **MQTT.js** - an MQTT client for the MQTT binding
* **autobahn-js** - a WAMP client for the WAMP binding

The framework can also make use of database driver packages to be required in
combination with the Unified Storage API:

* **pg** - JavaScript driver for PostgreSQL databases
* **cordova-sqlite-storage** - Cordova driver for SQLite databases
* **sqlite3** - Node.js driver for SQLite databases

## Framework structure

The Coaty framework consists of core and specialized *modules*, public APIs that
can be independently consumed. The core module includes:

* core object types
* event based communication
* essential controller classes
* runtime components
* utility functions

Functionality of the core module is consumed in your application by importing
from the scoped npm package `@coaty/core`, e.g.:

```ts
import { AdvertiseEvent, Async, Container, Controller, Task } from "@coaty/core";
```

Moreover, specialized modules can be used independently by Coaty agents
requiring functionality beyond the core. These modules may also be specific to a
platform, like Node.js or browsers:

* `db` - Unified Storage API module with generic functionality
* `db-adapter-<name>` - modules for platform-specific DB adapters:
  * `db-adapter-postgres` - PostgreSQL adapter for Node.js
  * `db-adapter-sqlite-cordova` - SQLite adapter for Cordova apps
  * `db-adapter-sqlite-node` - SQLite adapter for Node.js
  * `db-adapter-in-memory` - In-memory NoSQL database adapter for Node.js and
    browsers
* `io-routing` - module for IO Routing
* `runtime-angular` - Coaty integration into Angular / Ionic
* `runtime-node` - Node.js specific utilities for Coaty applications
* `sensor-things` - module for SensorThings API
* `sensor-things-io` - hardware interfaces for SensorThings API

Functionality of a specialized module is consumed in your application by
importing from `@coaty/core/<module>` or `@coaty/core/<module>/<submodule>`,
e.g.:

```ts
import { DbContext } from "@coaty/core/db";
import { PostgresAdapter } from "@coaty/core/db/adapter-postgres";
import { Sensor, Thing } from "@coaty/core/sensor-things";
import { Aio, InputGpio, OutputGpio } from "@coaty/core/sensor-things/io";
```

The framework distribution package `@coaty/core` deploys all modules as ES5
sources in CommonJS module format, so they can be used by both Node.js and a
browser.

The deployed JavaScript sources are meant to be used by a bundler such as
Webpack, SystemJS Builder, Rollup, or Browserify or to be directly consumed by a
Node.js runtime. The sources also include TypeScript type definitions providing
support to TypeScript tooling for things like type checking and code completion
(e.g. Intellisense in Visual Studio Code).

## Framework design

Coaty JS is realized as an inversion of control (IOC) framework with a component
design that supports dependency injection (DI) and lifecycle management (LM):

* **Container**: An IoC container that defines the entry and exit points for any
  Coaty agent. It provides lifecycle management for container components by
  realizing a register-resolve-release pattern. The container is responsible for
  composing the graph of components using constructor dependency injection.

* **Controller**: A container component that encapsulates business communication
  logic. A controller publishes and observes communication events, provides
  observable state to the agent project (e.g. views), supports lifecycle
  management, etc. A Coaty container can contain any number of controllers which
  can be specified either declaratively or programmatically.

* **Communication Manager**: Each container contains exactly one instance of the
  `CommunicationManager` class that provides publish-subscribe for communication
  event patterns to exchange typed object data by an underlying messaging
  protocol.

* **Configuration**: A `Configuration` object that defines configuration options
  for the declared controllers as well as common, communication, and database
  related options.

* **Runtime**: Each container contains exactly one instance of the `Runtime`
  class that provides access to container’s runtime data, including
  configuration options, as well as platform and framework meta information.

A Coaty agent project should interact with its Coaty container as follows:

1. Define and configure all components that should be part of the container.
2. Bootstrap the container on startup.
3. Dynamically register components at run time (optional).
4. Shutdown the container on exit or whenever it is no longer needed (optional).

### Define and configure container components

By default, each Coaty container contains a Communication Manager, a Runtime,
and a Configuration object. Application-specific controllers are classes derived
from the base `Controller` class provided by the framework. They are declared as
part of a container by the `Components` interface object.

```ts
import { Components } from "@coaty/core";

import { ProductionOrderController, SupportTaskController, WorkflowController } from "./controllers";

const components: Components = {
    controllers: {
        ProductionOrderController,
        SupportTaskController,
        WorkflowController
    },
};
```

The configuration options for the container components are specified by a separate
Configuration interface object:

```ts
import { Configuration } from "@coaty/core";

const configuration: Configuration = {
    common: {
         // Common options shared among all container components
         agentIdentity: ... ,
         agentInfo: ... ,
         ...
    },
    communication: {
          // Options used for communication
          binding: ...,
          shouldAutoStart: ... ,
          ...
    },
    controllers: {
        // Controller-specific configuration options
        ProductionOrderController: {
            ...
        },
        SupportTaskController: {
            ...
        },
        WorkflowController: {
            ...
        },
    },
    ...
};
```

A container maintains an object of type `Identity` that provides metadata of the
agent, including its `name`, a unique object ID, etc. This object can be
initialized in common options by the `agentInfo` property. A Coaty agent keeps
track of other agents in a Coaty network by monitoring agent identities. For
details, see this [section](#distributed-lifecycle-management).

> **Tip**: The `common.extra` property can be used to inject arbitrary service
> instances to be shared among controllers.

### Bootstrap a Coaty container in Node.js

In a Node.js environment you can bootstrap a Coaty container synchronously
on startup by registering and resolving the declared container components:

```ts
import { Container } from "@coaty/core";

const container = Container.resolve(components, configuration);
```

You can also retrieve the configuration object from a local JSON or JS file:

```ts
import { NodeUtils } from "@coaty/core/runtime-node";

const configuration = NodeUtils.provideConfiguration("app.config.json");
```

Alternatively, you can bootstrap a container asynchronously by retrieving
the Configuration object from a Url:

```ts
import { Container } from "@coaty/core";
import { NodeUtils } from "@coaty/core/runtime-node";

// Returns a promise on a container for the given components and config options
Container
    .resolveAsync(
        components,
        NodeUtils.provideConfigurationAsync("http://myconfighost/app.config.json"))
    .then(container => ...);
```

Note that the Communication Manager can be started automatically after all
container components have been resolved. To do this, set the configuration
setting `shouldAutoStart` to `true` in the communication options (opt-in).
Otherwise, you have to start the Communication Manager explicitely by invoking
its `start` method.

### Bootstrap a Coaty container in Angular or Ionic

Coaty projects built with Angular or Ionic can inject all components of a Coaty
container as Angular providers to make use of Angular constructor dependency
injection.

Use the `provideComponents` function to retrieve Angular providers for all
components of the given Coaty container. The returned array of providers should
be passed as `extraProviders` argument to the Angular bootstrap function:

```ts
import { platformBrowserDynamic } from "@angular/platform-browser-dynamic";

import { Container } from "@coaty/core";
import { provideComponents } from "@coaty/core/runtime-angular";

import { components, configuration } from "./app.config";
import { AppModule } from "./app.module";

const container = Container.resolve(components, configuration);

platformBrowserDynamic(provideComponents(container)).bootstrapModule(AppModule)
    .catch(err => console.error(err));
```

You can now use any of the container components as constructor dependencies in
your Angular app or view components:

```ts
@Component(...)
export class AppComponent {
    constructor(
        comManager: CommunicationManager,
        zone: NgZone
    ) {
        // Start Communication Manager inside Angular zone
        zone.run(() => comManager.start());
        ...
    }
}

@Component(...)
export class ViewComponent1 {
    constructor(
        private _container: Container,
        private _runtime: Runtime,
        private _productionOrderCtrl: ProductionOrderController
    ) {
    }
}
```

Note that the Communication Manager should be started and stopped inside the
Angular zone, so that Angular data bindings on observables returned by the
Communication Manager are triggered whenever new events are emitted. In Angular,
this can be achieved e.g. by starting/stopping the Communication Manager within
a `zone.run` invocation on the Angular root component. You can also start/stop
the Communication Manager inside every Angular view component or *without* using
`zone.run`.

In Ionic you can start the communication manager after the platform is ready:

```ts
@Component(...)
export class MyApp {
    constructor(
        public platform: Platform,
        private _comManager: CommunicationManager) {
        this.initializeApp();
    }

    initializeApp() {
        // Synchronous invocation in then clause are inside Angular zone implicitely.
        // For asynchronous invocation in then clause, explicitely wrap zone.run().
        this.platform.ready().then(() => this._comManager.start());
    }
}
```

As an alternative to the aforementioned approach, you can also create and
resolve Coaty containers explicitely in an Angular service class. Then, inject
this service into your view components to access the container components, such
as controllers, communication manager, runtime and options. This approach is
especially useful if you want to host multiple Coaty containers within your app,
e.g. to embed distinct Coaty containers in lazy loaded Angular modules. The
Coaty [Remote
Operations](https://github.com/coatyio/coaty-examples/tree/master/remote-operations/js)
example uses this method.

The local communication flow between a Coaty controller and an Angular view
component should be modelled by RxJS observables. Either use the Coaty event
observables directly or create your own ones. Observables can be efficiently
handled inside Angular view templates using the `async` pipe.

> To optimize change detection on complex hierarchical Angular views, your
> Angular and Ionic view components that process data from Coaty events should
> always use the change detection strategy `OnPush`.

Subscriptions to observables retrieved by the Communication Manager should be
unsubscribed as soon as they are no longer needed. If you bind an observable
using the `async` pipe in Angular, associated subscriptions are automatically
disposed before the view component is destroyed. If you subscribe to an
observable explicitely in a view component, you should unsubscribe when the view
is destroyed in the `OnDestroy` interface method.

#### Coaty and Angular CLI

If you make use of Angular CLI to bundle your Coaty web app for the browser, you
have to consider the following topic. Starting with Angular CLI 6, the
underlying webpack doesn't configure any shims for Node.js any more. But Coaty
JS binding libraries require some Node.js polyfills (for process, global,
Buffer, etc.) when run in the browser.

To solve this problem, webpack needs to be reconfigured to polyfill or mock
required Node.js globals and modules. This extra Node.js configuration is
specified in a `webpack.node-polyfills.config.js` file in the root folder of the
project:

```js
module.exports = {
    // These options configure whether to polyfill or mock certain Node.js globals and modules.
    // This allows code originally written for the Node.js environment to run in other environments
    // like the browser.
    //
    // Starting with Angular CLI 6, webpack doesn't configure these shims for Node.js global variables
    // any more by default. But some of these (process, global, Buffer, etc.) are required by
    // dependency modules of bindings (e.g. MQTT.js for MQTT binding, autobahn-js for WAMP binding)
    // when run in the browser.
    node: {
        // For MQTT.js
        console: false,
        global: true,
        process: true,
        __filename: "mock",
        __dirname: "mock",
        Buffer: true,
        setImmediate: true,

        // For autobahn-js
        fs: "empty",

        // See "Other node core libraries" for additional options: https://v4.webpack.js.org/configuration/node/
    }
};
```

The Angular project configuration in `angular.json` must be adjusted to
integrate the custom webpack config file by using custom builders for the build
and serve targets:

```json
    "architect": {
        "build": {
          "builder": "@angular-builders/custom-webpack:browser",
          "options": {
            "customWebpackConfig": {
                "path": "./webpack.node-polyfills.config.js"
             },
          ...
        "serve": {
          "builder": "@angular-builders/custom-webpack:dev-server",
          ...
```

Finally, install the custom builder as development dependency of your project:

```sh
npm install @angular-builders/custom-webpack --save-dev
```

### Access Coaty container components

You can access the components or identity of a container directly using one of
these accessors/methods:

```ts
container.identity
container.runtime
container.communicationManager
container.getController(controllerName)
container.mapControllers(callback)
```

### Shut down a Coaty container

Before the Coaty agent exists, or if you no longer need the container, shut down
the container to release all registered components and its allocated system
resources:

```ts
container.shutdown();
```

The shutdown method shuts down all container controllers by invoking the
component's `onDispose` method (in arbitrary order). Finally, the Communication
Manager's `onDispose` method is called which unsubscribes all subscriptions and
disconnects the agent from the communication infrastructure.

After invoking shutdown, the container and its components are no longer usable.

Note that the `onDispose` method of container components is only called when the
container is shut down by invoking the `shutdown` method. You should not perform
important side effects in `onDispose`, such as saving agent state persistently,
because the `onDispose` method is not guaranteed to be called by the framework
in every circumstance, e.g., when the agent process terminates abnormally or
when the `shutdown` method is not used by your app.

### Define an agent-specific controller class

Agent-specific controller classes realize custom business communication logic of
a Coaty agent. A controller

* exchanges object data with other agent controllers by publishing
  and observing communication events.
* provides observable state to other parts of the project, such as views.
* provides methods for lifecycle management.

In accordance with the design principle of separation of concerns, each
custom controller class should encapsulate a single dedicated functionality.

To combine or aggregate the functionalities of multiple controllers, use
a separate service class in your agent project (e.g. an injectable service
in Angular) or define a superordinate controller that references the
other controllers (see use of delegation design pattern in the next section).

> Note that the Coaty framework provides some ready-to-use convenience
> controller classes that you can reuse in your agent project. For details, see
> this [section](#convenience-controllers).

The following template shows how to set up the basic structure of a custom
controller class:

```ts
import { map } from "rxjs/operators";

import { Controller, CoreTypes, Task } from "@coaty/core";

export class SupportTaskController extends Controller {

    onInit() {
        super.onInit();

        // Define application-specific initializations here.
    }

    onCommunicationManagerStarting() {
        super.onCommunicationManagerStarting();

        // Set up observations for incoming events here.
        this._observeAdvertiseTask();
    }

    onCommunicationManagerStopping() {
        super.onCommunicationManagerStopping();

        // Define application-specific cleanup tasks here.
    }

    private _observeAdvertiseTask() {
        this.communicationManager.observeAdvertiseWithObjectType("com.helloworld.SupportTask")
            .pipe(map(event => event.data.object as SupportTask))
            .subscribe(task => {
                // Do something whenever a support task object is advertised
            });
    }
}
```

You can define the `onInit` lifecycle method in your custom controller class to
perform side effects when the container's components have been set up
completely. Although the base implementation does nothing you should ensure
calling `super.onInit()` in your override method; especially if your custom
controller class extends from another custom controller class and not from the
base `Controller` class directly.

In your `onInit` override, you can also access other container components. For
example, access another controller like this:

```ts
onInit() {
    // Cache another controller to be used later.
    this._tasksController = this.container.getController<TasksController>("TasksController");
}
```

You can override the following lifecycle methods in your custom controller class
to perform side effects when the operating state of the Communication Manager
changes (see section on Communication Manager below).

```ts
onCommunicationManagerStarting()
onCommunicationManagerStopping()
```

Usually, in the starting method, observers for incoming communication events are
set up; whereas in the stopping method you should perform application-specific
cleanup actions. Note that here you don't need to unsubscribe RxJS Observable
subscriptions returned by the Communication Manager, as this is done
automatically.

> Ensure you always call the corresponding super method in your overridden method.

#### Register controllers at run time

A controller can also be dynamically registered and resolved at run time:

```ts
const myCustomCtrl = container.registerController(
    "MyCustomController",
    MyCustomController,
    { <controller configuration options> });
```

If your custom controller needs to access functionality of other controllers, two
different design patterns can be used:

1. Inheritance: Extend your controller class from another controller class.
2. Delegation: provide instance member(s) that refer to the dependent controller(s).

By using the delegation pattern, your custom controller instance should set up
the references to dependent controllers in the `onInit` lifecycle method as
explained in the previous section. Here, you can also dynamically create and
register a dependent controller that has not been configured in the container
configuration by using `Container.registerController`.

> Note that the delegation design pattern supports exchanging communication
> events between your custom controller and its dependent controllers. This is
> not possible with the inheritance pattern.

#### Controllerless Coaty containers

Although not recommended, you can run a Coaty container without any controllers.
This is useful if your application is designed in such a way that communication
functionality must be directly embedded into your existing business logic.

In this case, access the container's communication manager directly to publish
and observe communication events. A minimal Coaty container without controllers
can be set up as follows:

```ts
const container = Container.resolve({}, { <configuration options> });

// Use CommunicationManager directly.
container.communicationManager.publishAdvertise(...)
container.communicationManager.observeAdvertiseWithObjectType(...)
...
```

## Object model

The Coaty framework provides an opinionated set of core object types to be used
or extended by Coaty applications. These Coaty objects are the subject of
communication between Coaty agents. The core type hierarchy is defined in the
`@coaty/core` module and looks as follows:

```
CoatyObject
  |
  |-- Annotation
  |-- Identity
  |-- IoContext
  |-- IoNode
  |-- IoSource
  |-- IoActor
  |-- Location
  |-- Log
  |-- Snapshot
  |-- Task
  |-- User
```

> Note: Besides these core types, the framework also provides dedicated object
> types to manage sensor data. These object types are defined in the
> `@coaty/sensor-things` module and explained in detail in the guide on [OGC
> SensorThings API
> integration](https://coatyio.github.io/coaty-js/man/sensor-things-guide/).

Coaty objects are characterized as follows:

* Object types are represented as statically typed TypeScript interfaces of
  property - value-type definitions. Coaty applications can define custom object
  types that derive from one of the core types supplied by the framework.

* Objects solely represent attribute - value pairs that model state but no
  behavior.

* Objects are JSON compatible (JavaScript Object Notation) to support
  cross-component and cross-platform serialization.

* Objects can be persisted schemalessly in NoSQL and SQL data stores using the
  Unified Storage API of the framework.

* Objects can be used by and transfered across all Coaty system components,
  including devices, frontend apps, services, and even databases. There is no
  need to define separate DTOs (Data Transfer Objects) for communication.

* Objects are schema-validated by the framework according to their TypeScript
  interface definitions. Schema validation ensures that all specified property -
  value pairs of an object that is distributed across system components conform
  to the object type's shape. Schema validation comprises all properties of the
  core types defined by the framework. It is allowed to dynamically add
  additional properties to a core object at runtime. However, these properties
  are **not** validated. Likewise, additional properties of object types derived
  from a core type are **not** validated.

To enable the distributed system architecture to uniquely identify an object
without central coordination, each object has an object ID as a Version 4 UUID.
You can create UUIDs at runtime using the `Runtime` class: It provides both a
static as well as an instance method to generate UUIDs:

```ts
// Static UUID creation
Runtime.newUuid();

// Instance-based UUID creation
this.runtime.newUuid();
```

The base `CoatyObject` interface defines the following generic properties:

```ts
interface CoatyObject {
  coreType: "CoatyObject" | ...;
  objectType: string;
  name: string;
  objectId: Uuid;
  externalId?: string;
  parentObjectId?: Uuid;
  locationId?: Uuid;
  isDeactivated?: boolean;
}
```

The property `coreType` is the framework core type name of the object; it
corresponds with the name of the interface that defines the object's shape.

The `objectType` property is the concrete type name of the object in a canonical
form. It should be defined using a hierarchical naming pattern with some levels
in the hierarchy separated by periods (`.`, pronounced "dot") to avoid name
collisions, following Java package naming conventions (i.e.
`com.domain.package.Type`). All predefined object types use the form
`coaty.<InterfaceName>`, e.g. `coaty.CoatyObject` (see constants in `CoreTypes`
class). Do not use the reserved toplevel namespace `coaty.*` for your
application defined object types.

The concrete and core type names of all predefined object types are defined
as static properties of the `CoreTypes` class in the framework `model` module.

The `name` property defines a descriptive name for the object.

The `objectId` property defines the unique identity of an object within the
system.

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
The concrete definition meaning of this property is defined by the Coaty
application. The property value is optional and defaults to false.

Application specific object types can be defined based on the predefined core
object types by adding additional property-value pairs. Allowed value types must
conform to JSON data types.

### Define domain-specific object types

Simply extend one of the predefined object types of the framework and specify
a canonical object type name for the new object:

```ts
import { Task, User } from "@coaty/core";

export const modelTypes = {
    OBJECT_TYPE_HELLO_WORLD_TASK: "com.helloworld.Task",
};

/**
 * Represents a Hello World task or task request.
 */
export interface HelloWorldTask extends Task {

    /**
     * Level of urgency of the HelloWorldTask
     */
    urgency: HelloWorldTaskUrgency;
}

/**
 * Defines urgency levels for HelloWorld tasks
 */
export enum HelloWorldTaskUrgency {
    Low,
    Medium,
    High,
    Critical
}
```

A `HelloWorldTask` object can be created as follows (within a controller class):

```ts
const taskIssuer: User = {
    objectId: "464be2ed-bb1d-40b2-9943-944f3a2c5720",
    coreType: "User",
    objectType: CoreTypes.OBJECT_TYPE_USER,
    name: "service@coaty.io",
    names: { formatted: "HelloWorld Task Issuer" },
};

const task: HelloWorldTask = {
    objectId: this.runtime.newUuid(),
    objectType: modelTypes.OBJECT_TYPE_HELLO_WORLD_TASK,
    coreType: "Task",
    name: `Hello World Task`,
    creatorId: taskIssuer.objectId,
    creationTimestamp: Date.now(),
    status: TaskStatus.Request,
    urgency: HelloWorldTaskUrgency.Critical,
};
```

## Communication event patterns

By default, each Coaty container has a *Communication Manager* component that is
registered implicitely with the container. It provides an essential set of
one-way and two-way communication event patterns to exchange object data in a
decentralized Coaty application:

* **Advertise** an object: multicast an object to parties interested in objects
  of a specific core or object type.
* **Deadvertise** an object by its unique ID: notify subscribers when capability
  is no longer available; for abnormal disconnection of a party, last will
  concept of Coaty is implemented by sending this event.
* **Channel** Multicast objects to parties interested in any kind of objects
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

Coaty not only provides *one-way* communication event patterns, such as
Advertise and Channel, that support classic publish-subscribe interaction
between Coaty agents. With *two-way* event patterns, *request-response*
interaction between Coaty agents can be realized, similar to, for example,
HTTP/REST or RPC.

While traditional request-response interaction is always directed towards a
single concrete endpoint that must be known by the requester, Coaty two-way
request-response event patterns share the characteristics of publish-subscribe
communication: A request event is always directed towards all subscribers which
are interested in this kind of event. Response events are published by all
subscribers that are willing to provide answers. This means that response events
for a single request event can be provided independently by multiple
subscribers, and each subscriber can publish multiple responses over time.

The use case specific logic implemented by the requester determines how to
handle such responses. For example, the requester can decide to

* just take the first response and ignore all others,
* only take responses received within a given time interval,
* only take responses until a specific condition is met,
* handle any response over time, or
* process responses as defined by any other application-specific logic.

Using this "open channel" communication, you can realize advanced interaction
scenarios beyond classic request-response in a very simple way. For example, by
introducing *live queries*, a Query event responder could monitor the database
for changes and publish a Retrieve event with the latest query result every time
the concerned data is updated. In this way, inefficient manual database polling
is replaced by an efficient automatic push-based approach that helps your
application feel quick and responsive.

To give you another example, it may be desirable for some remote operation calls
to have a progressive series of call results, e.g. to return partial data in
chunks or progress status of long running operations, even simultaneously by
different callees.

Internally, events are emitted and received by the Communication Manager using
a specific publish-subscribe messaging transport abstracted by *communication
bindings*. Events are passed to Coaty controllers by following the Reactive
Programming paradigm using RxJS observables.

The Communication Manager provides features to transparently control the
underlying publish-subscribe communication layer, including auto-reconnect,
automatic re-subscription upon connection, and queued offline publishing.

When initializing the Communication Manager you can customize characteristics of
the underlying communication binding in the configuration property
`CommunicationOptions.binding`.

### Starting and stopping communication

Use the `CommunicationManager.start()` method to connect to the underlying
communication infrastructure. Note that the Communication Manager automatically
starts after the container is resolved if the communication option
`shouldAutoStart` is set to `true` (opt-in). While started, the communication
manager automatically tries to reconnect periodically whenever the communication
connection is lost.

Use the `CommunicationManager.start(options)` method to re-establish
communication with new communication options.

Use the `CommunicationManager.stop` method to permanently disconnect from the
underlying communication infrastructure. Afterwards, events are no longer
dispatched and emitted. You can start the Communication Manager sometime later
using the `start` method.

Whenever the operating state of the Communication Manager changes by invoking
one of the above method calls all the controllers of the container are notified
by the following lifecycle methods:

```ts
Controller.onCommunicationManagerStarting()
Controller.onCommunicationManagerStopping()
```

When used inside Angular or Ionic, the Communication Manager must be started
inside an Angular zone, so that Angular data bindings on observables returned
by the Communication Manager are triggered whenever new events are emitted.
In Ionic, this can e.g. be achieved by starting the Communication Manager
from within the `platformReady` callback on the Ionic root component or from
within any Ionic Component Page.

Use the `CommunicationManager.observeCommunicationState` method to observe
communication state changes of the underlying messaging transport connection to
the Coaty communication infrastructure (i.e. online or offline). Usage of this
feature is further simplified by the convenience method
`NodeUtils.logCommunicationState` and by a convenience controller class named
[`ConnectionStateController`](#connection-state-controller).

### Publishing events

Use `publishAdvertise` to send Advertise events. The core type (`coreType`) and
the object type (`objectType`) of the advertised object is used to deliver
corresponding events to parties observing Advertise events for the same core
or object type.

Use `publishDeadvertise` to send Deadvertise events for objects by specifying
their object IDs.

Use `publishChannel` to send Channel events. A channel identifier must be
specified. It is used to deliver the channeled objects to parties observing
Channel events for the same channel identifier.

Use `publishDiscover` to send Discover events. The observable returned will emit
all the Resolve events which are direct responses to the published request. Be
aware that multiple Resolve events may be emitted from different parties which
may have different payloads: some may be responding with an object, some with
related objects, and some with both. Your Resolve event handler must
differentiate these cases carefully. For example, if you are discovering an
object ID and you are only interested in related objects (e.g. annotation
objects) you have to ignore response events which only provide an object but no
related objects. The `DiscoverEventData` class provides convenience methods to
differentiate between supported payloads: `isDiscoveringExternalId`,
`isDiscoveringObjectId`, `isDiscoveringExternalAndObjectId`,
`isDiscoveringTypes`, `isCoreTypeCompatible`, `isObjectTypeCompatible`. The
`matchesObject` method can be used to determines whether a given object matches
the requirements of incoming discover event data.

Use `publishUpdate` to send Update events. The observable returned will
emit all the Complete events which are direct responses to the published request.

Use `publishQuery` to send Query events. The observable returned will
emit all the Retrieve events which are direct responses to the published request.

Use `publishCall` to send Call events. The observable returned will
emit all the Return events which are direct responses to the published request.

> Note that by design, there is no echo suppression of communication events. The
> communication manager dispatches any incoming event to every controller that
> *observes* it, even if the controller published this event itself.
> 
> If echo suppression of communication events is required for your custom
> controller, place it into its *own* container and *filter out* observed events
> whose event source ID equals the object ID of the container's identity, like
> this:
>
> ```ts
> this.communicationManager.observeDiscover()
>     .pipe(filter(event => event.sourceId !== this.container.identity.objectId))
>     .subscribe(event => {
>         // Handle non-echo events only.
>     });
> ```

> Note that all publish methods for request-response event patterns, i.e.
> `publishDiscover`, `publishUpdate`, `publishQuery`, and `publishCall` publish
> the specified event **lazily**, i.e **not until** the first observer
> subscribes to the observable returned by the method. In this way race
> conditions on the response event can be avoided. After all initial subscribers
> have unsubscribed no more response events will be emitted on the observable.
> Instead, errors will be emitted to all subsequent resubscribers.

Note that RxJS subscriptions of Observables returned by request-response publish
methods are **automatically disposed** when the communication manager is
stopped, in order to release system resources and to avoid memory leaks. It is
therefore recommended to set up all these publish methods anew in the
controller's `onCommunicationManagerStarting()` method.

However, you should still unsubscribe *as early as* possible, i.e. as soon as
the expected response event(s) have been received; e.g. by using the RxJS `take`
or `timeout` operators like the following:

```ts
import { take, timeout } from "rxjs/operators";

this.communicationManager.publishDiscover(...)
    .pipe(
        // Unsubscribe automatically after first response event arrives.
        take(1),

        // Issue an error notification if no response is emitted within 2000ms.
        timeout(2000)
    )
    .subscribe(
        event => {
            // Handle the first response event; all others are discarded.
        },
        error => {
            // Handle timeout.
        });
```

A similar coding pattern to manually unsubscribe from observables that are no
longer needed uses the RxJS `takeUntil` operator with an RxJS `Subject` like the
following:

```ts
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { Controller } from "@coaty/core";

class MyController extends Controller {

    private _stopped$ = new Subject();

    onCommunicationManagerStarting() {
        super.onCommunicationManagerStarting();

        this.communicationManager.publishDiscover(...)
            .pipe(
                // After first emission on the stopped subject, stop processing and unsubscribe.
                takeUntil(this._stopped$),
            )
            .subscribe(event => {
                // Handle response events until stopped subject emits.
                this.handleResponseEvent(event);
            });
    }

    handleResponseEvent(event: ResolveEvent) {

        // Process the received event data...

        if (shouldFinishProcessing) {
            // Cancel processing of response events by emitting a value.
            this._stopped$.next();
            this._stopped$.complete();
        }
    }
}
```

This pattern is especially useful if you want to unsubscribe from multiple
observables on an external trigger. However, note that the `takeUntil` operator
should always be the *last* operator in a pipe, so that previous operators that
involve subscriptions of another observable source are properly unsubscribed as
well and don’t leak. A detailed explanation is given
[here](https://blog.angularindepth.com/rxjs-avoiding-takeuntil-leaks-fb5182d047ef).

### Observing events

Use any of the `observeDiscover`, `observeQuery`, `observeUpdateWithCoreType`,
`observeUpdateWithObjectType`, `observeCall`, `observeAdvertiseWithCoreType`,
`observeAdvertiseWithObjectType`, `observeDeadvertise`, `observeChannel` methods
to observe incoming request events in your agent. For `observeDiscover`,
`observeQuery`, `observeUpdateWithCoreType`, `observeUpdateWithObjectType`, or
`observeCall`, invoke the `resolve`, `retrieve`, `complete`, or `returnEvent`
method on the received event object to send a response event.

Note that there is no guarantee that response events are ever delivered by the
Discover, Query, Update, and Call communication patterns. Depending on your
system design and context such a communication pattern might return no responses
at all or not within a certain time interval. In your agent project, you should
handle these cases by chaining a timeout handler to the observable returned by
the observe method (see code examples in the next sections).

Note that RxJS subscriptions of Observables returned by
`CommunicationManager.observe...()` methods are **automatically disposed** when
the communication manager is stopped, in order to release system resources and
to avoid memory leaks. It is therefore recommended to set up all these
observation requests anew in the controller's `onCommunicationManagerStarting()`
method.

### Deferred publication and subscription of events

Execution of the above publish and observe methods will be automatically
deferred, if the Communication Manager is either stopped or started but offline,
i.e. not connected currently.

All your *subscriptions* issued while the Communication Manager is stopped or
started (both online and offline) will be (re)applied when it (re)connects
again. *Publications* issued while the Communication Manager is stopped or
offline will be applied only after the next (re)connect. Publications issued in
online state will *not* be deferred, i.e. not reapplied after a reconnect.

If you stop the Communication Manager by executing its `stop` method, all
deferred publications and subscriptions will be discarded.

### Namespacing

To separate the communication traffic of different Coaty applications running in
the same networking infrastructure (e.g. on the same MQTT broker), Coaty adds a
namespacing mechanism. Communication events are only routed between agents
within a common communication namespace.

You should specify a namespace string in the communication options
(`CommunicationOptions.namespace`). If not specified (default) or empty, the
agent is assigned a default namespace named "-".

To enable cross-namespace communication between agents in special use cases,
e.g. for monitoring purposes, an agent can choose to receive communication
events published by *any* agent in the same networking infrastructure,
regardless of namespace (see
`CommunicationOptions.shouldEnableCrossNamespacing`). By default, this option is
not enabled.

> Note that communication namespacing is not supported for Raw events and IO
> value events with external routes.

### Advertise event pattern - an example

The Advertise event is used to communicate Coaty objects to agents interested in
a specific type of object. Advertise events can be observed based on either an
object's core type (`coreType`) or an object's object type (`objectType`).

```ts
import { filter, map } from "rxjs/operators";

// Publish an Advertise event for a Task object
this.communicationManager
    .publishAdvertise(AdvertiseEvent.withObject(task)));


// Observe Advertise events on all objects of core type "Task"
this.communicationManager
    .observeAdvertiseWithCoreType("Task")
    .pipe(
        map(event => event.data.object as Task),
        filter(task => task.status === TaskStatus.Request)
    )
    .subscribe(task => {
         // Handle task request emitted by Advertise event
    });

// Observe Advertise events on objects of object type "com.helloworld.Task"
this.communicationManager
    .observeAdvertiseWithObjectType("com.helloworld.Task")
    .pipe(
        map(event => event.data.object as HelloWorldTask),
        filter(task => task.status === TaskStatus.Request)
    )
    .subscribe(task => {
         // Handle HelloWorld task request emitted by Advertise event
    });
```

### Deadvertise event pattern - an example

The Deadvertise event works in combination with the Advertise event. By
publishing a Deadvertise event with the unique object ID of an object, you can
notify observers that this object (which has been advertised earlier) is no
longer available:

```ts
import { map } from "rxjs/operators";

const object: CoatyObject = {
    objectid: "3b820148-e3e1-42d6-8d20-425e54670b06",
    ...
};

// Publish a Deadvertise event
this.communicationManager
    .publishDeadvertise(DeadvertiseEvent.withObjectIds(object.objectId));

// Observe Deadvertise events
this.communicationManager
    .observeDeadvertise()
    .pipe(map(event => event.data.objectIds))
    .subscribe(objectIds => {
        // Handle object IDs of deadvertised objects which have been advertised previously
    });
```

This concept is especially useful in combination with abnormal termination of an
agent and the last will concept of broker-based pub/sub systems. On connection
to the broker, the communication manager of a Coaty container sends a last will
message consisting of a Deadvertise event with the object ID of its identity
component. Whenever the agent disconnects normally or abnormally, the broker
publishes its last will message to all subscribers which observe Deadvertise
events. For details, see this [section](#distributed-lifecycle-management).

Using this pattern, agents can detect the online/offline state of other Coaty
agents and act accordingly. One typical use case is to set the parent object ID
(or a custom property) of advertised application root objects originating from a
specific Coaty agent to the identity ID of the agent's container. In case this
agent is disconnected, other agents can observe Deadvertise events and check
whether one of the deadvertised object IDs correlates with the parent object ID
(or custom property) of any application root object the agent is managing and
invoke specific actions.

To ease programming this pattern, Coaty provides a convenience controller class
named [`ObjectLifecycleController`](#object-lifecycle-controller). It keeps
track of specific agents/objects in a Coaty network by monitoring identity
components of communication managers, controllers or custom object types. The
controller observes advertisements and deadvertisements of such objects and
initially discovers them. Changes are emitted on an observable that applications
can subscribe to.

If you want to programm this pattern explicitely, the following example shows
how to observe the online/offline state of things and sensors with the Sensor
Things API.

The sensor device advertises the associated Thing object:

```ts
import { SensorThingsTypes, Thing } from "@coaty/core/sensor-things";

// This Thing object represents a sensor device
const thing: Thing = {
    name: "My Thing",
    objectType: SensorThingsTypes.OBJECT_TYPE_THING,
    coreType: "CoatyObject",
    objectId: ...,
    ...
};

// Associate communication manager's identity with thing
thing.parentObjectId = this.container.identity.objectId;
// Publish an Advertise event for Thing object
this.communicationManager
    .publishAdvertise(AdvertiseEvent.withObject(thing)));
```

An agent can observe the sensor device connection state as follows:

```ts
import { map } from "rxjs/operators";
import { SensorThingsTypes, Thing } from "@coaty/core/sensor-things";

// Observe Advertise events on Thing objects
this.communicationManager
    .observeAdvertiseWithObjectType(SensorThingsTypes.OBJECT_TYPE_THING)
    .pipe(map(event => event.data.object as Thing))
    .subscribe(thing => {
         // Store thing for later use
         this.onlineThings.push(thing);
    });

// Observe Deadvertise events
this.communicationManager
    .observeDeadvertise()
    .pipe(map(event => event.data.objectIds))
    .subscribe(objectIds => {
        const offlineThings = this.onlineThings.filter(t => objectIds.some(id => id === t.parentObjectId));
        // These things are no longer online.
        // Remove them from the onlineThings cache and perform side effects...
    });
```

### Channel event pattern - an example

The Channel event provides a very efficient way of pushing any type of Coaty
objects to observers that share a specific channel identifier. It differs from
Advertise events in that these are pushing objects of specific core or object
types to interested observers.

```ts
import { filter } from "rxjs/operators";

const channelId = "42";
const myObject = <any coaty object>;

// Publish a Channel event
this.communicationManager
    .publishChannel(ChannelEvent.withObject(channelId, myObject));


// Observe Channel events for the given channel ID
this.communicationManager
    .observeChannel(channelId)
    .pipe(filter(event => event.data.object))
    .subscribe(obj => {
         // Handle object emitted by channel event
    });
```

### Discover - Resolve event pattern - an example

The two-way Discover-Resolve communication pattern can be used to discover Coaty
objects of a certain core or object type and/or with a certain object ID or
external ID.

For example, by scanning the QR Code of a physical asset, which encodes its
external ID, the Discover event can resolve the Coaty object representation of
this asset.

```ts
import { filter, map, take, timeout } from "rxjs/operators";

// QR Code of asset
const externalId = "42424242";

// Publish a Discover event and observe first Resolve event response
this.communicationManager
    .publishDiscover(DiscoverEvent.withExternalId(externalId))
    .pipe(
        take(1),
        map(event => event.data.object),
        timeout(5000)
    )
    .subscribe(
        object => {
            // Handle object in Resolve response event
        },
        error => {
            // No response has been received within the given timeout period
            this.logError(error, "Failed to discover external ID");
        });

// Observe Discover events and respond with a Resolve event
this.communicationManager.observeDiscover()
    .pipe(filter(event => event.data.isDiscoveringExternalId))
    .subscribe(event => {
         // Agent-specific lookup of an object with given external ID.
         // Alternatively, use `event.data.matchesObject()` here to find a
         // match in a collection of objects.
         const object = findObjectWithExternalId(event.data.externalId);
         // Respond with found object in Resolve event
         event.resolve(ResolveEvent.withObject(object));
    });
```

Note that the Resolve event cannot only respond with a matching object, but can
alternatively or additionally provide related objects. The logic of resolving
Discover events is application specific and defined by the resolving agent. For
example, a Discover event that specifies an external id *in combination* with
the object types `Thing` and `Sensor` could be resolved by returning the `Thing`
object with the given external id and all sensor objects associated with this
thing as related objects.

To share object state between Coaty agents, the Discover-Resolve event pattern
is often used in combination with the Advertise event pattern. One agent
advertises new object state whenever it changes; other agents that are
interested in object state changes observe this kind of Advertise event. To
ensure that any interested agent immediately gets the latest object state on
connection, it should initially publish a Discover event for the object state.
The agent that advertises object state should observe these Discover events and
resolve the current object state.

The `ObjectCacheController` class applies this principle to look up and cache
objects with certain object IDs. In your own code, you can easily implement this
principle by *merging* the two observables emitting Resolve events and Advertise
events as follows:

```ts
import { merge } from "rxjs";
import { filter, map } from "rxjs/operators";

const discoveredTasks = this.communicationManager
    .publishDiscover(DiscoverEvent.withObjectTypes(["com.helloworld.Task"]))
    .pipe(
        filter(event => event.data.object !== undefined),
        map(event => event.data.object as HelloWorldTask)
    );

const advertisedTasks = this.communicationManager
    .observeAdvertiseWithObjectType("com.helloworld.Task")
    .pipe(
        map(event => event.data.object as HelloWorldTask),
        filter(task => task !== undefined)
    );

return merge(discoveredTasks, advertisedTasks)
            .subscribe(task => {
                // Handle discovered and advertised tasks as they are emitted.
            });
```

### Query - Retrieve event pattern - an example

The following example shows how objects can be seamlessly and transparently
retrieved from a database by publishing a Query event that specifies filtering,
join, and ordering criteria.

This example uses the Unified Storage API to retrieve objects from a
persistent or in-memory database. If you implement your own object storage
method, use the `QueryEventData.matchesObject()` method to find stored objects
that match the requirements of given query event data.

```ts
import { filter, take, timeout } from "rxjs/operators";

// Select log objects by filter conditions, then order and paginate results
const filter: ObjectFilter = {
    conditions: {
        and: [["logLevel", filterOp.between(LogLevel.Debug, LogLevel.Error)],
              ["logTags", filterOp.contains(["client", "service"])]]
    },
    skip: 200,
    take: 100,
    orderByProperties: [["logDate", "Desc"], ["logLevel", "Asc"]]
};

// Resolve object reference to property 'locationId‘ as extra property
// named 'resolvedLocation'
const joinCondition: JoinCondition = {
    localProperty: "locationId",
    asProperty: "resolvedLocation",
    isOneToOneRelation: true
};

// On the querying side, an agent publishes a Query event for Log objects
// with the given filter and join conditions and handles the results.
this.communicationManager
    .publishQuery(QueryEvent.withCoreTypes(["Log"], filter, joinCondition))
    .pipe(
        take(1),
        // Issue an error if queryTimeoutMillis elapses without any event received
        timeout(this.options["queryTimeoutMillis"])
    )
    .subscribe(
        event => {
            // Handle resulting log objects emitted by Retrieve event
            const logs = event.data.objects as Log[];
        },
        error => {
            // No response has been received within the given period of time
            this.logError(error, "Failed to query log objects");
        });

// On the retrieving side, an agent observes queries for Log objects
// and responds with a Retrieve event that contains results looked up
// from a database.
this.communicationManager
  .observeQuery()
  .pipe(filter(event => event.data.isCoreTypeCompatible("Log")))
  .subscribe(event => {
    const dbJoinCond = DbContext.getDbJoinConditionsFrom(
      event.data.objectJoinConditions,
      {
        localProperty: "locationId",
        fromCollection: "location",
        fromProperty: "objectId"
      });
    this.databaseContext
      .findObjects<Log>("log", event.data.objectFilter, dbJoinCond)
      .then(iterator => iterator.forBatch(logs => {
         event.retrieve(RetrieveEvent.withObjects(logs));
      }))
      .catch(error => {
         // In case of retrieval error, do not respond with a
         // Retrieve event. The sender of the query should
         // implement proper timeout handling.
      });
  });
```

### Update - Complete event pattern - an example

The Update-Complete pattern is used to update and synchronize object state
across agents. An agent can request or suggest an object update and receive
accomplishments by Complete events.

An Update request or proposal specifies an entire Coaty object as event data.

A responding Complete event signals accomplishment with the entire (usually
changed) object as event data. This approach avoids complex merging operations
of incremental change deltas in the agents. Since objects are treated as
immutable entities on the agent this approach is in line.

The Update-Complete pattern can also be used to propose potential object
changes. Observes can then express how to accept the proposal by responding with
a Complete event with modified properties.

```ts
import { take, map } from "rxjs/operators";

// Publish an Update event on a finished task object and observe first
// Complete event response from a persistent storage agent.
this.communicationManager.publishUpdate(
        UpdateEvent.withObject({
                objectId: "ea71320b-ac1b-45b1-abb1-8298d21e7f63",
                name: "MyTask",
                coreType: "Task",
                objectType: "mycompany.MyTask",
                creatorId: "b3aa27ae-deca-4e52-ab43-30c4c220e46e",
                creationTimestamp: ...,
                status: TaskStatus.Done,
                doneTimestamp: Date.now(),
            }
        }))
    .pipe(
        // Unsubscribe automatically after first response event arrives.
        take(1),
        map(event => event.data.object as Task),
    )
    .subscribe(
        task => {
            // Task has been persisted...
        });

// The persistent storage agent observes task updates and stores
// the changed object in a database. Afterwards, it responds
// with a Complete event containing the updated object.
this.communicationManager.observeUpdate()
    .subscribe(event => {
        const task = event.data.object;

        // Update task in database.
        ...

        // Signal completion.
        event.complete(CompleteEvent.withObject(task));
    });
```

### Call - Return event pattern - an example

The Call-Return pattern is used to request execution of remote operations
between agents. It is a one-to-many, two-way communication pattern where an
agent can request an operation with parameters to be performed by other agents
that are observing this operation and that can return results - or errors in
case the operation fails - to the requesting agent.

Unlike with classic remote procedure call (RPC), the Call-Return pattern
supports non-blocking remote operations to be executed by multiple remote
agents. The calling agent does not need to have any knowledge what other agents
are currently offering the operation, where these agents reside or how to
address them. This opens up the possibility to realize dynamic scenarios such as
load balancing or failover for remote operation calls. The calling agent can
also specify a context filter that defines conditions under which the operation
should be performed by a remote agent.

Typical use cases of the Call-Return pattern include smart distribution of
computational workloads to dedicated worker agents, and non safety critical, non
latency sensitive decentralized command and control applications.

> If you intend to use this pattern for safety critical remote operations,
> always consider strong encryption/security between Coaty agents and the
> broker, strong authentication and authorization, a higher QoS level, separate
> encryption of parameters/results, and a failure-tolerant broker
> implementation.

The following code snippet shows how to publish and observe Call events and how
to handle results delivered by Return events. You can find a complete and fully
documented code example that demonstrates the use of remote operations
[here](https://github.com/coatyio/coaty-examples/tree/master/remote-operations/js).

```ts
import { CallEvent, ContextFilter, filterOp } from "@coaty/core";

// Publish a Call event to switch on all lights with 70% brightness on the
// 6th, 7th, and 8th floor and observe all Return events received from light control agents.
const contextFilter: ContextFilter = { conditions: ["floor", filterOp.between(6, 8)] };

this.communicationManager.publishCall(
        CallEvent.with(
            "com.mydomain.lights.switchLight",
            { status: "on", brightness: 0.7 },
            contextFilter))
    .subscribe(
        returnEvent => {
            if (returnEvent.data.isError) {
                // An error has been returned by a light control agent.
                console.log(returnEvent.data.error.code);           // 10001
                console.log(returnEvent.data.error.message);        // "Failed"
                console.log(returnEvent.data.executionInfo);        // { lightId: "<id of light>" }
            } else {
                // A light has been switched on/off successfully by a light control agent.
                console.log(returnEvent.data.result);               // true
                console.log(returnEvent.data.executionInfo);        // { lightId: "<id of light>" }
            }
        });
```

```ts
import { RemoteCallErrorCode, RemoteCallErrorMessage, ReturnEvent } from "@coaty/core";

// A light control agent observes requests for switching on/off an associated light
// in its execution context (i.e 7th floor). If the context matches the passed in
// context filter, the Call event is emitted on the subscription handler which responds
// with a Return event.
const context: LightControlContext = {
    coreType: "CoatyObject",
    objectId: this.runtime.newUuid(),
    objectType: "com.mydomain.lights.LightControlContext",
    name: "LightControlContext for seventh floor",
    floor: 7,
};

this.communicationManager.observeCall("com.mydomain.lights.switchLight", context)
    .subscribe(event => {
        // For each remote call that matches the given context, a Call event is emitted.
        const status = event.data.getParameterByName("status");
        const brightness = event.data.getParameterByName("brightness");

        const executionInfo = { lightId: this.lightId };

        switch (status) {
            case "on":
                // Try to switch light on with requested brightness, then return result or error.
                switchLightOn(this.lightId, brightness)
                    .then(() => event.returnEvent(ReturnEvent.withResult(true, executionInfo)))
                    .catch(error => event.returnEvent(ReturnEvent.withError(10001, "Failed", executionInfo)));
                break;
            case "off":
                // Try to switch light off, then return result or error.
                switchLightOff(this.lightId)
                    .then(() => event.returnEvent(ReturnEvent.withResult(true, executionInfo)))
                    .catch(error => event.returnEvent(ReturnEvent.withError(10002, "Failed", executionInfo)));
                break;
            default:
                // Invalid parameter, return an error immediately.
                event.returnEvent(ReturnEvent.withError(
                            RemoteCallErrorCode.InvalidParameters,
                            RemoteCallErrorMessage.InvalidParameters,
                            executionInfo));
                break;
        }
    });
```

The name of the remote operation should be defined using a hierarchical naming
pattern with some levels in the hierarchy separated by periods (`.`, pronounced
"dot") to avoid name collisions, following Java package naming conventions (i.e.
`com.domain.package.operationname`).

Operation parameters (optional) must be specified either by-position through a
JSON array or by-name through a JSON object. On the remote end, individual
parameters can be retrieved by using either the getter
`CallEventData.parameters` or the methods
`CallEventData.getParameterbyName(<name>)`, or
`CallEventData.getParameterbyIndex(<zero-based index>)`.

> To prevent security vulnerabilities, always validate the operation parameters
> on the remote end and the operation results on the calling end. If invalid
> parameters are encountered, respond with an `InvalidParams` error Return
> event.

If given, an (optional) context filter defines contextual constraints by
conditions that must match a local context object provided by the remote end in
order to allow execution of the remote operation. A context filter is defined by
the `ContextFilter` interface. Note that you can also use an `ObjectFilter` (as
used by the [Query-Retrieve event
pattern](#query---retrieve-event-pattern---an-example)) because its interface
definition extends the `ContextFilter` interface.

On the remote end, a context object (any Coaty object) to be matched against the
context filter of the incoming Call event data can be specified. It determines
whether the Call event should be emitted or skipped by the observable. A Call
event is *not* emitted by the observable if:

* context filter and context object are *both* specified and they do not match
  (checked by using `ObjectMatcher.matchesFilter`), or
* context filter is *not* supplied *and* context object *is* specified.

In all other cases, the Call event is emitted.

> Tip: If your application needs to perform a more complex logic of context
> matching (e.g. if the context cannot be described by a single Coaty object),
> simply invoke `observeCall` *without* context parameter and realize a custom
> matching logic with an RxJS `filter` operator:
>
> ```js
> import { filter } from "rxjs/operators";
>
> this.communicationManager.observeCall("com.mydomain.lights.switchLight")
>     .pipe(filter(event => isMatchingFilter(event.data.filter))
>     .subscribe(event => ...);
> ```

If the remote operation executes successfully, the agent should respond with a
Return event passing in the operation result (any JSON value). If the operation
fails, the agent should respond with a Return event passing in an error object,
containing  `code` and `message` properties.

The error message provides a short description of the error. The error code
given is an integer that indicates the error type that occurred, either a
predefined error or an application defined one. Predefined error codes are
within the range -32768 to -32000. Any code within this range, but not defined
explicitly in the table below is reserved for future use. Application defined
error codes must be defined outside this range.

| Error Code   | Error Message    |
|--------------|------------------|
| -32602       | Invalid params   |

All predefined error codes and messages are defined by the enums
`RemoteCallErrorCode` and `RemoteCallErrorMessage`, respectively.

The optional `executionInfo` property (any JSON value) in Return event data may
be used to specify additional parameters of the execution environment, such as
the execution time of the operation, or the ID of the operated control unit.

### Raw event pattern - an example

A Coaty agent can act as a gateway to an external system that communicates with
the same communication protocol that Coaty is using. The agent can then publish
and subscribe to external messages, so called Raw events. You can also use Raw
events to transfer arbitrary binary data between Coaty agents.

Use `publishRaw` to publish a raw message on a publication topic string, with
payload data (of type `string` or `Uint8Array` (or `Buffer` in Node.js, a
subclass thereof), and optional publication options. Note that the topic format
and the publication options are specific to the communication binding used. The
payload data format is application specific.

For example, with the MQTT communication binding in place, you can publish a raw
MQTT message with a retain flag set as follows:

```ts
this.communicationManager.publishRaw(RawEvent.withTopicAndPayload(
    "sensor/temperature/4711",
    "30 degreeCelsius",
    {
        retain: true
    }));
```

Likewise, use `observeRaw` to observe matching incoming messages on raw
subscription topics. The observable returned by calling `observeRaw` emits
messages as tuples including the actual publication topic and the payload.
Payload is represented as `Uint8Array` (or `Buffer` in Node.js, a subclass
thereof) and needs to be decoded by the application. Use the `toString` method
on a payload to convert the raw data to a UTF8 encoded string.

For example, to observe raw MQTT messages of all temperature sensors in the
above example:

```ts
this.communicationManager.observeRaw("sensor/temperature/+")
    .subscribe(([topic, payload]) => {
        console.log("Publication topic:", topic);
        console.log("Payload data:", payload.toString());
    });
```

> **Notes**: To unobserve a given raw subscription topic, simply unsubscribe
> any subscriptions on the returned observable, either explicitely or
> implicitely (by using RX operators such as `take` or `takeUntil`).
>
> Only incoming messages that are *not* non-raw Coaty communication events are
> dispatched to raw message observers. If you observe raw topics that have a
> Coaty event like topic structure, matching incoming messages will never be
> emitted.

### Distributed lifecycle management

A Coaty agent can keep track of other agents or specific Coaty objects by
monitoring agent identities or custom object types which are advertised by
joining agents and deadvertised by leaving agents.

An agent's identity is a Coaty object of core type `Identity`. It is initialized
by the agent container with default property values. You can customize and
configure specific properties of this object, usually its `name`, by specifying
them in the common configuration options (`CommonOptions.agentIdentity`).

Whenever the Communication Manager is started, it *advertises* the agent's
identity automatically. Additionally, the Communication Manager *resolves* its
agent's identity to other Coaty agents by observing Discover events with core
type `Identity` or with the object ID of its own agent identity.

Whenever the Communication Manager is stopped, it *deadvertises* the agent's
identity automatically and stops resolving its own identity to other agents.

Tracking agent identities also supports abnormal disconnection or termination of
an agent, e.g. when the connection is lost temporarily or when its process
crashes or is killed. Coaty realizes a "last will" concept for distributed Coaty
applications. It ensures that even when the Communication Manager disconnects
abnormally, all other Coaty agents receive a Deadvertise event with the object
ID of the terminating agent's identity.

To ease programming this pattern, Coaty provides a convenience controller class
named [`ObjectLifecycleController`](#object-lifecycle-controller). Using this
class, you can not only keep track of agent identities but also of any other
application-specific Coaty object types.

## IO Routing

Coaty supports dynamic contextual routing of arbitrary data from *IO sources*
(i.e producers) to *IO actors* (i.e. consumers). IO sources publish `IoValue`
events that transfer data values of a certain value type to IO actors. An *IO
router*, a specialized Coaty controller component, *dynamically* establishes
routes between IO sources and IO actors based on context information.
Backpressure strategies enable data transfer rate controlled publishing of IO
values. Data transfer rates are negotiated between IO source and IO actors by
the IO router to cope with IO values that are more rapidly produced than
consumed.

The IO routing concept defines the following components:

* an *IO router* that manages routes for an associated IO context,
* an *IO context* object representing the application-specific scope for routing,
* distributed *IO node* objects, each consisting of a set of IO sources or
  actors, and node-specific characteristics to be used by IO routers to control
  routes.

The following constraints apply to IO routing:

* Each IO node defines IO sources or IO actors for exactly one IO context.
* *Multiple* IO nodes for *different* IO contexts can be registered with a Coaty
  agent by a configuration option.
* Each IO router is associated with exactly one IO context.
* An IO router is responsible for establishing routes between IO sources and
  actors of all IO nodes which belong to its associated IO context.
* An IO source can be associated with multiple IO actors.
* An IO actor can be associated with multiple IO sources to receive all their
  emitted values.
* An IO source can only be associated with an IO actor if their value types and
  value data formats are compatible, i.e. if they produce/consume data in a
  common underlying data format.
* An IO router also controls the data transfer rate between an IO source and
  its associated IO actors.

### IO Routing communication event flow

The communication event flow of IO routing comprises the following steps:

1. `IoNode` objects for specific IO contexts are advertised/deadvertised by the
   communication manager when it starts/stops based on the IO node definitions
   specified in the container configuration under
   `CommonOptions.ioContextNodes`. These objects are also discoverable for other
   agents by core type `IoContext`.
2. The IO router observes advertised/discovered IO nodes belonging to its
   associated IO context. On a context change, the router publishes Associate
   events including the associating route and an effective data transfer rate
   for each pair of IO source and IO actor which should be
   associated/disassociated.
3. Associate events are observed by the communication manager of any agent that
   has registered IO nodes as described in step 1. It sets up or cuts down
   publication routes for its IO sources and subscription routes for its IO
   actors using the associating route specified with the Associate events.
4. By calling `CommunicationManager.publishIoValue()` for a given IO source
   `IoValue` events are submitted to currently associated IO actors using the
   the route provided in the previous step. Likewise, by calling
   `CommunicationManager.observeIoValue()` for a given IO actor these events can
   be observed.

> **Note**: Not only can IO values be routed between Coaty-defined IO sources
> and actors, but also from external publishing sources to Coaty-defined IO
> actors and from Coaty-defined IO sources to external subscribing actors. In
> this case, the associating route is not created by an IO router, but defined
> by the external source or actor component. In order to e.g. route values from
> an externalRoute to a Coaty agent create an IoSource describing the external
> source, set the externalRoute property to the binding specific route on which
> the events will be published and register it in the Coaty agent. It can then
> be used as just any 'internal' IO source. For details, see code documentation
> of property `IoPoint.externalRoute`.

### IO Routing implementation

Core types for IO routing functionality is provided in the `@coaty/core` module.
IO router classes and controllers for IO sources/IO actors are provided in the
`@coaty/core/io-routing` module.

The following example defines a temperature measurement routing scenario with
two temperature sensor sources and two actors with compatible data value types
and formats. The IO context for this scenario defines an operating state, either
normal or emergency. In each state, exactly one of the two actors should consume
IO values emitted by both sources.

> **Note**: This example is fully implemented in the [Coaty JS integration tests
> on IO
> routing](https://github.com/coatyio/coaty-js/blob/master/src/test/spec/io-routing.spec.ts).

```ts
import { Configuration, CoreTypes, IoActor, IoSource, IoSourceBackpressureStrategy } from "@coaty/core";

interface TemperatureIoContext extends IoContext {
    operatingState: "normal" | "emergency";
}

// Common Context for IO routing
const ioContext: TemperatureIoContext = {
    name: "TemperatureMeasurement",
    objectId: "b61740a6-95d7-4d1a-8be5-53f3aa1e0b79",
    coreType: "IoContext",
    objectType: "coaty.test.TemperatureIoContext",
    operatingState: "normal",
};

// Temperature Sensor Source 1
const source1: IoSource = {
    name: "Temperature Source 1",
    coreType: "IoSource",
    objectType: CoreTypes.OBJECT_TYPE_IO_SOURCE,
    objectId: "c547e5cd-ef99-4ccd-b109-fc472fc2d421",
    valueType: "coaty.test.Temperature[Celsius]",
    updateStrategy: IoSourceBackpressureStrategy.Throttle,
    updateRate: 100,  // maximum possible drain rate (in ms)
};

// Temperature Sensor Source 2
const source2: IoSource = {
    name: "Temperature Source 2",
    coreType: "IoSource",
    objectType: CoreTypes.OBJECT_TYPE_IO_SOURCE,
    objectId: "2e9949f7-a8ef-435b-88a9-527c0a9414c3",
    valueType: "coaty.test.Temperature[Celsius]",
};

// Temperature Actor 1
const actor1: IoActor = {
    name: "Temperature Actor 1",
    coreType: "IoActor",
    objectType: CoreTypes.OBJECT_TYPE_IO_ACTOR,
    objectId: "a731fc40-c0f8-486f-b5b6-b653c3cabaea",
    valueType: "coaty.test.Temperature[Celsius]",
    updateRate: 50,  // desired rate (in ms)
};

// Temperature Actor 2
const actor2: IoActor = {
    name: "Temperature Actor 2",
    coreType: "IoActor",
    objectType: CoreTypes.OBJECT_TYPE_IO_ACTOR,
    objectId: "a60a74f3-3d26-446f-a358-911867544944",
    valueType: "coaty.test.Temperature[Celsius]",
};

// Configuration of agent 1 with an IO node for both IO sources
const configuration1: Configuration = {
    common: {
        ioContextNodes: {
            TemperatureMeasurement: {
                ioSources: [source1, source2],
            },
        },
    },
};

// Configuration of agent 2 with an IO node for actor 1
const configuration2: Configuration = {
    common: {
        ioContextNodes: {
            TemperatureMeasurement: {
                ioActors: [actor1],
                characteristics: {
                    isResponsibleForOperatingState: "normal",
                },
            },
        },
    },
};

// Configuration of agent 3 with an IO node for actor 2
const configuration3: Configuration = {
    common: {
        ioContextNodes: {
            TemperatureMeasurement: {
                ioActors: [actor2],
                characteristics: {
                    isResponsibleForOperatingState: "emergency",
                },
            },
        },
    },
};
```

Use the `RuleBasedIoRouter` controller class to realize rule-based routing of
data from IO sources to IO actors. By defining application-specific routing
rules you can associate IO sources with IO actors based on arbitrary application
context.

```ts
import { Components, Configuration } from "@coaty/core";
import { IoAssociationRule, RuleBasedIoRouter } from "@coaty/core/io-routing";

const components: Components = {
    controllers: {
        RuleBasedIoRouter,
        ...
    },
};

// Configuration of IO routing rule definitions for a rule-based IO router
const configuration: Configuration = {
    ...
    controllers: {
        RuleBasedIoRouter: {
            ioContext,
            rules: [
                {
                    name: "Route temperature sources to normal actors if operating state is normal",
                    valueType: "coaty.test.Temperature[Celsius]",
                    condition: (source, sourceNode, actor, actorNode, context, router) =>
                        actorNode.characteristics.isResponsibleForOperatingState === "normal" &&
                        context["operatingState"] === "normal",
                } as IoAssociationRule,
                {
                    name: "Route temperature sources to emergency actors if operating state is emergency",
                    valueType: "coaty.test.Temperature[Celsius]",
                    condition: (source, sourceNode, actor, actorNode, context, router) =>
                        actorNode.characteristics.isResponsibleForOperatingState === "emergency" &&
                        context["operatingState"] === "emergency",
                } as IoAssociationRule,
            ],
        },
    },
};
```

An IO router makes its IO context available by advertisement and for discovery
(by core type, object type or object Id) and listens for Update-Complete events
on its IO context. To trigger reevaluation of association rules by an IO router,
simply publish an Update event for the discovered IO context object.

```ts
ioContext: TemperatureIoContext;

// Discover temperature measurement context from IO router
this.communicationManager
    .publishDiscover(DiscoverEvent.withObjectType("coaty.test.TemperatureIoContext"))
    .subscribe(resolve => {
        this.ioContext = resolve.data.object as TemperatureIoContext;
    });

// Change context operating state to trigger rerouting from sources to emergency actors
this.ioContext.operatingState = "emergency";
this.communicationManager
    .publishUpdate(UpdateEvent.withObject(ioContext))
    .pipe(take(1))
    .subscribe(complete => {
        // Updated object is returned.
        this.ioContext = complete.data.object as TemperatureIoContext;
    });
```

The Communication Manager supports methods to control IO routing in your agent:
Use `publishIoValue` to send IO value data for an IO source. Use
`observeIoState` and `observeIoValue` to receive IO state changes and IO values
for an IO actor.

To further simplify management of IO sources and IO actors, the framework
provides specific controller classes on top of these methods:

* `IoSourceController`: Provides data transfer rate controlled publishing of IO
  values for IO sources and monitoring of changes in the association state of IO
  sources. This controller respects the backpressure strategy of an IO source in
  order to cope with IO values that are more rapidly produced than specified in
  the recommended update rate.

* `IoActorController`: Provides convenience methods for observing IO values and
  for monitoring changes in the association state of specific IO actors. Note
  that this controller class caches the latest IO value received for the given
  IO actor (using BehaviorSubjects). When subscribed, the current value (or
  undefined if none exists yet) is emitted immediately. Due to this behavior the
  cached value of the observable will also be emitted after reassociation. If
  this is not desired use `this.communicationManager.observeIoValue` instead.
  This method doesn't cache any previously emitted value.

Take a look at these controllers in action in the Coaty [OPC UA connector
example](https://github.com/coatyio/connector.opc-ua.js/tree/master/example) or
in the Coaty JS integration tests on IO routing.

## Unified Storage API - Query anywhere - Retrieve anywhere

The Coaty framework supports unified persistent or in-memory storage and
retrieval of objects and other data in SQL and NoSQL databases. The Unified
Storage API is database-agnostic. It unifies common CRUD constructs of
relational databases and NoSQL document databases in a simple but powerful API
based on promises for asynchronous operations.

The Unified Storage API is especially suited to interact with Query - Retrieve
communication event patterns. It enables declarative, seamless and transparent
retrieval of objects across Coaty agents independent of database
implementations. The query event's object filter which specifies selection and
ordering criteria can be directly passed to the database agnostic API for
schemaless object retrieval.

The Unified Storage API uses the notion of *database adapters* to connect to
specific databases. The framework provides ready-to-use built-in adapters. You
can also write your own adapter to connect to a specific database not yet
supported by the framework.

Database adapters can support SQL operations, NoSQL operations, or both.
Depending on the specific database adapter, the API can be used in Coaty
containers running in Node.js services, in Cordova apps, or in the browser. For
example, the built-in SQLite Cordova adapter can run in Cordova apps; the
built-in SQLite Node adapter can run in Node.js. The built-in Postgres adapter
can also run in a Node.js environnment.

For services, we recommend to use the standard built-in Postgres adapter in
combination with a PostgreSQL database server (at least version 9.5, recommended
version 13 or later). PostgreSQL is an open-source object-relational DBMS
running on a variety of operating system platforms. It supports almost all SQL
operations as well as highly efficient NoSQL document operations using the JSONB
data type for binary storage and retrieval of JSON objects. The Postgres adapter
stores objects as JSONB column data properly indexed to speed-up containment
operations on key-value pairs.

For efficient non-persistent, in-memory storage of objects we recommend to use
the built-in In-Memory adapter. This adapter supports NoSQL operations only. It
can be used in any Coaty container, running in Node.js, Cordova apps, or
browsers.

For mobile apps, device apps and services that should locally persist small
amounts of data, such as user settings or preferences, we recommend to use one
of the built-in SQLite adapters (see subsection 'Local Store operations' below).

### Persistent storage and retrieval of Coaty objects

In the following, we will explain the Unified Storage API in detail using the
example of a PostgreSQL database. For details on setting up a PostgreSQL
database and configuring the Postgres adapter, see the subsection 'Postgres
adapter' below.

To connect to your Postgres database, connection information is supplied with
the Coaty container configuration object in the `databases` property.
In general, you specify the name of the adapter to use, a connection string, and
other database-specific connection options (optional).

```ts
import { Configuration } from "@coaty/core";

const configuration: Configuration = {
    ...
    databases: {
        mydb1: {
            adapter: "PostgresAdapter",
            connectionString: "postgres://myuser:mypwd@localhost/mydatabase1",
            connectionOptions: {
                // Postgres specific connection options
            }
        },
        ...
    }
};
```

For all database adapters used by your agent (typically specified in the
databases configuration options), you must register the adapter's constructor
function before use. The name of the adapter must correspond to the value of the
`adapter` property specified in the connection info of the database
configuration.

```ts
import { Components } from "@coaty/core";
import { DbAdapterFactory } from "@coaty/core/db";
import { PostgresAdapter } from "@coaty/core/db/adapter-postgres";

DbAdapterFactory.registerAdapter("PostgresAdapter", PostgresAdapter);

const container = Container.resolve(...);
```

The Coaty framework exposes *database context* objects to perform SQL and/or
NoSQL operations on the database. It features a promise-based interface for
asynchronous data flow control. A database context is a light-weight object that
can be used to perform a single operation or multiple operations in sequence. A
database context object can be short-lived but you can also use it for the
lifetime of your container by storing it as an instance member in a controller.

A database context object is created with the connection information specified
in the configuration:

```ts
// Adapter type is registered with container components.
import { DbContext } from "@coaty/core/db";
const dbContext1 = new DbContext(this.runtime.databaseOptions["mydb1"]);

// Alternative: Register adapter type on first use.
import { PostgresAdapter } from "@coaty/core/db/adapter-postgres";
const dbContext2 = new DbContext(this.runtime.databaseOptions["mydb1"], PostgresAdapter);
```

The SQL and NoSQL operations that you can invoke on the database contexts are
defined by the interfaces `IDbSqlOperations` and `IDbNoSqlOperations`,
respectively.

If you invoke an operation on a database context that is not supported by the
associated database adapter, the returned promise is rejected with an "operation
not supported" error.

For example, to create and populate a collection of User objects, invoke the
following NoSQL operations:

```ts
dbContext.addCollection("appusers")
    .then(() => dbContext.insertObjects("appusers", <newObjects>))
    .then(() => dbContext.updateObjects("appusers", <updateObjects>))
    .catch(error => console.log(error));
```

To invoke multiple asynchronous operations in sequence, it is best practice to
use composing promises and promise chaining as shown in the above example. Avoid
the common bad practice pattern of nesting promises as if they were callbacks.

Note that you can reuse a database context object even if an operation performed
on it fails or yields an error. You can also catch rejected promises after every
single operation. After a catch clause, the promise chain is restored:

```ts
dbContext.addCollection("appusers")
    .then(() => dbContext.insertObjects("appusers", <newObjects>))
    .catch(insertError => console.log(insertError))
    .then(() => dbContext.updateObjects("appusers", <updateObjects>))
    .catch(updateError => console.log(updateError));
```

Promise chaining effectively serializes the database operations, invoking the
next operation not until the previous one has completed successfully or with an
error.

For applying promise operations to a series of items, the framework provides a
utility method `Async.inSeries` to chain promises in series (see section
Utilities below). This method can be used to iterate over individual objects
retrieved by a database operation such as `findObjects` and apply some
asynchronous database operation on each one in series:

```ts
let count = 0;
let myItems;
dbContext.findObjects<MyItem>("myitems", ...)
    .then(iterator => iterator.forBatch(items => myItems = items))
    .then(() => Async.inSeries(myItems, item =>
        dbContext.updateObjectProperty("myitems", item.objectId, "count", count++)))
    .catch(error => {
        // Handle any errors, note that Async.inSeries fails fast
    }),
```

You could invoke database operations which are independent of each other in
parallel as follows (but see note of caution below):

```ts
dbContext.addCollection("appusers")
    .then(() => {
        dbContext.findObjects("appusers", ...)
            .then(...)
            .catch(...);
        dbContext.countObjects("appusers", ...)
            .then(...)
            .catch(...);
    })
    .catch(error => {
         // called only when addCollection fails
    });
```

A problem with the above example is that there is no thenable or catch clause
to be invoked when all operations have completed.

To await completion of parallel operations you can collect all operations in an
array which is passed to `Promise.all`:

```ts
dbContext.addCollection("appusers")
    .then(() => Promise.all([
        dbContext.findObjects("appusers", ...)
            .then(iterator => {
                  // Iterate over results, returning completion promise
                  return iterator.forEach(...);
            })
            .catch(error => {
                  // Handle error, catch by default returns a resolved promise
            }),

        dbContext.countObjects("appusers", ...)
            .then(count => {
                  // Handle result, return fullfilled or rejected promise
            })
            .catch(error => {
                  // Handle error, catch by default returns a resolved promise
            });
    ]))
    .then(() => {
        // all operations completed, either successfully or with an error
    });
```

Note that `Promise.all` implements a fail-fast behavior. It returns a promise
that resolves when all of the promises in the array have resolved, or
immediately rejects with the reason of the first passed promise that rejects,
discarding all the other promises whether or not they have resolved. To avoid
fail-fast behavior in the above example, all the operation catch handlers return
a *fulfilled* promise to signal that `Promise.all` should also await completion
of failed operations.

**A final note of caution**: Iterating over individual objects retrieved by a
database operation such as `findObjects` and applying some asynchronous database
operation on each one **in parallel** normally does **not** perform better than
applying these operations **in series**. This is because database queries are
usually queued by the database driver and executed one after the other.
Moreover, chaining a lerge number of promises does not scale well because
allocation in memory has a negative impact on memory footprint. To avoid these
pitfalls you should in general prefer sequential promise chaining by
`Async.inSeries`.

### NoSQL operations

The following NoSQL operations are defined on a `DbContext`:

```ts
addCollection(name: string): Promise<void>;

removeCollection(name: string): Promise<void>;

clearCollection(name: string): Promise<void>;

insertObjects(
        collectionName: string,
        objects: CoatyObject | CoatyObject[],
        shouldReplaceExisting?: boolean): Promise<Uuid[]>;

updateObjects(
        collectionName: string,
        objects: CoatyObject | CoatyObject[]): Promise<Uuid[]>;

updateObjectProperty(
        collectionName: string,
        objectIds: Uuid | Uuid[],
        property: string,
        value: any,
        shouldCreateMissing = true): Promise<any>

deleteObjectsById(
        collectionName: string,
        objectIds: Uuid | Uuid[]): Promise<Uuid[]>;

deleteObjects(
        collectionName: string,
        filter?: DbObjectFilter): Promise<number>;

findObjectById<T extends CoatyObject>(
        collectionName: string,
        id: string,
        isExternalId = false): Promise<T>;

findObjects<T extends CoatyObject>(
        collectionName: string,
        filter?: DbObjectFilter,
        joinConditions?: DbJoinCondition | DbJoinCondition[]): Promise<IQueryIterator<T>>;

countObjects(
        collectionName: string,
        filter?: DbObjectFilter): Promise<number>;

aggregateObjects(
        collectionName: string,
        aggregateProps: AggregateProperties,
        aggregateOp: AggregateOp,
        filter?: DbObjectFilter): Promise<number | boolean>;
```

In the following we will explain the NoSQL operation for finding objects.
Detailed descriptions of all supported operations are documented in the code of
class `DbContext`. For usage examples, take a look at the [Coaty JS Hello World
example](https://github.com/coatyio/coaty-examples/tree/master/hello-world/js)
and at the integration tests found under `ts/test/spec/db-nosql.spec.ts` and
`ts/test/spec/db-in-memory.spec.ts`.

A NoSQL operation for finding objects looks like the following:

```ts
const filter: DbObjectFilter = {
    conditions: {
        and: [
            ["name", filterOp.like("Task%")],
            ["description", filterOp.like("_foo%")],
            ["duration", filterOp.between(1000000, 3000000)],
            ["status", filterOp.in([TaskStatus.Pending, TaskStatus.InProgress])],
            ["requirements", filterOp.contains({ "requiresWelder": true })],
            ["requirements", filterOp.notContains({ "requiresQualityCheck": true, "requiresEndAssembly": false })],
            ["metainfo.version", filterOp.between(1, 4)],
        ],
    },
    orderByProperties: [["creationDate", "Desc"], ["name", "Asc"], ["metainfo.version", "Asc"]],
    skip: 100,
    take: 100,
};

const joinConditions: DbJoinCondition[] = [
    {
        fromCollection: "location",
        fromProperty: "objectId",
        localProperty: "locationId",
        asProperty: "resolvedLocation",
        isOneToOneRelation: true,
    },
    {
        fromCollection: "annotation",
        fromProperty: "objectId",
        localProperty: "annotationIds",
        asProperty: "resolvedAnnotations",
        isLocalPropertyArray: true,
    },
];

dbContext.findObjects<Task>("task", filter, joinConditions)
    .then(iterator => iterator.forEach(compTask => console.log(compTask)))
    .catch(error => console.error(error));
```

The `findObjects` operation looks up objects in a collection which match the
given object filter. If the filter is empty or not specified all objects in the
collection are retrieved. For details on how to specify object filters, take a
look at the API documentation of class `ObjectFilter`.

Optional join conditions can be specified to augment result objects by resolving
object references to related objects and by storing them as extra properties
(for details, see online documentation of `DbJoinCondition`). Typically,
augmented result objects are transfered to other agents as part of the Query -
Retrieve communication event pattern, saving time for roundtrip events to look
up related objects.

However, you should take care that the extra properties of augmented objects are
**not** stored in the database to avoid inconsistencies and to keep the
object-oriented database design non-redundant and normalized. Always delete
extra properties before persisting the object.

It is worth noting that join operations can also be applied to the local
collection itself. Self joins are useful to resolve all direct subobjects
related to a superordinate object.

The `findObjects` operation supports two ways of iterating the query results
(see `DbObjectFilter.shouldFetchInChunks`):

1. Execute the whole query at once and load the result set in memory (default)
2. Fetch the query result a chunk of rows at a time to avoid memory problems.
   This provides an efficient way to process large query result sets.

Note that fetching query results in chunks is significantly slower than fetching
the whole query at once when the query contains not significantly more or even
less items than the size of a chunk as specified by `fetchSize`.

Fetching results in chunks is especially beneficial in combination with the skip
and take options. This is the preferred way of paging through a large result set
by retrieving only a specific subset.

The `findObjects` method is especially suited to handle Query - Retrieve
communication event patterns. The object filter defined by a Query event can be
directly passed to `findObjects`. The object join conditions defined by a Query
event can be passed to `findObjects` using the
`DbContext.getDbJoinConditionsFrom` mapping function.

### SQL operations

The following SQL operations are defined on a `DbContext`:

```ts
query(sql: SqlQueryBuilder): Promise<SqlQueryResultSet>;
iquery(sql: SqlQueryBuilder, queryOptions: SqlQueryOptions): Promise<IQueryIterator<SqlQueryRow>>;
```

Use `query` to execute an SQL query defined by the given query builder and
retrieve the results as one set of row data. Note that the query first retrieves
all result rows and stores them in memory. For queries that yield potentially
large result sets, consider to use the `iquery` operation instead of this one.

Use `iquery` to execute an SQL query defined by the given query builder and
retrieve the results iteratively. The result can be iterated one by one or in
batches to avoid memory overrun when the result contains a large number of rows.

Use the predefined query builder function `SQL` to formulate your parameterized
SQL query. `SQL` is a tag function for defining universal SQL queries by
template literals. The tag function translates universal parametrized queries
into queries for the specific SQL dialect to be addressed. It also ensures that
SQL identifiers and literals are properly quoted, i.e. escaped to prevent SQL
syntax errors and SQL injection. For example:

```ts
const myTable = "app-users";
const firstNameColumn = "first name";
const firstNameColumn = "last-name";
const firstName = "Fred";
const lastName = "Flintstone";
query(SQL`SELECT * FROM ${myTable}{IDENT}
        WHERE ${firstNameColumn}{LIT} = ${firstName} AND
              ${lastNameColumn}{LIT} = ${lastName};`)
```

builds this parameterized query if the PostgresAdapter is used:

```
query:  SELECT * FROM "app-users" WHERE 'first name' = $1 AND 'last-name' = $2;
params: [ "Fred", "Flintstone" ]
```

and this parameterized query if an SQLite adapter is used:

```
query:  SELECT * FROM "app-users" WHERE 'first name' = ? AND 'last-name' = ?;
params: [ "Fred", "Flintstone" ]
```

and this parameterized query if a MySQL adapter is used:

```
query:  SELECT * FROM `app-users` WHERE 'first name' = ? AND 'last-name' = ?;
params: [ "Fred", "Flintstone" ]
```

Detailed descriptions of the supported operations are documented in the code of
class `DbContext`. Code examples can be found in the framework's integration
tests in the file `ts/test/spec/db-sql.spec.ts`.

### Local storage operations

The Unified Storage API also supports *local* database contexts that persist
data in a local database file without using a database server. Such a database
context is usually adequate for storing small amounts of data in the local file
system of a device or service. SQLite is a typical example of such a database.
Typically, a local database context is used to persist agent-specific settings.
For example, a local database context can be used in a Node.js environment as
well as in a Cordova app (utilizing specific built-in SQLite database adapters).

Besides SQL operations and transactions, a local database context supports local
storage of pairs of keys and values. Keys are strings and values are any JSON
objects. Values can be retrieved when a key is known or by mapping through all
key-value pairs.

```ts
addStore(name: string): Promise<any>;
removeStore(name: string): Promise<any>;
getValue(key: string, store?: string): Promise<any>;
getValues(store?: string): Promise<any>;
setValue(key: string, value: any, store?: string): Promise<any>;
deleteValue(key: string, store?: string): Promise<any>;
clearValues(store?: string): Promise<any>;
close(): Promise<any>;
```

Detailed descriptions of the supported operations are documented in the code of
class `DbLocalContext`. Code examples can be found in the framework's unit tests
in the file `ts/test/spec/db-local.spec.ts`.

### Transactions

To bundle multiple query operations inside a transaction block, use the
`transaction` method on the database context. The action callback **must**
return a promise that is fulfilled if **all** operations have executed without
errors, and that is rejected if **any** of the operations fail. All operations
within a transaction **must** operate on the transaction database context that
is passed to the action callback.

```ts
transaction(action: (transactionContext: DbContext | DbLocalContext) => Promise<any>): Promise<any>;
```

While you can invoke independent transactions on the same or different database
contexts in parallel, or invoke transactions on the same database context in
series, transactions cannot be *nested*. In this case, the promise returned by
trying to invoke the subtransaction is rejected with a corresponding error.

### Database adapter extensions

In addition to the unified SQL and NoSQL operations described above, a database
adapter can also define *extension* methods. Extensions are adapter-specific,
i.e. specific to databases and database drivers. Extensions are registered with
the `registerExtension` adapter method. A database extension context for a
specific adapter can now call the defined extension using the `callExtension`
method. As with the other operations, extension methods return promises yielding
the requested data.

### Use of database adapters

The built-in database adapters provided by the Coaty framework use specific
low-level database driver modules to connect to databases.

The drivers used by built-in adapters are defined as (optional) peer
dependencies in the package.json of the `coaty` npm module. To use a specific
adapter in your agent project, you must install the associated driver module(s)
as dependencies in the package.json. Refer to the framework's package.json to
figure out which version of the driver modules should be installed. You only
need to install driver modules for adapters that you really use in your
application project.

### Postgres adapter

To make use of the built-in Postgres database adapter, install a PostgreSQL
database server (minimum version 9.5, recommended version 13 or later). Download
and installation details can be found [here](https://www.postgresql.org/). Then,
set up and start the database server as explained in the [Postgres
documentation](https://www.postgresql.org/docs/).

> We strongly recommend, wherever possible, to use or migrate to PostgreSQL
> server version 13 or later. For these versions, the Postgres adapter supports
> highly optimized NoSQL containment, existence, and comparison operations on
> nested JSON objects by fully indexed access via ``jsonpath`` operators.

You also need to add the npm module `pg` as a dependency to your project's
package.json and install it. The module version should correspond with the
version of the `pg` module specified in the `coaty` framework package definition
as a peer dependency.

Next, create the target database(s) and user roles. This can be accomplished
using

* the pgAdmin tool,
* the pgsql interactive terminal,
* the createdb/createuser command-line utility programs,
* extension methods provided by the PostgreSQL adapter (see subsection on
  "Database adapter extensions" below).

Now, you are ready to connect to your Postgres database. Connection information
is supplied with the container configuration object in the `databases` property.

```ts
import { Configuration } from "@coaty/core";

const configuration: Configuration = {
    ...
    databases: {
        mydb1: {
            adapter: "PostgresAdapter",
            connectionString: "postgres://myuser:mypwd@localhost/mydatabase1",
            connectionOptions: {
                // Postgres specific connection options
            }
        },
        ...
    }
};
```

A detailed description of the Postgres connection string format and the available
connection options can be found in the documentation of the `PostgresAdapter`
class.

Finally, the Postgres adapter must be registered before use:

```ts
import { DbAdapterFactory } from "@coaty/core/db";
import { PostgresAdapter } from "@coaty/core/db/adapter-postgres";

DbAdapterFactory.registerAdapter("PostgresAdapter", PostgresAdapter);
```

The Postgres adapter supports both SQL and NoSQL operations as well as extension
methods for creating and deleting, i.e. dropping, databases and users at runtime:

```ts
initDatabase(dbInfo: DbConnectionInfo, collections?: string[], clearCollections: boolean = false)
createDatabase(name: string, owner: string, comment?: string): Promise<boolean>;
deleteDatabase(name: string): Promise<void>;
createUser(name: string, comment?: string): Promise<void>;
deleteUser(name: string): Promise<void>;
```

When setting up PostgreSQL do not forget to set a proper password for the
PostgreSQL admin user if you want to make use of these extension methods.
Usually, when installing PostgreSQL on Windows or when using a PostgreSQL docker
container the admin user and admin password are both preset to `postgres`. On
Linux, you might have to set the password explicitely by running `sudo -u
postgres psql postgres` and then defining a password through the command
`postgres=# \password postgres`.

The following example shows how to initialize a database (i.e. create a database
and database user, and add collections) at program startup with the PostgreSQL
adapter:

```ts
import { Components, Configuration } from "@coaty/core";
import { DbAdapterFactory, DbContext } from "@coaty/core/db";
import { PostgresAdapter } from "@coaty/core/db/adapter-postgres";

const components: Components = {
    ...
};

const configuration: Configuration = {
    ...
    databases: {
        db: {
            adapter: "PostgresAdapter",
            connectionString: "postgres://myuser:mypassword@localhost/mydb"
        }
        adminDb: {
            adapter: "PostgresAdapter",

            // Connect as admin user (postgres) with password (postgres) to admin database (postgres)
            // Format: postgres://<admin-user>:<admin-pwd>@<host>/<admin-db>
            connectionString: "postgres://postgres:postgres@localhost/postgres"
        }
    }
};

DbAdapterFactory.registerAdapter("PostgresAdapter", PostgresAdapter);

const adminContext = new DbContext(configuration.databases["adminDb"]);

// Set up a Postgres database by creating a database user and a database with
// two collections named "mycollection1" and "mycollection2".
adminContext.callExtension("initDatabase", configuration.databases["db"], ["mycollection1", "mycollection2"])
    .then(() => {
        container.resolve(components, configuration);
    })
    .catch(error => console.log(error));
```

Note that you have to be an admin user ("postgres" in the example, using
"postgres" as password) with access to the postgres admin database ("postgres")
to successfully execute these operations.

### In-memory adapter

For efficient non-persistent, in-memory storage of objects we recommend to use
the built-in `InMemoryAdapter`. This adapter supports the complete set of NoSQL
operations. Transactions are not supported. Fetching in chunks is not supported,
i.e. `DbObjectFilter.shouldFetchInChunks` and `DbObjectFilter.fetchSize` are
ignored.

This adapter has no external dependencies to database drivers and requires no
installation of third-party modules. It can be used in any Coaty container,
running in Node.js, Cordova apps, or browsers.

The `InMemoryAdapter` requires a connection string of the following form:
`in-memory://<database>`

This adapter supports the following connection options:

```ts
{
   // Name of database to connect
   database: "<name>"
}
```

The database specified by either the connection string or options is implicitely
and automatically created in-memory the first time you are creating a
`DbContext` on it.

The following example shows how to create and use a database with the
`InMemoryAdapter`:

```ts
import { Configuration } from "@coaty/core";
import { DbAdapterFactory, DbContext } from "@coaty/core/db";
import { InMemoryAdapter } from "@coaty/core/db/adapter-in-memory";

const configuration: Configuration = {
    ...
    databases: {
        inMemoryDb: {
            adapter: "InMemoryAdapter",
            connectionString: "in-memory://my-in-memory-db"
        }
    }
};

DbAdapterFactory.registerAdapter("InMemoryAdapter", InMemoryAdapter);

// In your controller, create a DB context as follows
const dbContext = new DbContext(this.runtime.databaseOptions["inMemoryDb"]);

dbContext.addCollection("appusers")
    .then(() => dbContext.insertObjects("appusers", <newObjects>))
    .then(() => dbContext.updateObjects("appusers", <updateObjects>))
    .catch(error => console.log(error));
```

Detailed descriptions of the supported NoSQL operations are documented in the
code of class `DbContext`. Further code examples can be found in the framework's
integration tests in the file `ts/test/spec/db-in-memory.spec.ts`.

### SQLite Node.js adapter

The Coaty framework provides a built-in database adapter for persistent
SQL-based local storage and retrieval in Node.js processes. The
`SqLiteNodeAdapter` makes use of SQLite 3 utilizing the `sqlite3` npm module as
database driver.

The SQLite node adapter supports SQL operations, transactions, and local store
operations exposed by a local database context (of class `DbLocalContext`). For
the `query` operation the `fetchSize` option is ignored.

The adapter also provides an extension method `deleteDatabase` for deleting an
SQLite database file.

The SQLite database file path is specified as connection string in the
connection info object. If you specify an absolute or relative file path ensure
that the path exists and is accessible by the process, otherwise the database
file cannot be created or opened. The database file name should include the
extension, if desired, e.g. `"db/myservice.db"`. No further connection options
are supported.

You also need to add the npm module `sqlite3` as a dependency to your project's
package.json and install it. The module version should correspond with the
version of the `sqlite3` module specified in the `coaty` framework package
definition as a peer dependency.

To connect to a local SQLite database, specify `SqLiteNodeAdapter` in your
connection information and register the adapter before use:

```ts
import { Configuration } from "@coaty/core";
import { DbLocalContext } from "@coaty/core/db";
import { SqLiteNodeAdapter } from "@coaty/core/db/adapter-sqlite-node";


const configuration: Configuration = {
    communication: {
        ...
    },
    controllers: {
        ...
    },
    databases: {
        localdb: {
            adapter: "SqLiteNodeAdapter",

            // Path to the SqLite database file is relative to project's root folder
            connectionString: "db/mylocaldb.db"
        }
    }
};

// Register adapter initially or
DbAdapterFactory.registerAdapter("SqLiteNodeAdapter", SqLiteNodeAdapter);

// In your controller, create a local database context as follows
const dbContext = new DbLocalContext(this.runtime.databaseOptions["localdb"]);
```

### SQLite Cordova adapter

The Coaty framework provides a built-in database adapter for persistent
SQL-based local storage and retrieval in mobile browser apps running on iOS,
Android and Windows. The SQLite Cordova adapter makes use of the
cordova-sqlite-storage plugin. The adapter provides a powerful alternative to
limited HTML5 local storage in your mobile app.

The SQLite node adapter supports SQL operations, transactions, and local
store operations exposed by a local database context (of class `DbLocalContext`).
The `iquery` operation is not supported.

This adapter provides an extension method `deleteDatabase` for deleting the
local SQLite database file specified in the connection options.

This adapter accepts the following connection info: `connectionString`
specifies the name of the database file. `connectionOptions` accepts a
`location` option (defaults to `default`). To specify a different location,
(affects iOS only) use the `iosDatabaseLocation` option with one of the
following choices:

* `default`: stored in Library/LocalDatabase subdirectory, **not** visible to
  iTunes and **not** backed up by iCloud
* `Library`: stored in Library subdirectory, backed up by iCloud, **not**
  visible to iTunes
* `Documents`: stored in Documents subdirectory, visible to iTunes and backed
  up by iCloud

Like with other Cordova plugins you must wait for the `deviceready` event in
your app before instantiating a local database context with this adapter. Note
that controllers and other service classes injected into Ionic/Angular UI
components are created before the `deviceready` event is fired. Thus, you should
never execute operations on a local database context on this adapter in the
constructor of such a class.

To use the SQLite Cordova adapter, yo need to add the npm module
`cordova-sqlite-storage` as a dependency to your project's package.json and
install it. The module version should correspond with the version of the
`cordova-sqlite-storage` module specified in the `coaty` framework package
definition as a peer dependency.

To connect to a local SQLite database, specify `SqLiteCordovaAdapter` in your
connection information and register the adapter before use:

```ts
import { Configuration } from "@coaty/core";
import { DbLocalContext } from "@coaty/core/db";
import { SqLiteCordovaAdapter } from "@coaty/core/db/adapter-sqlite-cordova";

const configuration: Configuration = {
    ...
    databases: {
        localdb: {
            adapter: "SqLiteCordovaAdapter",

            // Name of the database file
            connectionString: "mylocaldb",

            connectionOptions: {
                // Specify database file location on local device
                location: "default",

                // Specify location for iOS
                iosDatabaseLocation: "default"
            }
        }
    }
};

DbAdapterFactory.registerAdapter("SqLiteCordovaAdapter", SqLiteCordovaAdapter);

// In your controller, create a DB context as follows
const dbContext = new DbLocalContext(this.runtime.databaseOptions["localdb"]);
```

### Implement a custom database adapter

You can implement your own custom database adapter by defining a class that
derives from `DbAdapterBase` and implements the `IDbAdapter` and
`IDbAdapterExtension` interfaces. `DbAdapterBase` provides default
implementations for all interface methods that return a rejected promise which
yields an "Operation not supported" error.

You can specify the custom adapter in the database configuration options. Note
that the custom adapter class must be registered before use.

```ts
import { Configuration } from "@coaty/core";
import { MyCustomDatabaseAdapter } from "myapp/my-custom-adapter";

const configuration: Configuration = {
    ...
    databases: {
        myCustomDb: {
            adapter: "MyCustomDatabaseAdapter",
            connectionString: "...",
            connectionOptions: {
                // Specific connection options for custom database
            }
        }
    }
};

DbAdapterFactory.registerAdapter("MyCustomDatabaseAdapter", MyCustomDatabaseAdapter);
```

### Convenience controllers

Besides the base `Controller` class, the framework also provides some
convenience controller classes that you can reuse in your agent project.

#### Connection State Controller

The `ConnectionStateController` class monitors the connection state (online or
offline) of the associated communication manager.

Use its  `isOffline` getter to get a boolean observable that emits `true` if the
connection state of the associated communication manager transitions to offline,
and `false` if it transitions to online. When subscribed, the current connection
state is emitted immediately.

#### Object Lifecycle Controller

The `ObjectLifecycleController` class supports [distributed lifecycle
management](#distributed-lifecycle-management). It keeps track of agents or
application-specific Coaty objects in a Coaty network by monitoring agent
identities or custom object types. The controller observes advertisements and
deadvertisements of such objects and discovers them. Changes are emitted on
corresponding observables that applications can subscribe to.

You can use this controller either standalone by adding it to the container
components or extend your custom controller class from this controller class.

The following example shows how to keep track of agents whose identity is named
`"LightAgent"`.

This approach requires your custom controller class to inherit from the
lifecycle controller class:

```ts
import { Components, ObjectLifecycleController } from "@coaty/core";

const components: Components = {
    controllers: {
        MyController,
    }
};

class MyController extends ObjectLifecycleController {

    onCommunicationManagerStarting() {
        super.onCommunicationManagerStarting();
        this.observeObjectLifecycleInfoByCoreType("Identity", obj => obj.name === "LightAgent")
            .subscribe(info => {
                // Called whenever light agents have been observed.
                // Note that if the agent containing this controller is also a light agent,
                // this controller also receives its own agent identity.
                // You can easily filter it out by checking the object ID of a received identity.
                console.log(info.added);     // newly advertised or discovered identities
                console.log(info.changed);   // readvertised or rediscovered identities
                console.log(info.removed);   // deadvertised identities
            });
    }
}
```

This approach requires the lifecycle controller to be added to the container
components under the key `ObjectLifecycleController`:

```ts
import { Components, Controller, ObjectLifecycleController } from "@coaty/core";

const components: Components = {
    controllers: {
        ObjectLifecycleController,
        MyController,
    }
};

class MyController extends Controller {

    onCommunicationManagerStarting() {
        super.onCommunicationManagerStarting();

        const ctrl = this.container.getController<ObjectLifecycleController>("ObjectLifecycleController");
        ctrl.
            .observeObjectLifecycleInfoByCoreType("Identity", obj => obj.name === "LightAgent")
            .subscribe(info => {
                // Called whenever light agents have been observed.
                // Note that if the agent containing this controller is also a light agent,
                // this controller also receives its own agent identity.
                // You can easily filter it out by checking the object ID of a received identity.
                console.log(info.added);     // newly advertised or discovered identities
                console.log(info.changed);   // readvertised or rediscovered identities
                console.log(info.removed);   // deadvertised identities
            });
    }
}
```

To keep track of agent identities, the code shown above is sufficient. However,
if you want to keep track of custom object types (not agent identities), you
have to implement the remote side of the distributed object lifecycle management
explicitely, i.e. advertise/readvertise/deadvertise your custom objects and
observe/resolve corresponding Discover events. To facilitate this, this
controller provides convenience methods: `advertiseDiscoverableObject`,
`readvertiseDiscoverableObject`, and `deadvertiseDiscoverableObject`.

Usually, a custom object should have the object ID of its agent identity, i.e.
`Container.identity`, set as its `parentObjectId` in order to be automatically
deadvertised when the agent terminates abnormally. You can automate this by
passing `true` to the optional parameter `shouldSetParentObjectId` of method
`advertiseDiscoverableObject` (`true` is also the default parameter value).

The following example shows how to keep track of a custom Coaty object.

The first controller is responsible for advertising the custom object, and for
making it discoverable. Note that when the communication manager is stopped the
custom object is automatically deadvertised by the framework.

```ts
import { ObjectLifecycleController } from "@coaty/core";

class CustomObjectAdvertisingController extends ObjectLifecycleController {

    myCustomObject: CoatyObject;

    onInit() {
        this.myCustomObject = {
            objectType: "com.example.MyCustomObject",
            coreType: "CoatyObject",
            name: "MyCustomObject",
            objectId: this.runtime.newUuid()
        };
    }

    onCommunicationManagerStarting() {
        super.onCommunicationManagerStarting();
        this.advertiseDiscoverableObject(this.myCustomObject);
    }
}
```

The second controller keeps track of custom objects as advertised/discoverable
by the first controller:

```ts

class CustomObjectTrackingController extends ObjectLifecycleController {

    onCommunicationManagerStarting() {
        super.onCommunicationManagerStarting();
        this.observeObjectLifecycleInfoByObjectType("com.example.MyCustomObject")
            .subscribe(info => {
                // Called whenever custom lifecycle objects of type "com.example.MyCustomObject" have changed.
                console.log(info.added);     // newly advertised or discovered objects
                console.log(info.changed);   // readvertised or rediscovered objects
                console.log(info.removed);   // deadvertised objects
            });
    }
}
```

#### Object Cache Controller

The `ObjectCacheController` class discovers objects by given object Ids
and maintains a local cache of resolved objects. The controller will also
update existing objects in its cache whenever such objects are advertised
by other parties.

To realize an object cache controller for a specific core types or for specific
objects, define a custom controller class that extends the abstract
`ObjectCacheController` class and set the core type and/or the filter predicate
of objects to be cached in the `OnInit` method.

```ts
import { ObjectCacheController } from "@coaty/core";
import { FactoryUser } from "../models/factory-user";

export class UserCacheController extends ObjectCacheController<FactoryUser> {

    onInit() {
        super.onInit();

        // Specify the object's core type that should be cached.
        this.coreType = "User";

        // Only resolve factory users that are present
        this.objectFilter = (obj: FactoryUser) => obj.isPresent;
    }
}
```

Resolve an object with a given objectId by your custom cache controller as
follows:

```ts
this.userCacheController.resolveObject(objectId)
    .subscribe(
        obj => {
            // Emits the first object of the observable, then completes
        },
        error => { ... });
```

#### Historian Controller

The `HistorianController` class can be used on each Coaty agent to create and/or
persist snapshots in time of arbitrary Coaty objects.

A snapshot represents a deep copy of the object and its state, a timestamp, a
creator ID, and an optional array of associated tags. The tags can be used on
retrieval of snapshots to identify different purposes.

A snapshot is created by the `generateSnapshot(object, ...tags)` or
`generateSnapshot(object, timestamp, ...tags)` method. Driven by specific
controller options, you can decide to

* advertise each generated snapshot (`shouldAdvertiseSnapshots`)
* persist each generated snapshot in a database collection (`shouldPersistLocalSnapshots`)
* persist each observed snapshot advertised by another Historian controller (`shouldPersistObservedSnapshots`)
* execute matching Query events for snapshot objects on the database and retrieve results (`shouldReplyToQueries`)

The `HistorianController` provides a convenience method to query snapshots using
the Query event pattern:

* `querySnapshotsByParentId(parentObjectId: Uuid): Observable<Snapshot[]>`

The `HistorianController` also provides convenience methods to retrieve
snapshots from a database collection:

* `findSnapshotsByParentId(parentObjectId: Uuid, startTimestamp?: number, endTimestamp?: number): Promise<Snapshot[]>`
* `findSnapshotsByTimeFrame(startTimestamp?: number, endTimestamp?: number): Promise<Snapshot[]>`
* `findSnapshotsByFilter(filter: ObjectFilter): Promise<Snapshot[]>`

You can set up a `HistorianController` in the Coaty container components and
configuration as follows:

```ts
import { Components, Configuration } from "@coaty/core";
import { HistorianController } from "@coaty/core/db";

export const components: Components = {
    controllers: {
        ...,
        HistorianController,
    }
};

export const configuration: Configuration = {
        ...
        controllers: {
            ...,
            HistorianController: {
                shouldAdvertiseSnapshots: false,
                shouldPersistLocalSnapshots: true,
                shouldPersistObservedSnapshots: false,
                shouldReplyToQueries: true,
                database: {
                    key: "db",
                    collection: "historian"
                }
            }
        },
        databases: {
            db: {
                adapter: "PostgresAdapter",
                connectionString: "..."
            },
            admindb: {
                adapter: "PostgresAdapter",
                connectionString: "..."
            }
        }
    };
```

The `database` controller option has two properties `key` and `collection`;
`key` references the database key as defined in the `databases` option of your
configuration; `collection` is the name of the collection to be used. If the
collection doesn't exist, it will be created in the given database.

To see an example of the `HistorianController` in action, take a look at the
[Hello World
example](https://github.com/coatyio/coaty-examples/tree/master/hello-world/js).

## Decentralized logging

The Coaty framework provides the object type `Log` for decentralized structured
logging of any kind of informational events in your Coaty agents, such as
errors, warnings, system and application-specific messages. Log objects are
usually published to interested parties using an Advertise event. These log
objects can then be collected and ingested into external processing pipelines
such as the [ELK Stack](https://www.elastic.co/elk-stack).

A controller can publish a log object by creating and advertising a `Log`
object. You can specify the level of logging (debug, info, warning, error,
fatal), the message to log, its creation timestamp, and other optional
information about the host environment in which this log object is created. You
can also extend the `Log` object with custom property-value pairs.

You can also specify log tags as an array of string values in the `Log.logTags`
property. Tags are used to categorize or filter log output. Agents may introduce
specific tags, such as "service" or "app", usually defined at design time.

You can also specify log labels as a set of key-value label pairs in the
`logLabels` property. It can be used to add context-specific information to a
log object. For example, labels are useful in providing multi-dimensional data
along a log entry to be exploited by external logging services, such as
Prometheus.

For convenience, the base `Controller` class provides methods for
publishing/advertising log objects:

* `logDebug`
* `logInfo`
* `logWarning`
* `logError`, `logErrorWithStacktrace`
* `logFatal`

The base `Controller` class also defines a protected method
`extendLogObject(log: Log)` which is invoked by the controller whenever one of
the above log methods is called. The controller first creates a `Log` object
with appropriate property values and passes it to this method before advertising
it. You can overwrite this method to additionally set certain properties (such
as `Log.hostname` or `Log.logLabels`). For example, a Node.js agent could add
the hostname and other host characteristics to the `Log` object like this:

```ts
import { hostname } from "os";
import { Log } from "@coaty/core";

protected extendLogObject(log: Log) {
    log.logHost.hostname = hostname;
    log.logLabels = {
        operatingState: this.operatingState,
    };
}
```

To collect all log objects advertised by agent controllers, implement a logging
controller that observes Advertise events on the core type `Log`. Take a look at
the Hello World example of the Coaty framework to see how this is implemented in
detail.

Future versions of the framework could include predefined logging controllers
that collect `Log` entries, store them persistently; output them to file or
console, and provide a query interface for analyzing and visualizing log entries
by external tools.

## Utilities

The framework provides some useful utility functions in the `util` module that
are missing in the JavaScript ES5/ES6 standard.

### Asynchronous promise operations

The `Async.inSeries` method applies an asynchronous operation against each value
of an array of items in series (from left-to-right). You can break out of the
iteration prematurely by resolving a `false` value from an operation. If an
async operation is rejected, the promise returned by `inSeries` is rejected
immediately (fail fast).

```ts
import { Async } from "@coaty/core";

Async.inSeries(
    [1, 2, 3, 4, 5],
    (item: number) => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                console.log("run async operation #" + item);
                resolve(item < 4 ? true : false);
            }, 1000);
        });
    })
    .then(lastIndex => console.log(`last async operation performed on item index ${lastIndex}`))  // lastIndex should be 3
    .catch(error => console.log(error));
```

The `Async.reduce` method applies an asynchronous operation against an
accumulator and each value of an array of items in series (from left-to-right)
to reduce it to a single value:

```ts
import { Async } from "@coaty/core";

const items = [100, 300, 150, 50];

Async.reduce(
    items,
    (item: number, previousValue?: number[]) => {
        return new Promise<number[]>((resolve, reject) => {
            setTimeout(() => {
                previousValue.push(item);
                resolve(previousValue);
            }, item);
        }),
    },
    [])
    .then(value => {
        value.forEach((val, i) => {
            expect(val).toBe(items[i]);
        });
    })
    .catch(error => console.log(error));
```

The `Async.withTimeout` method augments an asynchronous promise operation
with a timeout. It returns a promise that rejects after the given number of
milliseconds if the passed in promise doesn't resolve or reject in the meantime:

```ts
import { Async } from "@coaty/core";

const myPromise = new Promise((resolve, reject) => {
    setTimeout(() => resolve(true), 2000);
});

Async.withTimeout(1000, myPromise)
    .then(value => console.log("resolved"))
    .catch(error => console.log(error.message));

// should yield 'Timed out after 1000 ms'
```

### Binary search and insert

Binary search and insert functions to efficiently search/insert an item into a
sorted `Array<T>` using a specific compare function on the item:

```ts
import { binarySearch, binaryInsert } from "@coaty/core";

binarySearch<T>(
    source: Array<T>,
    value: T,
    compareFn: (a: T, b: T) => number,
    startIndex: number = 0,
    endIndex: number = source.length - 1): number;

binaryInsert<T>(
    source: Array<T>,
    item: T,
    compareFn: (a: T, b: T) => number);
```

### Localized ISO date-time formatting

A function to return a date string in ISO 8601 format including timezone offset
information and optional milliseconds:

```ts
import { toLocalIsoString } from "@coaty/core";

// outputs 2016-09-21T15:46:41+02:00
console.log(toLocalIsoString(new Date()));

// outputs 2016-09-21T15:46:41.000+02:00
console.log(toLocalIsoString(new Date(), true));
```

### Deep comparison checks

#### Equality check

Determines whether two JavaScript values, typically objects or arrays, are deep
equal according to a recursive equality algorithm.

Note that the strict equality operator `===` is used to compare leave values.
For checking the containment of properties in objects the `hasOwnProperty`
operator is used, i.e. only properties defined on the object directly (not
inherited) are considered.

Compares JavaScript values, typically objects or arrays, and determines whether
they are deep equal according to a recursive equality algorithm.

```ts
import { equals } from "@coaty/core";

expect(equals(null, null)).toBe(true);
        /* tslint:disable-next-line:no-null-keyword */
        expect(equals(null, undefined)).toBe(false);
        expect(equals(42, 42)).toBe(true);
        expect(equals(42, "42")).toBe(false);
        expect(equals([], [])).toBe(true);
equals({ a : [ 2, 3 ], b : [ 4 ] }, { a : [ 2, 3 ], b : [ 4 ] })) => true
equals({ x : 5, y : [6] }, { x : 5, y : 6 })) => false
```

#### Contains check

Checks if a JavaScript value (usually an object or array) contains other values.
Primitive value types (number, string, boolean, null, undefined) contain only
the identical value. Object properties match if all the key-value pairs of the
specified object are contained in them. Array properties match if all the
specified array elements are contained in them.

The general principle is that the contained object must match the containing
object as to structure and data contents recursively on all levels, possibly
after discarding some non-matching array elements or object key/value pairs from
the containing object. But remember that the order of array elements is not
significant when doing a containment match, and duplicate array elements are
effectively considered only once.

As a special exception to the general principle that the structures must match,
an array on *toplevel* may contain a primitive value:

```ts
contains([1, 2, 3], [3]) => true
contains([1, 2, 3], 3) => true
```

Note that the strict equality operator `===` is used to compare primitive
values. For checking the containment of properties in objects the
`hasOwnProperty` operator is used, i.e. only properties defined on the object
directly (not inherited) are considered.

For example:

```ts
import { contains } from "@coaty/core";

contains("foo" , "foo") => true

contains([1, 2, 3] , []) => true
contains([1, 2, 3] , [3, 1]) => true
contains([1, 2, 3] , [3, 1, 3, 1]) => true
contains([1, 2, 3] , [3, 1, 5]) => false
contains([1, [2, 3, 4], 3] , [3, [3, 2]]) => true
contains([1, [2, 3, 4], 3] , [3, [3, 1]]) => false

contains({ "foo": 1, "bar": 2 } , { "bar": 2 }) => true
contains({ "foo": 1, "bar": 2 } , { "bar": 2, "foo": 1 }) => true
contains({ "foo": 1, "bar": 2 } , { "bar": 2, "foo": 2 }) => false
contains({ "foo": { "bar": "baz" }}, { "foo": {} }) => true
contains({ "foo": { "bar": "baz" }}, { "bar": "baz" }) => false

contains([1, { "foo": [{ "bar": [1, 2, 3] }, 2, 3] }], [{ "foo": [{ "bar": [3] }] }]) => true
```

#### Includes check

Checks if a value is included on toplevel in the given operand array of values
which may be primitive types (number, string, boolean, null) or object types
compared using the deep equality operator.

For example:

```ts
import { includes } from "@coaty/core";

includes([1, 46, 47, "foo"], 47) => true
includes([1, 46, "47", "foo"], 47) => false
includes([1, 46, { "foo": 47 }, "foo"], { "foo": 47 }) => true
includes([1, 46, { "foo": 47, "bar": 42 }, "foo"], { "foo": 47 }) => false
```

## Node.js utilities

The framework includes a `NodeUtils` class in the `runtime-node` module which
provides some static utility methods to be used by Coaty agent services.

Use the `handleProcessTermination` method to perform synchronous and
asynchronous cleanup of allocated resources (e.g. file descriptors, handles, DB
connections, etc.) before shutting down the Node.js process.

Use the `logCommunicationState` method to log changes in online/offline
communication state
(i.e. agent connection to Coaty broker) to the console.

Use the `logInfo`, `logError`, and `logEvent` methods to log a given
informational message, error, or event to the console, also providing a logging
timestamp.

Usage examples can be found in the [Coaty JS code
examples](https://github.com/coatyio/coaty-examples).

## Multicast DNS discovery

The framework includes a `MulticastDnsDiscovery` class to support multicast DNS
discovery (a.k.a Bonjour, Zeroconf, mDNS) to be used within Node.js based
agents. These functions can be used, for example, to auto-discover the IP
address of the Coaty broker/router or the URL of a container configuration
hosted on a web server.

Use the `publishMulticastDnsService`, `publishMqttBrokerService`, and
`publishWampRouterService` methods in a Coaty service to publish corresponding
mDNS services (see examples below).

Use the `unpublishMulticastDnsServices` function to stop publishing of mDNS
services when the Coaty service exits.

Use the `findMulticastDnsService`, `findMqttBrokerService`, and
`findWampRouterService` functions in a Coaty agent to discover a published mDNS
service (see examples below).

> Note that multicast DNS discovery can only resolve host names within an IP
> subnet. If you need discovery of broker connection information across subnets,
> host the container configuration with this information as a JSON file on a
> centrally accessible web server and retrieve it using HTTP/REST as described
> in this [section](#bootstrap-a-coaty-container-in-nodejs).

### Discover configuration URLs

Publish an mDNS service for a Coaty configuration URL with a given name, type, port,
and TXT record as follows:

```ts
import { MulticastDnsDiscovery } from "@coaty/core/runtime-node";

MulticastDnsDiscovery.publishMulticastDnsService("My Config URL", "coaty-config", 4711, { "path": "/config/my-config.json" })
    .then(srv => console.log("Service published successfully", srv.name))
    .catch(error => console.error("Service could not be published", error));
```

The values of the `txt` record properties are always strings so you can easily concatenate
them to form a URL, etc.

Find the first mDNS service for the published Coaty configuration URL:

```ts
import { MulticastDnsDiscovery } from "@coaty/core/runtime-node";

MulticastDnsDiscovery.findMulticastDnsService("My Config URL", "coaty-config", 10000)
    .then(srv => console.log("Config URL:", `https://${srv.host}:${srv.port}${srv.txt.path}`))
    .catch(error => console.log(error));
```

### Discover broker or router

Publish Coaty broker/router discovery information (with default connection
parameters) as follows:

```ts
import { MulticastDnsDiscovery } from "@coaty/core/runtime-node";

// Publish MQTT broker info in a Coaty service
MulticastDnsDiscovery.publishMqttBrokerService()
    .then(srv => console.log("Broker info published successfully", srv.name))
    .catch(error => console.error("Broker info could not be published", error));

// Publish WAMP router info in a Coaty service
MulticastDnsDiscovery.publishWampRouterService()
    .then(srv => console.log("Router info published successfully", srv.name))
    .catch(error => console.error("Router info could not be published", error));
```

Auto discover the broker/router URL in a Coaty network and use this information
to dynamically configure the communication manager at run time. For this to work
correctly, ensure that the communication manager is *not* started automatically.

```ts
import { Container } from "@coaty/core";

const container = Container.resolve(...);

// On startup discover MQTT broker URL and start communication manager.

import { MulticastDnsDiscovery, NodeUtils } from "@coaty/core/runtime-node";

MulticastDnsDiscovery.findMqttBrokerService()
    .then(srv => {
        container.communicationManager.start({
            brokerUrl: `mqtt://${srv.host}:${srv.port}`,
        });
    })
    .catch(error => {
        NodeUtils.logError(error, "Couldn't discover broker:");
        process.exit(1);
    });

// On startup discover WAMP router URL and start communication manager.

import { MulticastDnsDiscovery, NodeUtils } from "@coaty/core/runtime-node";

MulticastDnsDiscovery.findWampRouterService()
    .then(srv => {
        container.communicationManager.start({
            routerUrl: `ws://${srv.host}:${srv.port}${srv.txt.path}`,
        });
    })
    .catch(error => {
        NodeUtils.logError(error, "Couldn't discover router:");
        process.exit(1);
    });
```

> Note that the find functions described above can only be used in Node.js
> programs. If you want to discover a bonjour service within a cordova app, use
> the plugin `cordova-plugin-zeroconf`. In an Ionic app, you can use
> `@ionic-native/zeroconf` plugin which is a wrapper around the cordova plugin.
> In a pure browser environment, it is not possible to discover mDns services
> with JavaScript.
>
> To discover the Coaty MQTT or WAMP service with an external tool, use one of
> the following FQDNs (fully qualified domain names): `"Coaty MQTT
> Broker._coaty-mqtt._tcp.local"` or `"Coaty WAMP
> Broker._coaty-wamp._tcp.local"` (for default parameters). Since the mDNS
> library we are using does not handle `"_services._dns-sd._udp."` meta-queries
> for browsing, mDNS services published by one of the above methods can only be
> discovered if you specify the mDNS service name and type *explicitely*.

### Stop publishing mDNS services

Published mDNS services should be stopped before a Coaty service exits:

```ts
import { MulticastDnsDiscovery } from "@coaty/core/runtime-node";

MulticastDnsDiscovery.unpublishMulticastDnsServices().then(() => process.exit(0));
```

## Scripts for Coaty agent projects

The framework includes some build-supporting scripts for use by Coaty agent
projects. These so-called *coaty scripts* can execute tasks as part of any npm
script based build process of your project:

* `broker` - start a Coaty broker for development and testing purposes
* `info` - generate agent and framework meta info at build time (version, …)
* `version-release` - bump new release version based on recommended conventional commits
* `cut-release` - cut a release using conventional changelog management
* `push-release` - push release commits and release tag to the remote git repo
* `publish-release` - publish a release to npm registry server

You can use these coaty scripts as part of npm run scripts in your package.json
`scripts` section as follows:

```json
"scripts": {
    "broker": "coaty-scripts broker <options>",
    "build": "coaty-scripts info && <run your build script here>",
    "prepare-release": "coaty-scripts version-release %1 && npm run build && coaty-scripts cut-release %2",
    "push-release": "coaty-scripts push-release",
    "publish-release": "coaty-scripts publish-release"
}
```

The following examples show how the npm run scripts defined above can be executed
on the command line:

```sh
/// Start a Coaty broker to develop and test your application
npm run broker

/// Build project including generation of agent info
npm run build

// Prepare release on current local branch
npm run prepare-release recommended "This is a release note..."

// Push release on remote git repo
npm run push-release

// Publish release to npm registry
npm run publish-release
```

Note that parameters supplied with an `npm run` command can be referenced in a
related Coaty script call by substituting a `%i` parameter, where `i` is the
one-based positional index of the desired npm run command parameter.

Aside from the npm run command you can execute coaty scripts directly via the
`npx` or `npm exec` binaries invoked on the root folder or a subfolder of your
project:

```sh
npx coaty-scripts <script-name> <script-options>
npm exec -- coaty-scripts <script-name> <script-options>
```

### Coaty broker for development

For Coaty development and testing purposes, the framework includes the
[Aedes](https://www.npmjs.com/package/aedes) MQTT broker. In your own
application projects, you can also use this broker for development and testing
in combination with the MQTT communication binding.

> Note: You should **not** use this broker in a production system. Instead, use
> a high-performance MQTT broker of your choice (such as VerneMQ, HiveMQ,
> Mosquitto, or EMQ X).

The broker script provides the following options:

```sh
coaty-scripts broker [--verbose] [--port <port>] [--bonjourHost <hostname>] [--nobonjour]
                     [--tls-cert <cert-file>] [--tls-key <key-file>]
                     [--tls-pfx <pfx-file>] [--tls-passphrase <passphrase>]
```

Runs Coaty broker on MQTT port 1883 (or the one specified with command line
option `--port <number>`) and websocket port 9883. The websocket port is
computed from the given MQTT port by adding 8000.

If the broker is launched on standard port 1883, a multicast DNS service for
broker discovery is published additionally. The broker is then discoverable
under the mDNS service name "Coaty MQTT Broker" and the service type
"coaty-mqtt". In this case, you can optionally specify a non-default
hostname/IP address for multicast DNS discovery with the command line option
`--bonjourHost`. Useful for cases, where the normal hostname provided by mDNS
cannot be resolved by DNS.

If you do not want to start the multicast DNS service for broker discovery,
specify the `--nobonjour` option.

If the command line option `--verbose` is given, Coaty broker provides verbose
logging of subscriptions. Additionally, all MQTT messages published by MQTT
clients are logged on the console, including message topic and payload.

You can also opt to run a broker with secure communication for both TCP and
Websocket by specifying either the command line options `--tls-cert` and
`--tls-key` or the options `tls-pfx` and `tls-passphrase`. Cert, key, and pfx
options should point to a corresponding file (in PEM, CRT, or PFX format,
respectively) relative to your project's root folder or to an absolute path
location. Passphrase is a string used to decrypt the PFX.

Alternatively, you can run the Coaty broker from within your application build
scripts as follows:

```js
const broker = require("coaty/scripts/broker");

// Run broker with default options
broker.run();

// or specify custom options
broker.run({ logVerbose: true, ... });
```

Options are defined in an object hash including the following properties:

* `port`: the MQTT port (default is 1883).
* `wsPort`: the MQTT websocket port (default value is computed from port by
  adding 8000).
* `logVerbose`: true for detailed logging of subscriptions and published messages
  (default is false).
* `startBonjour`: true, if multicast DNS broker discovery service should be
  published (default is false); only works if standard MQTT port 1883 is used.
  The broker is then discoverable under the mDNS service name "Coaty MQTT Broker"
  and the service type "coaty-mqtt".
* `bonjourHost`: if given, specifies the hostname/IP address to be used for
   publishing the mDNS service (optional). Useful for cases, where the normal
   hostname provided by mDNS cannot be resolved by DNS. To get the IPv4 address
   of your broker host for a specific network interface, you can use the utility
   function `MulticastDnsDiscovery.getLocalIpV4Address()`.
* `onReady`: callback function to be invoked when broker is ready (default none).
* `brokerSpecificOpts`: options passed to underlying Aedes broker instance
  (optional). For details, see
  [https://github.com/mcollina/aedes#aedesopts](https://github.com/mcollina/aedes#aedesopts).
* `tlsServerOpts`: options for secure communication for both TCP and Websocket
  via node's [TLS
  implementation](https://nodejs.org/api/tls.html#tls_tls_createserver_options_secureconnectionlistener).
  Do *not* specify this property if you do not want secure communication.

For example, to run a secure Coaty broker with a server certificate, use the
following options:

```js
const fs = require("fs");

broker.run({
    tlsServerOpts: {
        // Specify either cert-key pair (in CRT or PEM format).
        key: fs.readFileSync("server.key"),
        cert: fs.readFileSync("server.crt"),

        // Alternatively, specify PFX format with passphrase.
        // pfx: fs.readFileSync("server.pfx"),
        // passphrase: "the passphrase to decrypt the PFX"
    }
});
```

### Generate project meta info at build time

The framework provides an object interface in the `runtime` module named
`AgentInfo`. This interface represents package, build and config information of
any Coaty agent project, whether it runs as a client app or as a backend
service. Project information is generated when the project is build and can be
used at runtime, e.g. for logging, informational display, or configuration (e.g.
discriminating based on production vs. development build mode).

The framework provides several methods to generate `AgentInfo` at build time of
the project:

* an `info` script to be run as part of the build process based on npm scripts
* a gulp task to be run as part of a gulp-based build process
* a pure function to be called in custom build processes based on Node.js.

Each of these methods generates a TypeScript file named `agent.info.ts` which
exports an `AgentInfo` object on a variable named `agentInfo`. You can import
this object into your project and use it as needed:

```ts
import { agentInfo } from "path_to/agent.info";

console.log(agentInfo.buildInfo.buildDate));
console.log(agentInfo.buildInfo.buildMode));
console.log(agentInfo.packageInfo.name));
console.log(agentInfo.packageInfo.version));
console.log(agentInfo.configInfo.serviceHost));
...
```

Package information exposed by the `AgentInfo.packageInfo` object is extracted
from the project's package.json file.

The build mode exposed by the `AgentInfo.buildInfo` object indicates whether the
agent is built for a production, development, staging, or any other custom build
environment. Its value is determined by the value of the environment variable
`COATY_ENV` at build time. Typical values include `production` or `development`,
but could be any other string as well. You should set this environment variable
to a proper value before starting the build process. If this variable is not
set, a `development` build mode is assumed unless a default build mode has been
specified in the info script or function.

The `serviceHost` property exposed by the `AgentInfo.configInfo` object
represents the host name used for MQTT broker connections and REST based
services. The value is acquired from the environment variable
`COATY_SERVICE_HOST`. If not set, the value defaults to an empty string.

#### Generate project info by script

The examples explained next refer to the Angular CLI and Ionic build process.

In the build and serve/watch scripts of your package.json add a call to run
`coaty-scripts info`:

```json
 // Angular CLI
 "scripts": {
    "build": "coaty-scripts info ./src/app && ng build",
    "build:prod": "coaty-scripts info ./src/app production && ng build --prod",
    "serve": "coaty-scripts info ./src/app && ng serve",
    ...
  },
```

```json
 // Ionic
 "scripts": {
    "build": "coaty-scripts info && ionic-app-scripts build",
    "build:prod": "coaty-scripts info ./src/ production && ionic-app-scripts build --prod",
    "watch": "coaty-scripts info && ionic-app-scripts watch",
    ...
  },
```

By default, the generated `agent.info.ts` file is written to `"./src/"`. You can
customize this location by supplying an explicit first argument to the info
script. You can also specify the default build mode to use as a second argument.

#### Generate project info by gulp task

The framework provides a gulp task that you can integrate into your gulpfile.js:

```js
const infoScript = require("coaty/scripts/info");

// path_to specifies the path without filename where
// agent.info.ts should be written, such as "./src/app" for Ionic apps.
gulp.task("agentinfo", infoScript.gulpBuildAgentInfo("path_to"));

// Add the gulp task as a step of the build task
gulp.task("build", gulp.series("clean", "agentinfo", "transpile", "tslint"));
```

Note that the `agentinfo` gulp task must be run **before** transpiling the
TypeScript source code.

#### Generate project info by a function

To integrate generation of project info into your custom Node.js based build
process, you can use the function `generateAgentInfoFile` which is exported by
the `runtime` module:

```js
const infoScript = require("coaty/scripts/info");

const agentInfoFolder = "./src/";
const agentInfoFilename = "agent.info.ts";   // optional parameter
const packageFile = "package.json";          // optional parameter
const defaultBuildMode = "development";      // optional parameter
infoScript.generateAgentInfoFile(agentInfoFolder, agentInfoFilename, packageFile, defaultBuildMode);
```

### Release a project

The provided release scripts separate local steps that only affect the local git
repo from remote steps that affect the npm registry:

* `version-release` - bump new release version based on recommended conventional commits
* `cut-release` - cut the release using conventional changelog management
* `push-release` - push release commits and release tag to the remote git repo
* `publish-release` - publish the release to npm registry server

To use the release scripts in your project, add the npm modules
`conventional-changelog` and `conventional-recommended-bump` as dependencies to
your project's package.json and install them. The module versions should
correspond with the versions specified in the `coaty` framework package
definition as peer dependencies.

#### Version a release

To prepare a new release locally, first run the `version-release` script. It
computes a new package version and bumps it.

```sh
coaty-scripts version-release (recommended | first | major | minor | patch | <semantic version>)
```

If supplied with `recommended`, a recommended version bump is computed based on
conventional commits. An error is reported, if the recommended version cannot be
computed because there are no commits for this release at all.

If supplied with `first`, the package version is bumped to the current version
specified in package.json.

If supplied with `major`, `minor`, or `patch`, the package version is
incremented to the next major, minor, or patch version, respectively.

If supplied with a valid semantic version (e.g. `1.2.3` or `1.2.3-beta.5`)
this version is bumped. You can also use this option to create a prerelease.

In any of the above cases except `first`, an error is reported if the new
version to be bumped is equal to the current package version.

> The auto-generated release information in the CHANGELOG only includes `feat`,
> `fix`, and `perf` conventional commits. Non-conventional commits are *not*
> included. Other conventional commit types such as `docs`, `chore`, `style`,
> `refactor` are *not* included. However, if there is any `BREAKING CHANGE`,
> this commit will *always* appear in the changelog.

#### Cut a release

The `cut-release` script

1. updates the CHANGELOG with release information from the conventional commits,
2. commits all pending changes,
3. creates an annotated git tag with the new release version.

```sh
coaty-scripts cut-release ["<release note>"]
```

If supplied with an optional release note, the given text is prepended to the
release information generated by conventional commits. The text should consist
of whole sentences.

*Before* executing the script, you should build the project's distribution
package, and other assets, such as auto-generated API documentation.

#### Push a release

Use the `push-release` script to push the cut release commits and the release
tag to the remote git repo server.

```sh
coaty-scripts push-release
```

Note that the `push-release` script may error because the git private key
authentication has not been set up properly. In this case, you can perform this
step manually using your preferred GIT client. Do **NOT** forget to push the
release tag, too. You can push both the release commits and the annotated tag by
executing `git push --follow-tags`.

#### Publish a release

Use the `publish-release` script to publish the distribution package(s) of the
cut release on the public npm registry:

```sh
coaty-scripts publish-release [npm-tag]
```

This command publishes any distribution package located in the `dist` subfolder
of your agent project. If you want to publish multiple distribution packages,
create subfolders in the `dist` folder for each of them.

If supplied with `npm-tag`, the published packages are registered with the given
tag, such that `npm install <package>@<npm-tag>` will install this version.
If not supplied with `npm-tag`, the `latest` tag is registered. In this case,
`npm install` installs the version tagged with `latest`.

By default, packages are published on the public npm registry. If you
want to publish to a company-internal registry server, overwrite the default
by adding a `publishConfig` section to your package.json:

```json
"publishConfig": {
    "registry": "https://my.npm.registry.host/npm-server/api/npm/npm-xyz"
},
```

Note that authentication is required for publishing, so you need to set up an
appropriate account at the npm registry server first. Then, create an npm
authentication token (on npm website or by invoking `npm adduser`) and paste the
created authentication information into your `~/.npmrc`.

---
Copyright (c) 2018 Siemens AG. This work is licensed under a
[Creative Commons Attribution-ShareAlike 4.0 International License](http://creativecommons.org/licenses/by-sa/4.0/).
