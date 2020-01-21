---
layout: default
title: Coaty JS Documentation
---

# Coaty Developer Guide

This document covers everything a developer needs to know about using the Coaty
framework to implement collaborative IoT applications targeting Node.js,
as well as mobile and web apps. We assume you know nothing about Coaty JS before reading
this guide.

## Table of Contents

* [Introduction](#introduction)
* [Learn how to use](#learn-how-to-use)
* [Getting started](#getting-started)
* [Framework technology stack](#framework-technology-stack)
* [Framework structure](#framework-structure)
* [Framework design](#framework-design)
  * [Define and configure container components](#define-and-configure-container-components)
  * [Bootstrap a Coaty container in NodeJs](#bootstrap-a-coaty-container-in-nodejs)
  * [Bootstrap a Coaty container in Angular or Ionic](#bootstrap-a-coaty-container-in-angular-or-ionic)
  * [Access Coaty container components](#access-coaty-container-components)
  * [Shut down a Coaty container](#shut-down-a-coaty-container)
  * [Define an agent-specific controller class](#define-an-agent-specific-controller-class)
    * [Register controllers at run time](#register-controllers-at-run-time)
    * [Controllerless Coaty containers](#controllerless-coaty-containers)
  * [Convenience controllers](#convenience-controllers)
    * [Connection State Controller](#connection-state-controller)
    * [Object Lifecycle Controller](#object-lifecycle-controller)
    * [Object Cache Controller](#object-cache-controller)
    * [Historian Controller](#historian-controller)
* [Object model](#object-model)
  * [Define application-specific object types](#define-application-specific-object-types)
* [Communication event patterns](#communication-event-patterns)
  * [Starting and stopping communication](#starting-and-stopping-communication)
  * [Publishing events](#publishing-events)
  * [Observing events](#observing-events)
  * [Advertise event pattern - an example](#advertise-event-pattern---an-example)
  * [Deadvertise event pattern - an example](#deadvertise-event-pattern---an-example)
  * [Channel event pattern - an example](#channel-event-pattern---an-example)
  * [Discover - Resolve event pattern - an example](#discover---resolve-event-pattern---an-example)
  * [Query - Retrieve event pattern - an example](#query---retrieve-event-pattern---an-example)
  * [Update - Complete event pattern - an example](#update---complete-event-pattern---an-example)
  * [Call - Return event pattern - an example](#call---return-event-pattern---an-example)
  * [Observing and publishing raw MQTT messages](#observing-and-publishing-raw-mqtt-messages)
  * [Deferred publication and subscription of events](#deferred-publication-and-subscription-of-events)
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
  * [SQLite NodeJs adapter](#sqlite-nodejs-adapter)
  * [SQLite Cordova adapter](#sqlite-cordova-adapter)
  * [Implement a custom database adapter](#implement-a-custom-database-adapter)
* [Decentralized logging](#decentralized-logging)
* [Utilities](#utilities)
  * [Asynchronous promise operations](#asynchronous-promise-operations)
  * [Binary search and insert](#binary-search-and-insert)
  * [Localized ISO date-time formatting](#localized-iso-date-time-formatting)
  * [Deep comparison checks](#deep-comparison-checks)
* [NodeJS utilities](#nodejs-utilities)
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

The Coaty framework provides a production-ready application and communication layer
foundation for building collaborative IoT applications in an easy-to-use yet powerful and
efficient way. The key properties of the framework include:

* a lightweight and modular object-oriented software architecture favoring a
  resource-oriented and declarative programming style,
* standardized event based communication patterns on top of a open publish-subscribe
  messaging protocol (currently [MQTT](https://mqtt.org)),
* a platform-agnostic, extensible object model to discover, distribute, share,
  query, and persist hierarchically typed data, and
* rule based, context driven routing of IoT (sensor) data using smart backpressure
  strategies.

Coaty supports interoperable framework implementations for multiple platforms.
The Coaty JS package provides the cross-platform implementation targeted at
JavaScript/TypeScript, running as mobile or web apps in the browser, or as Node.js
services.

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
  protocol](https://coatyio.github.io/coaty-js/man/communication-protocol/),
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

Finally, the unit tests delivered with the framework itself also provide a valuable
source of programming examples for experienced developers.

Note that the framework makes heavy use of the Reactive Programming paradigm
using RxJS observables. Understanding observables is an indispensable
prerequisite for developing applications with the framework. An introduction to
Reactive Programming can be found [here](http://reactivex.io/). Examples and
explanations can be found on the [RxJS](https://rxjs.dev/) and [Learn
RxJS](https://www.learnrxjs.io/) websites.

If you are new to TypeScript programming, we recommend to take a look at the official
[TypeScript website](http://www.typescriptlang.org/). Its "Playground" is especially useful
to interactively try some TypeScript code in your browser.

To program Coaty applications, we recommend to use [Visual Studio
Code](https://code.visualstudio.com/), a free, open source IDE that runs
everywhere. Install the VS Code extension "TypeScript TSLint Plugin" to enable
TypeScript linting within the IDE.

## Getting started

To build and run Coaty agents with the Coaty JS technology stack
you need to install the `Node.js` JavaScript runtime (version 8 or higher) globally on
your target machine. Download and installation details can be found [here](http://nodejs.org/).

The framework uses the package dependency manager `npm` to download dependent libraries.
npm comes with `Node.js` so you need to install it first.

You can install the latest distribution package in your agent project as follows:

```sh
npm install coaty --save
```

For detailed installation instructions, consult the
[README](https://github.com/coatyio/coaty-js/blob/master/README.md) in
section "Installing the framework".

## Framework technology stack

The Coaty JavaScript technology stack makes use of the following core
technologies:

* **TypeScript** - the framework's main programming language
* **MQTT.JS** - an MQTT client used to implement event based communication on
  top of MQTT messaging
* **RxJS** - the ReactiveX JavaScript library for asynchronous programming with
  observable streams

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

Coaty JS is realized as an inversion of control (IOC) framework with a
component design that supports dependency injection (DI) and lifecycle management (LM):

* **Container**: An IoC container that defines the entry and exit
  points for any Coaty agent project. It provides lifecycle
  management for container components by realizing a register-resolve-release pattern.
  The container is responsible for composing the graph of components
  using constructor dependency injection.

* **Controller**: A container component that encapsulates business logic.
  A controller publishes and observes communication events, provides observable state
  to the agent project (e.g. views), supports lifecycle management, etc. A Coaty
  container can contain any number of controllers which are specified declaratively.

* **Communication Manager**: Each container contains exactly one instance
  of the `CommunicationManager` class that provides publish-subscribe for communication event
  patterns to exchange typed object data by an underlying messaging protocol.

* **Configuration**: A `Configuration` object that defines configuration options for the
  defined controllers as well as common, communication, and database related options.

* **Runtime**: Each container contains exactly one instance
  of the `Runtime` class that provides access to container’s runtime data,
  including configuration options, as well as platform and framework meta information.

A Coaty agent project should interact with its Coaty container as follows:

1. Define and configure all components that should be part of the container.
2. Bootstrap the container on startup.
3. Dynamically register components at run time (optional).
4. Shutdown the container on exit or whenever it is no longer needed (optional).

### Define and configure container components

By default, each Coaty container contains a Communication Manager, a Runtime, and
a Configuration object. Application-specific controllers are classes derived from the base
`Controller` class provided by the framework. They are declared as part of a container
by the `Components` interface object.

```ts
import { Components } from "@coaty/core";

import { ProductionOrderController, SupportTaskController, WorkflowController } from "./controllers";

const components: Components = {
    controllers: {
        ProductionOrderController,
        SupportTaskController,
        WorkflowController
    }
};
```

The configuration options for the container components are specified by a separate
Configuration interface object:

```ts
import { Configuration } from "@coaty/core";

const configuration: Configuration = {
    common: {
         // Common options shared by all container components
         associatedUser: ... ,
         associatedDevice: ... ,
         agentInfo: ... ,
         ...
    },
    communication: {
          // Options used for communication
          identity: ... ,
          brokerUrl: ... ,
          mqttClientOptions: ... ,
          shouldAutoStart: ... ,
          shouldAdvertiseIdentity: ... ,
          shouldAdvertiseDevice: ... ,
          useReadableTopics: ... ,
    },
    controllers: {
        // Controller-specific configuration options
        ProductionOrderController: {
            identity: ... ,
            shouldAdvertiseIdentity: false,
            ...
        },
        SupportTaskController: {
            identity: ... ,
            shouldAdvertiseIdentity: true,
            ...
        },
        WorkflowController: {
            identity: ... ,
            shouldAdvertiseIdentity: true,
            ...
        },
    },
    databases: {
        // Options to configure database access
        database1: {
            adapter: ... ,
            adapterOptions: ... ,
            connectionString: ... ,
            connectionOptions: ... ,
        },
        database2: {
            ...
        },
        ...
    }
};
```

Note that both controllers and the Communication Manager maintain an `identity`
object of type `Component` that provides metadata of the component, including
its `name`, a unique object ID, etc. By default, these identity objects are
advertised when the components are set up and deadvertised on normal or abnormal
termination of a Coaty agent. The communication managers's identity is also
discoverable (by publishing a Discover event with core type "Component") if and
only if the identity has been advertised.

Using the controller and/or communication options, you can opt out
of de/advertisement by setting `shouldAdvertiseIdentity` to `false`.
For details, see this [section](#distributed-lifecycle-management).

### Bootstrap a Coaty container in NodeJs

In a Node.js environment you can bootstrap a Coaty container synchronously
on startup by registering and resolving the declared container components:

```ts
import { Container } from "@coaty/core";

const container = Container.resolve(components, configuration);
```

You can also retrieve the configuration object from a local JSON or JS file:

```ts
import { provideConfiguration } from "@coaty/core/runtime-node";

const configuration = provideConfiguration("app.config.json");
```

Alternatively, you can bootstrap a container asynchronously by retrieving
the Configuration object from a Url:

```ts
import { Container } from "@coaty/core";
import { provideConfigurationAsync } from "@coaty/core/runtime-node";

// Returns a promise on a container for the given components and config options
Container
    .resolveAsync(
        components,
        provideConfigurationAsync("http://myconfighost/app.config.json"))
    .then(container => ...);
```

Note that the Communication Manager can be started automatically after all
container components have been resolved. To do this, set the configuration
setting `shouldAutoStart` to `true` in the communication options.
Otherwise, you have to start the Communication Manager
explicitely by invoking its `start` method.

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

Aa an alternative to the aforementioned approach, you can also create and
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
underlying webpack doesn't configure any shims for Node.js any more. But the
MQTT.js client library used by Coaty JS requires some Node.js polyfills (for
process, global, Buffer, etc.) when run in the browser.

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
    // MQTT.js dependency modules when run in the browser.
    node: {
        console: false,
        global: true,
        process: true,
        __filename: 'mock',
        __dirname: 'mock',
        Buffer: true,
        setImmediate: true

        // See "Other node core libraries" for additional options.
    }
};
```

The Angular project configuration in `angular.json` must be adjusted to integrate
the custom webpack config file by using custom builders for the build and serve targets:

```json
    "targets": {
        "build": {
          "builder": "@angular-builders/custom-webpack:browser",
          "options": {
            "customWebpackConfig": {
                "path": "./webpack.node-polyfills.config.js"
             },


        "serve": {
          "builder": "@angular-builders/dev-server:generic",
```

Finally, install the custom builders as development dependencies of your project:

```sh
npm install @angular-builders/custom-webpack --save-dev
npm install @angular-builders/dev-server --save-dev
```

### Access Coaty container components

You can access the components within a container directly using one of
these container accessors/methods:

```ts
container.runtime
container.communicationManager
container.getController(controllerName)
container.mapControllers(callback)
```

### Shut down a Coaty container

Before the Coaty agent exists, or if you no longer need the container,
shut down the container to release all registered components and its
allocated system resources:

```ts
container.shutdown();
```

The shutdown method first shuts down all container controller and IO routing components
by invoking the component's `onDispose` method (in arbitrary order). Finally,
the Communication Manager's `onDispose` method is called which unsubscribes
all subscriptions and disconnects the messaging client from the MQTT message broker.

After invoking shutdown, the container and its components are no longer usable.

Note that the `onDispose` method of container components is only called
when the container is shut down by invoking the `shutdown` method. You should
not perform important side effects in `onDispose`, such as saving agent
state persistently, because the `onDispose` method is not guaranteed to be called
by the framework in every circumstance, e.g., when the agent process
terminates abnormally or when the `shutdown` method is not used by your app.

### Define an agent-specific controller class

Agent-specific controller classes realize custom business logic of a
Coaty agent. A controller

* exchanges object data with other agent components by publishing
  and observing communication events.
* provides observable state to other parts of the project, such as views.
* provides methods for lifecycle management.

In accordance with the design principle of separation of concerns, each
custom controller class should encapsulate a single dedicated functionality.

To combine or aggregate the functionalities of multiple controllers, use
a separate service class in your agent project (e.g. an injectable service
in Angular) or define a superordinate controller that references the
other controllers (see use of delegation design pattern in the next section).

The following template shows how to set up the basic structure of a custom
controller class:

```ts
import { Subscription } from "rxjs";
import { map } from "rxjs/operators";

import { Controller, CoreTypes, Task } from "@coaty/core";

export class SupportTaskController extends Controller {

    private _advertiseTaskSubscription: Subscription;

    onInit() {
        super.onInit();

        // Define your initializations here
        this._advertiseTaskSubscription = undefined;
    }

    onCommunicationManagerStarting() {
        super.onCommunicationManagerStarting();

        // Set up subscriptions for incoming events here
        this._advertiseTaskSubscription = this._observeAdvertiseTask();
    }

    onCommunicationManagerStopping() {
        super.onCommunicationManagerStopping();

        // Clean up subscriptions for incoming events here
        this._advertiseTaskSubscription && this._advertiseTaskSubscription.unsubscribe();
    }

    private _observeAdvertiseTask() {
        return this.communicationManager.observeAdvertiseWithObjectType(this.identity, "com.helloworld.SupportTask")
            .pipe(map(event => event.eventData.object as SupportTask))
            .subscribe(task => {
                // Do something whenever a support task object is advertised
            });
    }
}
```

Note that it is not safe to query a controller in the constructor of your
custom controller because the requested controller might not have been created
yet. Instead, you should access and cache other controllers in your custom
controller class by defining a `onContainerResolved` lifecycle method:

```ts
onContainerResolved(container: Container) {
    // Access and cache another controller
    this._tasksController = container.getController("TasksController");
}
```

You can define the `onInit` lifecycle method in your custom controller class to
perform side effects when the controller instance has been instantiated
(instead of defining a constructor):

The `onInit` method is called immediately after the controller instance
has been created. Although the base implementation does nothing it is good
practice to call super.onInit() in your override method; especially if your
custom controller class extends from another custom controller class
and not from the base `Controller` class directly.

You can override the following lifecycle methods in your custom controller class
to perform side effects when the operating state of the Communication Manager
changes (see section on Communication Manager below).

```ts
onCommunicationManagerStarting()
onCommunicationManagerStopping()
```

Usually, in the starting method, RxJS subscriptions for incoming communication events
are set up; whereas in the stopping method these subscriptions should be unsubscribed.

> Ensure you always call the corresponding super method in your overridden method.

#### Register controllers at run time

A controller can also be dynamically registered and resolved at run time:

```ts
const myCustomCtrl = container.registerController(
    "MyCustomController",
    MyCustomController,
    {
        "MyCustomController": { <controller configuration options> }
    });
```

If your custom controller needs to access functionality of other controllers, two
different design patterns can be used:

1. Inheritance: Extend your controller class from a base controller class.
2. Delegation: provide instance member(s) that refer to the dependent controller(s).

By using the delegation pattern, your custom controller instance should set up
the references to dependent controllers in the `onContainerResolved` lifecycle
method as explained in the previous section. In this method, you can also
dynamically create and register a dependent controller that has not been
configured in the container configuration by using `container.registerController`.

> Note that the delegation design pattern supports exchanging communication events
> between your custom controller and its dependent controllers.

#### Controllerless Coaty containers

Although not recommended, you can run a Coaty container without any controllers.
This is useful if your application is designed in such a way that communication
functionality must be directly embedded into the business logic.

In this case, access the container's communication manager directly to publish
and observe communication events. A minimal Coaty container without controllers
can be set up as follows:

```ts
const container = Container.resolve({}, { <configuration options> });

// Use CommunicationManager directly.
container.communicationManager.publishAdvertise(...)
container.communicationManager.observeAdvertise(...)
...
```

### Convenience controllers

Besides the base `Controller` class, the framework also provides
some convenience controller classes that you can reuse in your
agent project.

#### Connection State Controller

The `ConnectionStateController` class monitors the connection state (online or offline)
of the associated communication manager.

Use its  `isOffline` getter to get a boolean observable that emits `true` if the
connection state of the associated communication manager transitions to offline, and
`false` if it transitions to online. When subscribed, the current connection state is
emitted immediately.

#### Object Lifecycle Controller

The `ObjectLifecycleController` class supports [distributed lifecycle
management](#distributed-lifecycle-management). It keeps track of specific
agents/objects in a Coaty network by monitoring identity components of
communication managers, controllers or custom object types. The controller
observes advertisements and deadvertisements of such objects and initially
discovers them. Changes are emitted on an observable that applications can
subscribe to.

You can use this controller standalone by adding it to the container components
or make your custom controller class extend this controller class.

Basically, to keep track of identity components, the `shouldAdvertiseIdentity`
option in `CommunicationOptions` and/or `ControllerOptions` must be set to
`true`. Note that this controller also supports tracking the identities of the
communication manager and the *other* controllers inside its *own* agent
container.

The following example shows how to keep track of identity components of specific
agents whose communication manager has an identity named `"LightAgent"`.

This approach assumes the lifecycle container has been added to the container
components under the name `ObjectLifecycleController`:

```ts
import { Subscription } from "rxjs";
import { Container, Controller, ObjectLifecycleController } from "@coaty/core";

class MyController extends Controller {

    private _lifecycleController: ObjectLifecycleController;
    private _lifecycleSubscription: Subscription;

    onContainerResolved(container: Container) {
        this._lifecycleController = container.getController<ObjectLifecycleController>("ObjectLifecycleController");
    }

    onCommunicationManagerStarting() {
        super.onCommunicationManagerStarting();
        this._lifecycleSubscription = this._lifecycleController
            .observeObjectLifecycleInfoByCoreType("Component", obj => obj.name === "LightAgent")
            .subscribe(info => {
                // Called whenever identity components for light agents have changed.
                console.log(info.added);     // newly advertised or discovered identity components
                console.log(info.changed);   // readvertised or rediscovered identity components
                console.log(info.removed);   // deadvertised identity components
            });
    }

    onCommunicationManagerStopping() {
        super.onCommunicationManagerStopping();
        if (this._lifecycleSubscription) {
            // Stop observing lifecycle info of identity components for light agents.
            this._lifecycleSubscription.unsubscribe();
        }
    }
}
```

This approach assumes your custom controller class inherits from the lifecycle container class:

```ts
import { Subscription } from "rxjs";
import { ObjectLifecycleController } from "@coaty/core";

class MyController extends ObjectLifecycleController {

    private _lifecycleSubscription: Subscription;

    onCommunicationManagerStarting() {
        super.onCommunicationManagerStarting();
        this._lifecycleSubscription = this.observeObjectLifecycleInfoByCoreType("Component", obj => obj.name === "LightAgent")
            .subscribe(info => {
                // Called whenever identity components for light agents have changed.
                console.log(info.added);     // newly advertised or discovered identity components
                console.log(info.changed);   // readvertised or rediscovered identity components
                console.log(info.removed);   // deadvertised identity components
            });
    }

    onCommunicationManagerStopping() {
        super.onCommunicationManagerStopping();
        if (this._lifecycleSubscription) {
            // Stop observing lifecycle info of identity components for light agents.
            this._lifecycleSubscription.unsubscribe();
        }
    }
}
```

To keep track of identity components, the code shown above is sufficient.
However, if you want to keep track of *custom object types* (not commmunication
manager or controller identities), you have to implement the remote side of the
distributed object lifecycle management, i.e. advertise/readvertise/deadvertise
your custom objects and observe/resolve corresponding Discover events
explicitely. To facilitate this, the `ObjectLifecycleController` provides these
convenience methods: `advertiseDiscoverableObject`,
`readvertiseDiscoverableObject`, and `deadvertiseDiscoverableObject`.

Usually, a custom object should have the identity UUID of its associated
communication manager set as its `parentObjectId` to be automatically
deadvertised when the agent terminates abnormally. You can automate this by
passing `true` to the optional parameter `shouldSetParentObjectId` of method
`advertiseDiscoverableObject` (`true` is also the default parameter value).

The following example shows how to keep track of a custom Coaty object.

The first controller is responsible for advertising the custom object, and for
making it discoverable. Note that when the communication manager is stopped the
custom object is automatically deadvertised.

```ts
import { Subscription } from "rxjs";
import { ObjectLifecycleController } from "@coaty/core";

class CustomObjectAdvertisingController extends ObjectLifecycleController {

    myCustomObject: CoatyObject;

    private _myCustomObjectLifecycleSubscription: Subscription;

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
        this._myCustomObjectLifecycleSubscription = this.advertiseDiscoverableObject(this.myCustomObject);
    }

    onCommunicationManagerStopping() {
        super.onCommunicationManagerStopping();
        if (_myCustomObjectLifecycleSubscription) {
            // Stop observing/resolving Discover events for the custom object that has
            // been set up in advertiseDiscoverableObject.
            _myCustomObjectLifecycleSubscription.unsubscribe();
        }
    }
}
```

The second controller keeps track of custom objects as advertised/discoverable
by the first controller:

```ts

class CustomObjectTrackingController extends ObjectLifecycleController {

    private _lifecycleSubscription: Subscription;

    onCommunicationManagerStarting() {
        super.onCommunicationManagerStarting();
        this._lifecycleSubscription = this.observeObjectLifecycleInfoByObjectType("com.example.MyCustomObject")
            .subscribe(info => {
                // Called whenever custom lifecycle objects of type "com.example.MyCustomObject" have changed.
                console.log(info.added);     // newly advertised or discovered objects
                console.log(info.changed);   // readvertised or rediscovered objects
                console.log(info.removed);   // deadvertised objects
            });
    }

    onCommunicationManagerStopping() {
        super.onCommunicationManagerStopping();
        if (this._lifecycleSubscription) {
            // Stop observing lifecycle info for custom objects of type "com.example.MyCustomObject".
            this._lifecycleSubscription.unsubscribe();
        }
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

Resolve an object with a given objectId by your custom cache controller
as follows:

```ts
this.userCacheController.resolveObject(objectId)
    .subscribe(
        obj => {
            // Emits the first object of the observable, then completes
        },
        error => { ... });
```

#### Historian Controller

The `HistorianController` class is a generic controller which can be used
on each Coaty agent to create and/or persist snapshots in time of arbitrary Coaty
objects.

A snapshot represents a deep copy of the object and its state, a timestamp, a creator ID,
and an optional array of associated tags. The tags can be used on retrieval of snapshots
to identify different purposes.

A snapshot is created by the `generateSnapshot(object, ...tags)` or
`generateSnapshot(object, timestamp, ...tags)` method.
Driven by specific controller options, you can decide to

* advertise each generated snapshot (`shouldAdvertiseSnapshots`)
* persist each generated snapshot in a database collection (`shouldPersistLocalSnapshots`)
* persist each observed snapshot advertised by another Historian controller (`shouldPersistObservedSnapshots`)
* execute matching Query events for snapshot objects on the database and retrieve results (`shouldReplyToQueries`)

The `HistorianController` provides a convenience method to query snapshots using the
Query event pattern:

* `querySnapshotsByParentId(parentObjectId: Uuid): Observable<Snapshot[]>`

The `HistorianController` also provides convenience methods to retrieve snapshots
from a database collection:

* `findSnapshotsByParentId(parentObjectId: Uuid, startTimestamp?: number, endTimestamp?: number): Promise<Snapshot[]>`
* `findSnapshotsByTimeFrame(startTimestamp?: number, endTimestamp?: number): Promise<Snapshot[]>`
* `findSnapshotsByFilter(filter: ObjectFilter): Promise<Snapshot[]>`

You can set up a `HistorianController` in the Coaty container components and configuration
as follows:

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
        common: { ... },
        communication: { ... },
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

The `database` controller option has two properties `key` and `collection`; `key` references the
database key as defined in the `databases` option of your configuration; `collection` is the name
of the collection to be used. If the collection doesn't exist, it will be created in the given
database.

To see an example of the `HistorianController` in action, take a look at the
[Hello World
example](https://github.com/coatyio/coaty-examples/tree/master/hello-world/js).

## Object model

The Coaty framework provides a predefined hierarchy of core object types
that are used by Coaty agents to exchange typed data with communication
patterns. The core object type hierarchy is defined in the `coaty/model` module
and looks as follows:

```
CoatyObject
  |
  |-- User
  |-- Device
  |-- Component
  |-- Config
  |-- Annotation
  |-- Task
  |-- Location
  |-- Log
  |-- Snapshot
  |
  |-- IoSource
  |-- IoActor
```

> Note: Besides these core types, the framework also provides some object types to manage sensor data.
> These object types are defined in the `coaty/sensor-things` module and explained in detail in the
> guide on [OGC SensorThings API integration](https://coatyio.github.io/coaty-js/man/sensor-things-guide/).

Coaty objects are characterized as follows:

* Object types are represented as statically typed TypeScript interfaces of
  property - value-type definitions. Coaty applications can define custom object types
  that derive from one of the predefined object types supplied by the framework.

* Objects solely represent attribute - value pairs that model state but no behavior.

* Objects are JSON compatible (JavaScript Object Notation) to support cross-component and
  cross-platform serialization.

* Objects can be persisted schemalessly in NoSQL and
  SQL data stores using the Unified Storage API of the framework.

* Objects can be used by and transfered across all system components, including devices,
  frontend apps, services, and even databases. There is no need to define
  separate DTOs (Data Transfer Objects) for communication.

* Objects are schema-validated by the framework according to their TypeScript
  interface definitions. Schema validation ensures that all specified
  property - value pairs of an object that is distributed across system components
  conform to the object type's shape. Schema validation comprises all properties
  of the core types defined by the framework. It is allowed to dynamically
  add additional properties to a core object at runtime. However, these
  properties are **not** validated. Likewise, additional properties of object types
  derived from a core type are **not** validated.

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
  coreType: "CoatyObject" | "User" | "Device" | ...;
  objectType: string;
  name: string;
  objectId: Uuid;
  externalId?: string;
  parentObjectId?: Uuid;
  assigneeUserId?: Uuid;
  locationId?: Uuid;
  isDeactivated?: boolean;
}
```

The property `coreType` is the framework core type name of the object;
it corresponds with the name of the interface that defines the object's shape.

The `objectType` property is the concrete type name of the object in a canonical
form. It should be defined using a hierarchical naming pattern with some levels in the
hierarchy separated by periods (`.`, pronounced "dot") to avoid name collisions,
following Java package naming conventions (i.e. `com.domain.package.Type`).
All predefined object types use the form `coaty.<InterfaceName>`,
e.g. `coaty.CoatyObject` (see constants in `CoreTypes` class). Do not use the
reserved toplevel namespace `coaty.*` for your application defined object types.

The concrete and core type names of all predefined object types are defined
as static properties of the `CoreTypes` class in the framework `model` module.

The `name` property defines a descriptive name for the object.

The `objectId` property defines the unique identity of an object within the system.

The optional `externalId` property defines the identity of an object relative to
an external system, such as the primary key for this object in an external database.
Note that external IDs are not guaranteed to be unique across
the whole universe of system objects. Usually, external IDs are only unique for
a specific type of objects.

The optional `parentObjectId` property refers to the UUID of the parent object.
It is used to model parent-child relationships of objects. For example,
Annotation objects can be modelled as children of target objects they are attached to.

The optional `assigneeUserId` property specifies the UUID of the user object
that this object has been assigned to currently.

The optional `locationId` property refers to the UUID of the Location
object that this object has been associated with.

The optional `isDeactivated` property marks an object that is no longer used. The
concrete definition meaning of this property is defined by the Coaty application.
The property value is optional and defaults to false.

Application specific object types can be defined based on the predefined core object
types by adding additional property-value pairs. Allowed value types must conform to
JSON data types.

### Define application-specific object types

Simply extend one of the predefined object types of the framework and specify
a canonical object type name for the new object:

```ts
import { Task } from "@coaty/core";

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
const task: HelloWorldTask = {
    objectId: this.runtime.newUuid(),
    objectType: modelTypes.OBJECT_TYPE_HELLO_WORLD_TASK,
    coreType: "Task",
    name: `Hello World Task`,
    creatorId: this.runtime.options.associatedUser.objectId,
    creationTimestamp: Date.now(),
    status: TaskStatus.Request,
    urgency: HelloWorldTaskUrgency.Critical,
};
```

## Communication event patterns

By default, each Coaty container has a *Communication Manager* component that is
registered implicitely with the container. It provides a complete set of predefined
communication event patterns to exchange object data in a decentralized Coaty application:

* **Advertise** an object: broadcast an object to parties interested in objects of a
  specific core or object type.
* **Deadvertise** an object by its unique ID: notify subscribers when capability is
  no longer available; for abnormal disconnection of a client, last will concept can be
  implemented by sending this event.
* **Channel** Broadcast objects to parties interested in any type of objects delivered
  through a channel with a specific channel identifier.
* **Discover - Resolve** Discover an object and/or related objects by external ID,
  internal ID, or object type, and receive responses by Resolve events.
* **Query - Retrieve**  Query objects by specifying selection and ordering criteria,
  receive responses by Retrieve events.
* **Update - Complete**  Request or suggest an object update and receive
  accomplishments by Complete events.
* **Call - Return**  Request execution of a remote operation and receive results by
  Return events.
* **Associate** Used by IO Router to dynamically associate/disassociate IO sources
  with IO actors.
* **IoValue** Send IO values from a publishing IO source to associated IO actors.

Coaty not only provides *one-way* communication event patterns, such as Advertise
and Channel, that support classic publish-subscribe interaction between Coaty
agents. With *two-way* event patterns, *request-response* interaction between
Coaty agents can be realized, similar to, for example, HTTP/REST or RPC.

While traditional request-response interaction is always directed towards
a single concrete endpoint that must be known by the requester, Coaty two-way
request-response event patterns share the characteristics of publish-subscribe
communication: A request event is always directed towards all subscribers
which are interested in this kind of event. Response events are published
by all subscribers that are willing to provide answers. This means that
response events for a single request event can be provided independently
by multiple subscribers, and each subscriber can publish multiple
responses over time.

The use case specific logic implemented by the requester determines how to
handle such responses. For example, the requester can decide to

* just take the first response and ignore all others,
* only take responses received within a given time interval,
* only take responses until a specific condition is met,
* handle any response over time, or
* process responses as defined by any other application-specific logic.

In the latter case innovative scenarios beyond classic request-response
can be realized. For example, a Query event responder could
re-execute the database query and publish a Retrieve event with the
new results every time the concerned storage area is updated.
In this way inefficient database polling is replaced by an efficient
push-based approach.

Internally, events are emitted and received by the Communication Manager using
publish-subscribe messaging with an MQTT message broker. Events are passed to
Coaty controllers by following the Reactive Programming paradigm using RxJS
observables.

The Communication Manager provides features to transparently control the underlying
publish-subscribe communication layer, including auto-reconnect, automatic re-subscription
upon connection, and queued offline publishing.

### Starting and stopping communication

Use the `CommunicationManager.start` method to connect to a broker. Note
that the Communication Manager automatically connects after the container is
resolved if the communication option `shouldAutoStart` is set to `true`
(opt-in). The communication manager automatically tries to reconnect
periodically whenever the broker connection is lost.

Use the `CommunicationManager.restart` method to reconnect to a (maybe different)
broker. This is useful if you want to switch connection from one broker to another
or after the runtime user/device association has changed.

Use the `CommunicationManager.stop` method to disconnect from the broker.
Afterwards, events are no longer dispatched and emitted. You can start the
Communication Manager again later using the `start` method.

Whenever the operating state of the Communication Manager changes by invoking
one of the above method calls all the controller components of the container
are notified by the following lifecycle methods:

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
communication state changes of the underlying MQTT connection (i.e. online or offline).
Usage of this feature is further simplified by a convenience controller class
named [`ConnectionStateController`](#connection-state-controller).

### Publishing events

Use `publishAdvertise` to send Advertise events. The core type (`coreType`) and
the object type (`objectType`) of the advertised object is used to deliver
corresponding events to parties observing Advertise events for the same core
or object type.

Use `publishDeadvertise` to send Deadvertise events for objects by specifying
their object IDs.

Use `publishChannel` to send Channel events. A channel identifier must be specified.
It is used to deliver the channeled objects to parties observing Channel events
for the same channel identifier.

Use `publishDiscover` to send Discover events. The observable returned
will emit all the Resolve events which are direct responses to the published request.
Be aware that multiple Resolve events may be emitted from different parties
which may have different payloads: some may be responding with an object,
some with related objects, and some with both. Your Resolve event handler
must differentiate these cases carefully. For example, if you are discovering
an object ID and you are only interested in related objects (e.g. annotation
objects) you have to ignore response events which only provide an object
but no related objects. The `DiscoverEventData` class provides convenience methods
to differentiate between supported payloads: `isDiscoveringExternalId`,
`isDiscoveringObjectId`, `isDiscoveringExternalAndObjectId`, `isDiscoveringTypes`,
`isCoreTypeCompatible`, `isObjectTypeCompatible`. The `matchesObject` method
can be used to determines whether a given object matches the requirements of
incoming discover event data.

Use `publishUpdate` to send Update events. The observable returned will
emit all the Complete events which are direct responses to the published request.

Use `publishQuery` to send Query events. The observable returned will
emit all the Retrieve events which are direct responses to the published request.

Use `publishCall` to send Call events. The observable returned will
emit all the Return events which are direct responses to the published request.

Note that when publishing an event, an event source object (of type
`CoatyObject`) must be specfied that uniquely identifies the source component,
i.e. the Coaty controller. Likewise, when observing events, an event target
object (of type `CoatyObject`) must be specified that uniquely identifies the
target component. To suppress echo events, a component that acts both as an
event source and as an event target for the same event type will *never* receive
the published event on its associated observable.

> Note that all publish methods for request-response event patterns, i.e.
> `publishDiscover`, `publishUpdate`, `publishQuery`, and `publishCall` publish
> the specified event **lazily**, i.e **not until** the first observer subscribes
> to the observable returned by the method. In this way race conditions on the
> response event can be avoided. Since the observable never emits a completed
> event, a subscriber should *unsubscribe* when the observable is no
> longer needed to release system resources and to avoid memory leaks.
> After all initial subscribers have unsubscribed no more response events
> will be emitted on the observable. Instead, errors will be emitted to all
> subsequent resubscriptions.

For example, you can unsubscribe automatically after the expected response
event is received by using the RxJS `first` operator like the following:

```ts
import { first, timeout } from "rxjs/operators";

this.communicationManager.publishDiscover(...)
    .pipe(
        // Unsubscribe automatically after first response event arrives.
        // Could also use the 'take' operator: take(1).
        first(),

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

A similar coding pattern to easily unsubscribe from observables uses the RxJS
`takeUntil` operator with an RxJS `Subject` like the following:

```ts
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";

const destroyed$ = new Subject();

this.communicationManager.publishDiscover(...)
    .pipe(
        // After first emission on the given subject, stop processing and unsubscribe.
        takeUntil(destroyed$),
    )
    .subscribe(
        event => {
            // Handle response events until destroyed subject emits.
        });

// Cancel processing of response events by emitting a value.
destroyed$.next();
```

This pattern is especially useful if you want to unsubscribe from multiple
observables on an external trigger. However, note that the `takeUntil` operator
should always be the *last* operator in a pipe, so that previous operators that
involve subscriptions of another observable source are properly unsubscribed as
well and don’t leak. A detailed explanation is given
[here](https://blog.angularindepth.com/rxjs-avoiding-takeuntil-leaks-fb5182d047ef).

### Observing events

Use any of the `observeDiscover`, `observeQuery`, `observeUpdate`, `observeCall`,
`observeAdvertiseWithCoreType`, `observeAdvertiseWithObjectType`, `observeDeadvertise`,
`observeChannel`, or `observeAssociate` methods to observe incoming request events
in your agent. For `observeDiscover`, `observeQuery`, `observeUpdate`, or `observeCall`,
invoke the `resolve`, `retrieve`, `complete`, or `returnEvent` method on the received
event object to send a response event.

> Note that there is no guarantee that response events are ever delivered by the
> Discover, Query, Update, and Call communication patterns. Depending on your system
> design and context such a communication pattern might return no responses at all
> or not within a certain time interval. In your agent project, you should handle these
> cases by chaining a timeout handler to the observable returned by the observe
> method (see code examples below in the next sections).

### Advertise event pattern - an example

The Advertise event is used to communicate Coaty objects to agents interested in
a specific tyoe of object. Advertise events can be observed based on either an
object's core type (`coreType`) or an object's object type (`objectType`).

```ts
import { filter, map } from "rxjs/operators";

// Publish an Advertise event for a Task object
this.communicationManager
    .publishAdvertise(AdvertiseEvent.withObject(this.identity, task)));


// Observe Advertise events on all objects of core type "Task"
this.communicationManager
    .observeAdvertiseWithCoreType(this.identity, "Task")
    .pipe(
        map(event => event.eventData.object as Task),
        filter(task => task.status === TaskStatus.Request)
    )
    .subscribe(task => {
         // Handle task request emitted by Advertise event
    });

// Observe Advertise events on objects of object type "com.helloworld.Task"
this.communicationManager
    .observeAdvertiseWithObjectType(this.identity, "com.helloworld.Task")
    .pipe(
        map(event => event.eventData.object as HelloWorldTask),
        filter(task => task.status === TaskStatus.Request)
    )
    .subscribe(task => {
         // Handle HelloWorld task request emitted by Advertise event
    });
```

### Deadvertise event pattern - an example

The Deadvertise event works in combination with the Advertise event.
By publishing a Deadvertise event with the unique object ID of an object,
you can notify observers that this object (which has been advertised earlier)
is no longer available:

```ts
import { map } from "rxjs/operators";

const object: CoatyObject = {
    objectid: "3b820148-e3e1-42d6-8d20-425e54670b06",
    ...
};

// Publish a Deadvertise event
this.communicationManager
    .publishDeadvertise(DeadvertiseEvent.withObjectIds(this.identity, object.objectId));

// Observe Deadvertise events
this.communicationManager
    .observeDeadvertise(this.identity)
    .pipe(map(event => event.eventData.objectIds))
    .subscribe(objectIds => {
        // Handle object IDs of deadvertised objects which have been advertised previously
    });
```

This concept is especially useful in combination with abnormal termination of an
agent and the MQTT last will concept. On connection to the broker, the communication
manager of a Coaty container sends a last will message consisting of a Deadvertise
event with the object ID of its identity component and its associated device (if defined).
Whenever the agent disconnects normally or abnormally, the broker publishes its last will
message to all subscribers which observe Deadvertise events. For details, see this
[section](#distributed-lifecycle-management).

Using this pattern, agents can detect the online/offline state of other Coaty
agents and act accordingly. One typical use case is to set the parent object ID
(or a custom property) of advertised application root objects originating from a
specific Coaty agent to the identity ID (or associated device ID) of the agent's
communication manager. In case this agent is disconnected, other agents can
observe Deadvertise events and check whether one of the deadvertised object IDs
correlates with the parent object ID (or custom property) of any application
root object the agent is managing and invoke specific actions.

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
thing.parentObjectId = this.communicationManager.identity.objectId;
// Publish an Advertise event for Thing object
this.communicationManager
    .publishAdvertise(AdvertiseEvent.withObject(this.identity, thing)));
```

An agent can observe the sensor device connection state as follows:

```ts
import { map } from "rxjs/operators";
import { SensorThingsTypes, Thing } from "@coaty/core/sensor-things";

// Observe Advertise events on Thing objects
this.communicationManager
    .observeAdvertiseWithObjectType(this.identity, SensorThingsTypes.OBJECT_TYPE_THING)
    .pipe(map(event => event.eventData.object as Thing))
    .subscribe(thing => {
         // Store thing for later use
         this.onlineThings.push(thing);
    });

// Observe Deadvertise events
this.communicationManager
    .observeDeadvertise(this.identity)
    .pipe(map(event => event.eventData.objectIds))
    .subscribe(objectIds => {
        const offlineThings = this.onlineThings.filter(t => objectIds.some(id => id === t.parentObjectId));
        // These things are no longer online.
        // Remove them from the onlineThings cache and perform side effects...
    });
```

### Channel event pattern - an example

The Channel event pattern provides a very efficient way of pushing any type
of Coaty objects to observers that share a specific channel identifier. It
differs from Advertise events in that these are pushing specific core or object
types to interested observers.

```ts
import { filter } from "rxjs/operators";

const channelId = "42";
const myObject = <any coaty object>;

// Publish a Channel event
this.communicationManager
    .publishChannel(ChannelEvent.withObject(this.identity, channelId, myObject));


// Observe Channel events for the given channel ID
this.communicationManager
    .observeChannel(this.identity, channelId)
    .pipe(filter(event => event.eventData.object))
    .subscribe(obj => {
         // Handle object emitted by channel event
    });
```

### Discover - Resolve event pattern - an example

The two-way Discover-Resolve communication pattern can be used to discover Coaty
objects of a certain core or object type and/or with a certain object id or external id.

For example, by scanning the QR Code of a physical asset, which encodes its external id,
the Discover event can resolve the Coaty object representation of this asset.

```ts
import { filter, first, map, timeout } from "rxjs/operators";

// QR Code of asset
const externalId = "42424242";

// Publish a Discover event and observe first Resolve event response
this.communicationManager
    .publishDiscover(DiscoverEvent.withExternalId(this.identity, externalId))
    .pipe(
        first(),
        map(event => event.eventData.object),
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
this.communicationManager.observeDiscover(this.identity)
    .pipe(filter(event => event.eventData.isDiscoveringExternalId))
    .subscribe(event => {
         // Agent-specific lookup of an object with given external ID.
         // Alternatively, use `event.eventData.matchesObject()` here to find a
         // match in a collection of objects.
         const object = findObjectWithExternalId(event.eventData.externalId);
         // Respond with found object in Resolve event
         event.resolve(ResolveEvent.withObject(this.identity, object));
    });
```

Note that the Resolve event cannot only respond with a matching object, but
can alternatively or additionally provide related objects. The logic of
resolving Discover events is application specific and defined by the
resolving agent. For example, a Discover event that specifies an external id
*in combination* with the object types `Thing` and `Sensor` could be resolved
by returning the `Thing` object with the given external id and all sensor
objects associated with this thing as related objects.

To share object state between Coaty agents, the Discover-Resolve event
pattern is often used in combination with the Advertise event pattern. One
agent advertises new object state whenever it changes; other agents that
are interested in object state changes observe this kind of Advertise event.
To ensure that any interested agent immediately gets the latest object state
on connection, it should initially publish a Discover event for the object
state. The agent that advertises object state should observe these Discover
events and resolve the current object state.

The `ObjectCacheController` class applies this principle to look up and cache
objects with certain object IDs. In your own code, you can easily implement
this principle by *merging* the two observables returned by publishing a
Discover event and by observing an Advertise event as follows:

```ts
import { merge } from "rxjs";
import { filter, map } from "rxjs/operators";

const discoveredTasks = this.communicationManager
    .publishDiscover(DiscoverEvent.withObjectTypes(this.identity, ["com.helloworld.Task"]))
    .pipe(
        filter(event => event.eventData.object !== undefined),
        map(event => event.eventData.object as HelloWorldTask)
    );

const advertisedTasks = this.communicationManager
    .observeAdvertiseWithObjectType(this.identity, "com.helloworld.Task")
    .pipe(
        map(event => event.eventData.object as HelloWorldTask),
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
    .publishQuery(QueryEvent.withCoreTypes(this.identity, ["Log"], filter, joinCondition))
    .pipe(
        take(1),
        // Issue an error if queryTimeoutMillis elapses without any event received
        timeout(this.options["queryTimeoutMillis"])
    )
    .subscribe(
        event => {
            // Handle resulting log objects emitted by Retrieve event
            const logs = event.eventData.objects as Log[];
        },
        error => {
            // No response has been received within the given period of time
            this.logError(error, "Failed to query log objects");
        });

// On the retrieving side, an agent observes queries for Log objects
// and responds with a Retrieve event that contains results looked up
// from a database.
this.communicationManager
  .observeQuery(this.identity)
  .pipe(filter(event => event.eventData.isCoreTypeCompatible("Log")))
  .subscribe(event => {
    const dbJoinCond = DbContext.getDbJoinConditionsFrom(
      event.eventData.objectJoinConditions,
      {
        localProperty: "locationId",
        fromCollection: "location",
        fromProperty: "objectId"
      });
    this.databaseContext
      .findObjects<Log>("log", event.eventData.objectFilter, dbJoinCond)
      .then(iterator => iterator.forBatch(logs => {
         event.retrieve(RetrieveEvent.withObjects(this.identity, logs));
      }))
      .catch(error => {
         // In case of retrieval error, do not respond with a
         // Retrieve event. The sender of the query should
         // implement proper timeout handling.
      });
  });
```

### Update - Complete event pattern - an example

The Update-Complete pattern is used to update and synchronize object state across agents.
An agent can request or suggest an object update and receive accomplishments by Complete events.

An Update request or proposal for a Coaty object may be either *partial* or *full*.

For a *partial* update, the object id and the property name-value pairs that
change are specified as event data. The interpretation of the new value for a
property depends on the application context: For example, if the new value is not a
primitive value, but an object consisting of attribute-value pairs, the update operation
could be interpreted as a partial or a full update on this value object. Also, the
interpretation of the property name itself depends on the application context. For
example, the name could specify a chain of property/subproperty names to support
updating values of a subproperty object on any level (e.g.
`<property>.<subproperty>.<subsubproperty>`). It could also be a virtual property
that is *not* even defined in the associated object.

For a *full* update, the entire Coaty object is specified as event data.

Both partial and full Update events signal accomplishment by sending back
a Complete event with the entire (usually changed) object as event data.
This approach avoids complex merging operations of incremental change deltas in
the client. Since objects are treated as immutable entities on the client
this approach is in line.

```ts
import { filter, take, map } from "rxjs/operators";

// Publish a partial Update event on a finished task object and observe first
// Complete event response from the persistent storage agent.
this.communicationManager.publishUpdate(
        UpdateEvent.withPartial(this.identity, taskObjectId,
        {
            status: TaskStatus.Done,
            doneTimestamp: Date.now(),
        }))
    .pipe(
        // Unsubscribe automatically after first response event arrives.
        take(1),
        map(event => event.eventData.object as Task),
    )
    .subscribe(
        task => {
            // Task has been persisted...
        });

// The persistent storage agent observes task updates and stores
// the changed property values in a database. Afterwards, it responds
// with a Complete event which contains the fully updated object.
this.communicationManager.observeUpdate(this.identity)
    .pipe(filter(event => event.eventData.isPartialUpdate))
    .subscribe(event => {
        const task = this.getTaskWithIdFromDb(event.eventData.objectId);
        if (task !== undefined) {
            this.updateTaskWithIdinDb(task.objectId, event.eventData.changedValues);
            event.complete(CompleteEvent.withObject(this.identity, task));
        }
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
            this.identity,
            "com.mydomain.lights.switchLight",
            { status: "on", brightness: 0.7 },
            contextFilter))
    .subscribe(
        returnEvent => {
            if (returnEvent.eventData.isError) {
                // An error has been returned by a light control agent.
                console.log(returnEvent.eventData.error.code);           // 10001
                console.log(returnEvent.eventData.error.message);        // "Failed"
                console.log(returnEvent.eventData.executionInfo);        // { lightId: "<id of light>" }
            } else {
                // A light has been switched on/off successfully by a light control agent.
                console.log(returnEvent.eventData.result);               // true
                console.log(returnEvent.eventData.executionInfo);        // { lightId: "<id of light>" }
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

this.communicationManager.observeCall(
        this.identity,
        "com.mydomain.lights.switchLight",
        context)
    .subscribe(event => {
        // For each remote call that matches the given context, a Call event is emitted.
        const status = event.eventData.getParameterByName("status");
        const brightness = event.eventData.getParameterByName("brightness");

        const executionInfo = { lightId: this.lightId };

        switch (status) {
            case "on":
                // Try to switch light on with requested brightness, then return result or error.
                switchLightOn(this.lightId, brightness)
                    .then(() => event.returnEvent(ReturnEvent.withResult(this.identity, true, executionInfo)))
                    .catch(error => event.returnEvent(ReturnEvent.withError(this.identity, 10001, "Failed", executionInfo)));
                break;
            case "off":
                // Try to switch light off, then return result or error.
                switchLightOff(this.lightId)
                    .then(() => event.returnEvent(ReturnEvent.withResult(this.identity, true, executionInfo)))
                    .catch(error => event.returnEvent(ReturnEvent.withError(this.identity, 10002, "Failed", executionInfo)));
                break;
            default:
                // Invalid parameter, return an error immediately.
                event.returnEvent(ReturnEvent.withError(this.identity,
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
event is skipped if and only if a context filter and a context object are *both*
specified and they do not match (checked by using
`ObjectMatcher.matchesFilter`). In all other cases, the Call event is emitted.

> Tip: If your application needs to perform a more complex logic of context
> matching (e.g. if the context cannot be described by a single Coaty object),
> simply invoke `observeCall` without context parameter and realize your custom
> matching logic with an RxJS `filter` operator:
>
> ```js
> import { filter } from "rxjs/operators";
>
> this.communicationManager.observeCall(
>         this.identity,
>         "com.mydomain.lights.switchLight")
>     .pipe(filter(event => isMatchingFilter(event.eventData.filter))
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

### Observing and publishing raw MQTT messages

To enable interoperation with external MQTT clients, use `publishRaw` to publish
a raw MQTT message specifying an MQTT topic, a payload (of type `string` or `Uint8Array`
(`Buffer` in Node.js), and an optional flag indicating whether the published message
should be retained.

Likewise, use `observeRaw` to observe incoming messages on raw MQTT subscription topics.
The observable returned by calling `observeRaw` emits messages as tuples including the
actual published topic and the payload. Payload is represented as
`Uint8Array` (`Buffer` in Node.js) and needs to be parsed by the application.
Use the `toString` method on a payload to convert the raw data to an UTF8 encoded string.

Note that the observable returned by `observeRaw` is *shared* among all raw topic observers.
This basically means that the observable will emit messages for *all* observed
raw subscription topics, not only for the one specified in a single method call.
Thus, you should always pipe the observable through an RxJS `filter` operator to
filter out the messages associated with the given subscription topic:

```ts
import { filter } from "rxjs/operators";

this.communicationManager
    .observeRaw(this.identity, "$SYS/#")
    .pipe(filter(([topic,]) => topic.startsWith("$SYS/")))
    .subscribe(([topic, payload]) => {
        console.log(`Received topic ${topic} with payload ${payload.toString()}`);
    });
```

> Observing raw subscription topics does *not* suppress observation of non-raw communication
> event types by the communication manager: If at least one raw topic is observed, the
> communication manager first dispatches *any* incoming message to *all* raw message observers.
> Then, event dispatching continues as usual by handling all non-raw communication event
> types which are observed.

### Deferred publication and subscription of events

You can invoke any of the above observe or publish methods while
the Communication Manager is running, i.e. is in started operating state.
Invocation is also possible when the communication manager is offline, i.e.
not connected. The Communication Manager supports deferred publications and
subscriptions when the agent connects or reconnects. All your
*subscriptions* issued while the agent is offline will be
(re)applied when the agent (re)connects again. *Publications* issued while the
agent is offline will be applied only after the next (re)connect.
Publications issued while the agent is online will *not* be deferred, i.e.
not reapplied after a reconnect.

In your controller classes we recommend to subscribe to observe methods when the
Communication Manager is starting and unsubscribe from observe methods when the
Communication Manager is stopping. Use the aforementioned controller lifecycle
methods to implement this subscription pattern.

### Distributed lifecycle management

Whenever a Coaty container is resolved by creating its communication manager and
controller components, the identities of these components are advertised as
`Component` objects automatically. You can prevent publishing Advertise events
for identity components by setting the controller and/or communication
configuration option `shouldAdvertiseIdentity` to `false`. Additionally, a
communication manager's or controller's identity is also discoverable (by
publishing a Discover event with core type "Component" or with the object ID of
a component) if and only if the identity has also been advertised.

Each identity component is initialized with default property values. For example,
the `name` of a controller identity refers to the controller's type; the `name`
of a communication manager identity is always "CommunicationManager". You can
customize and configure specific properties of identity component objects as follows:

* For controllers, either specify identity properties in the controller's configuration
  options (`ControllerOptions.identity`), or overwrite the `initializeIdentity`
  method in your controller class definition. If you specify identity properties in
  both ways, the ones specified in the configuration options take precedence.
* For communication managers, specify identity properties in the communication
  configuration options (`CommunicationOptions.identity`).

Note that the `parentObjectId` property of a controller's identity component is set to the
`objectId` of the communication manager's identity component for reasons described next.

Advertisement of identities is especially useful in combination with abnormal termination of an
agent and the MQTT last will concept. On connection to the broker, the communication
manager of a Coaty container sends a last will message consisting of a Deadvertise
event with the object ID of its identity component and its associated device (if defined).
Whenever the agent disconnects normally or abnormally, the broker publishes its last will
message to all subscribers which observe Deadvertise events.

Note that to get the identities of components advertised *before* your Coaty
agent has started can be accomplished by publishing a Discover event with core
type "Component" initially (see example in this
[section](#discover---resolve-event-pattern---an-example)).

Using this pattern, agents can detect the online/offline state of other Coaty
agents and act accordingly. One typical use case is to set the parent object ID
(or a custom property) of advertised application root objects originating from a
specific Coaty agent to the identity ID (or associated device ID) of the agent's
communication manager. In case this agent is disconnected, other agents can
observe Deadvertise events and check whether one of the deadvertised object IDs
correlates with the parent object ID (or custom property) of any application
root object the agent is managing and invoke specific actions. An example of
this pattern can be found in this
[section](#deadvertise-event-pattern---an-example).

To ease programming this pattern, Coaty provides a convenience controller class
named [`ObjectLifecycleController`](#object-lifecycle-controller). It keeps
track of specific agents/objects in a Coaty network by monitoring identity
components of communication managers, controllers or custom object types. The
controller observes advertisements and deadvertisements of such objects and
initially discovers them. Changes are emitted on an observable that applications
can subscribe to.

## IO Routing

The Coaty framework supports dynamic contextual routing of IO data from IO sources (i.e
producers) to IO actors (i.e. consumers) for user-associated devices. IO sources
publish `IoValue` events or external events. IO actors can receive such events by
subscribing to the topics on which IO sources publish values. IO sources are
*dynamically* associated with IO actors depending on the current context of the
associated user. Backpressure strategies enable data transfer rate controlled
publishing of data. Backpressure strategies are negotiated between IO source and IO
actors.

### IO Routing communication event flow

The communication event flow of IO routing comprises the following steps:

1. `Device` objects with their IO capabilities, i.e. IO sources and IO actors,
  are advertised/deadvertised by the communication manager based on the
  user-associated device object in the container configuration
  (`CommonOptions.associatedDevice`).

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

### IO Routing implementation

IO routing functionality is provided in the `io` module.

Define IO sources and IO actors and register them as capabilities of the
associated device:

```ts
import { Configuration, CoreTypes, Device, DisplayType, IoActor, IoSource, IoSourceBackpressureStrategy, User } from "@coaty/core";

// Common User for IO routing
const user: User = {
    objectId: "b61740a6-95d7-4d1a-8be5-53f3aa1e0b79",
    coreType: "User",
    objectType: CoreTypes.OBJECT_TYPE_USER,
    name: "user@coaty.io",
    names: { formatted: "User for IO routing" },
};

// IO source definition
const ioRobotControlSource: IoSource = {
  name: "Robot Control Source",
  objectId: "76e4ee99-12f5-4b51-ad0b-a09601c24c48",
  objectType: CoreTypes.OBJECT_TYPE_IO_SOURCE,
  coreType: "IoSource",
  valueType: "RobotControlValue",
  updateStrategy: IoSourceBackpressureStrategy.Throttle,
  updateRate: 100  // maximum possible drain rate (in ms)
};

// Device definition for Robot Control Source
const watch: Device = {
    objectId: "9f407e6a-0fa4-4bb0-90dd-bd740b2cdba9",
    objectType: CoreTypes.OBJECT_TYPE_DEVICE,
    coreType: "Device",
    name: "Robot Control Watch",
    displayType: DisplayType.Watch,
    ioCapabilities: [ ioRobotControlSource ],
    assigneeUserId: user.objectId,
};

// IO actor definition
const ioRobotControlActor: IoActor = {
    name: "Robot Control Actor",
    objectId: "6c9c399d-b522-405a-9776-f40e100fda61",
    objectType: CoreTypes.OBJECT_TYPE_IO_ACTOR,
    coreType: "IoActor",
    valueType: "RobotControlValue",
    updateRate: 500   // desired rate for incoming values (in ms)
};

// Device definition for Robot Control Actor
const robot: Device = {
    objectId: "26c7e80e-92df-4181-8294-f2676c5dcf11",
    objectType: CoreTypes.OBJECT_TYPE_DEVICE,
    coreType: "Device",
    name: "Robot",
    displayType: DisplayType.None,
    ioCapabilities: [ ioRobotControlActor ],
    assigneeUserId: user.objectId,
};

// Configuration of Robot Control Source agent
const configuration: Configuration = {
    common: {
        associatedUser: user,
        associatedDevice: watch,
        ...
    },
    ...
};

// Configuration of Robot Control Actor agent
const configuration: Configuration = {
    common: {
        associatedUser: user,
        associatedDevice: robot,
        ...
    },
    ...
};

```

Use the `BasicIoRouter` controller class to realize a basic routing algorithm
where all compatible pairs of IO sources and IO actors are associated. An IO
source and an IO actor are compatible if both define the same value type.

Use the `RuleBasedIoRouter` controller class to realize rule-based routing of
data from IO sources to IO actors. By defining application-specific routing
rules you can associate IO sources with IO actors based on arbitrary user
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

// IO routing rule definition
const configuration: Configuration = {
    ...
    controllers: {
      RuleBasedIoRouter: {
        rules: [
          { name: "Route values from watches to robot devices within reach",
            valueType: ioRobotControlSource.valueType,
            condition:
              (source, sourceDevice, actor, actorDevice, router) =>
                sourceDevice.displayType === DisplayType.Watch &&
                isWithinReach(sourceDevice, actorDevice)
          } as IoAssociationRule,
          ...
        ]
      }, ...
```

The Communication Manager supports methods to control IO routing by code in
your agent project: Use `publishIoValue` to send IO value data for an IO source.
Use `observeIoState` and `observeIoValue` to receive IO state changes and IO
values for an IO actor.

To further simplify management of IO sources and IO actors, the framework
provides specific controller classes on top of these methods:

* `IoSourceController`: Provides data transfer rate controlled publishing of
  IO values for IO sources and monitoring of changes in the association state of
  IO sources. This controller respects the backpressure strategy of an IO source
  in order to cope with IO values that are more rapidly produced than specified
  in the recommended update rate.

* `IoActorController`: Provides convenience methods for observing IO values
  and for monitoring changes in the association state of specific IO actors.
  Note that this controller class caches the latest IO value received
  for the given IO actor (using BehaviorSubjects). When subscribed, the current
  value (or undefined if none exists yet) is emitted immediately.
  Due to this behavior the cached value of the observable will also be emitted
  after reassociation. If this is not desired use
  `this.communicationManager.observeIoValue` instead. This method doesn't cache
  any previously emitted value.

Take a look at these controllers in action in the Coaty [OPC UA connector
example](https://github.com/coatyio/connector.opc-ua.js/tree/master/example).

## Unified Storage API - Query anywhere - Retrieve anywhere

The Coaty framework supports unified persistent or in-memory storage and
retrieval of objects and other data in SQL and NoSQL databases. The Unified
Storage API is database-agnostic. It unifies common CRUD constructs of relational
databases and NoSQL document databases in a simple but powerful API based on promises
for asynchronous operations.

The Unified Storage API is especially suited to interact with
Query - Retrieve communication event patterns. It enables declarative, seamless
and transparent retrieval of objects across Coaty components independent
of database implementations. The query event's object filter
which specifies selection and ordering criteria can be directly passed to the
database agnostic API for schemaless object retrieval.

The Unified Storage API uses the notion of *database adapters* to connect to specific
databases. The framework provides ready-to-use built-in adapters. You can also
write your own adapter to connect to a specific database not yet supported by
the framework.

Database adapters can support SQL operations, NoSQL operations, or both.
Depending on the specific database adapter, the API can be used in
Coaty containers running in Node.js services, in Cordova apps, or in
the browser. For example, the built-in SQLite Cordova adapter can run
in Cordova apps; the built-in SQLite Node adapter can run in Node.js.
The built-in Postgres adapter can also run in a Node.js environnment.

For services, we recommend to use the standard built-in Postgres adapter
in combination with a PostgreSQL 9.5 (or later) database server. PostgreSQL is
an open-source object-relational DBMS running on a variety of operating system
platforms. It supports almost all SQL operations as well as highly efficient NoSQL
document operations using the JSONB data type for binary storage and retrieval of
JSON objects. The Postgres adapter stores objects as JSONB column data
properly indexed to speed-up containment operations on key-value pairs.

For efficient non-persistent, in-memory storage of objects we recommend to use
the built-in In-Memory adapter. This adapter supports NoSQL operations only. It
can be used in any Coaty container, running in Node.js, Cordova apps, or
browsers.

For mobile apps, device apps and services that should locally persist small amounts of
data, such as user settings or preferences, we recommend to use one of the
built-in SQLite adapters (see subsection 'Local Store operations' below).

### Persistent storage and retrieval of Coaty objects

In the following, we will explain the Unified Storage API in detail using the example
of a PostgreSQL database. For details on setting up a PostgreSQL database and
configuring the Postgres adapter, see the subsection 'Postgres adapter' below.

To connect to your Postgres database, connection information is supplied with
the Coaty container configuration object in the `databases` property.
In general, you specify the name of the adapter to use, a connection string, and
other database-specific connection options (optional).

```ts
import { Configuration } from "@coaty/core";

const configuration: Configuration = {
    common: {
        // Common options shared by all components
    },
    communication: {
         // Options used for communication
    },
    controllers: {
        // Controller configuration options
    },
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

For all database adapters used by your agent (typically specified
in the databases configuration options), you must register the adapter's
constructor function before use. The name of the adapter must correspond
to the value of the `adapter` property specified in the connection info
of the database configuration.

```ts
import { DbAdapterFactory } from "@coaty/core/db";
import { PostgresAdapter } from "@coaty/core/db/adapter-postgres";

DbAdapterFactory.registerAdapter("PostgresAdapter", PostgresAdapter);

const container = Container.resolve(...);
```

The Coaty framework exposes *database context* objects to perform SQL and/or NoSQL
operations on the database. It features a promise-based interface for
asynchronous data flow control. A database context is a light-weight object
that can be used to perform a single operation or multiple operations
in sequence. A database context object can be short-lived but you
can also use it for the lifetime of your container by storing it as an
instance member in a controller.

We recommend to register database adapters **before** resolving the Container
so that controllers within the container can instantiate database contexts
in their `onInit` method.

A database context object is created with the connection information specified
in the configuration. Optionally, you can specify the adapter constructor
function for the connection info's adapter as a second argument. In this case,
you don't need to register the adapter explicitely as explained above:

```ts
import { DbContext } from "@coaty/core/db";
import { PostgresAdapter } from "@coaty/core/db/adapter-postgres";

const dbContext1 = new DbContext(this.runtime.databaseOptions["mydb1"]);

const dbContext2 = new DbContext(this.runtime.databaseOptions["mydb1"], PostgresAdapter);
```

The SQL and NoSQL operations that you can invoke on the database contexts are defined
by the interfaces `IDbSqlOperations` and `IDbNoSqlOperations`, respectively.

If you invoke an operation on a database context that is not supported by
the associated database adapter, the returned promise is rejected with an
"operation not supported" error.

For example, to create and populate a collection of User objects, invoke the
following NoSQL operations:

```ts
dbContext.addCollection("appusers")
    .then(() => dbContext.insertObjects("appusers", <newObjects>))
    .then(() => dbContext.updateObjects("appusers", <updateObjects>))
    .catch(error => console.log(error));
```

To invoke multiple asynchronous operations in sequence, it is best practice to
use composing promises and promise chaining as shown in the above example.
Avoid the common bad practice pattern of nesting promises as if they were callbacks.

Note that you can reuse a database context object even if an operation
performed on it fails or yields an error. You can also catch rejected promises
after every single operation. After a catch clause, the promise chain is restored:

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

For applying promise operations to a series of items, the framework provides
a utility method `Async.inSeries` to chain promises in series
(see section Utilities below). This method can be used to iterate over individual
objects retrieved by a database operation such as `findObjects` and apply some
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
that resolves when all of the promises in the array have resolved, or immediately
rejects with the reason of the first passed promise that rejects, discarding all
the other promises whether or not they have resolved. To avoid fail-fast behavior
in the above example, all the operation catch handlers return a *fulfilled* promise
to signal that `Promise.all` should also await completion of failed operations.

**A final note of caution**: Iterating over individual objects retrieved by a database
operation such as `findObjects` and applying some asynchronous database operation on
each one **in parallel** normally does **not** perform better than applying these
operations **in series**. This is because database queries are usually queued by the
database driver and executed one after the other. Moreover, chaining a lerge number
of promises does not scale well because allocation in memory has a negative impact on
memory footprint. To avoid these pitfalls you should in general prefer sequential promise
chaining by `Async.inSeries`.

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
and at the unit tests found under `ts/test/spec/db-nosql.spec.ts` and
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
            ["requirements", filterOp.contains(["welder"])],
            ["requirements", filterOp.notContains(["qualitycheck", "endassembly"])],
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
        fromCollection: "component",
        fromProperty: "objectId",
        localProperty: "componentIds",
        asProperty: "resolvedComponents",
        isLocalPropertyArray: true,
    },
];

dbContext.findObjects<ComponentTask>("task", filter, joinConditions)
    .then(iterator => iterator.forEach(compTask => console.log(compTask)))
    .catch(error => console.error(error));
```

The `findObjects` operation looks up objects in a collection which match the
given object filter. If the filter is empty or not specified all objects in the
collection are retrieved. For details on how to specify object filters, take a
look at the API documentation of class `ObjectFilter`.

Optional join conditions can be specified to augment result objects by
resolving object references to related objects and by storing them as extra
properties (for details, see online documentation of `DbJoinCondition`).
Typically, augmented result objects are transfered to other agent
components as part of the Query - Retrieve communication event pattern, saving
time for roundtrip events to look up related objects.

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

Note that fetching query results in chunks is significantly slower than
fetching the whole query at once when the query contains not significantly
more or even less items than the size of a chunk as specified by `fetchSize`.

Fetching results in chunks is especially beneficial in combination with the
skip and take options. This is the preferred way of paging through a
large result set by retrieving only a specific subset.

The `findObjects` method is especially suited to handle Query - Retrieve
communication event patterns. The object filter defined by a
Query event can be directly passed to `findObjects`. The object join conditions
defined by a Query event can be passed to `findObjects` using the
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

Use the predefined query builder function `SQL` to formulate
your parameterized SQL query. `SQL` is a tag function for defining universal
SQL queries by template literals. The tag function translates universal
parametrized queries into queries for the specific SQL dialect to be addressed.
It also ensures that SQL identifiers and literals are properly quoted, i.e.
escaped to prevent SQL syntax errors and SQL injection. For example:

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

Detailed descriptions of the supported operations are documented in the code of class
`DbContext`. Code examples can be found in the framework's unit tests
in the file `ts/test/spec/db-sql.spec.ts`.

### Local storage operations

The Unified Storage API also supports *local* database contexts that persist data in a
local database file without using a database server. Such a database context is
usually adequate for storing small amounts of data in the local file system
of a device or service. SQLite is a typical example of such a database. Typically,
a local database context is used to persist agent-specific settings.
For example, a local database context can be used in a Node.js environment as
well as in a Cordova app (utilizing specific built-in SQLite database adapters).

Besides SQL operations and transactions, a local database context supports
local storage of pairs of keys and values. Keys are strings and values are any
JSON objects. Values can be retrieved when a key is known or by mapping through
all key-value pairs.

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
class `DbLocalContext`. Code examples can be found in the framework's unit
tests in the file `ts/test/spec/db-local.spec.ts`.

### Transactions

To bundle multiple query operations inside a transaction block, use the
`transaction` method on the database context. The action callback **must** return a
promise that is fulfilled if **all** operations have executed without errors, and
that is rejected if **any** of the operations fail. All operations within a
transaction **must** operate on the transaction database context that is passed to
the action callback.

```ts
transaction(action: (transactionContext: DbContext | DbLocalContext) => Promise<any>): Promise<any>;
```

While you can invoke independent transactions on the same or different database
contexts in parallel, or invoke transactions on the same database context in series,
transactions cannot be *nested*. In this case, the promise returned by trying to invoke
the subtransaction is rejected with a corresponding error.

### Database adapter extensions

In addition to the unified SQL and NoSQL operations described above, a database
adapter can also define *extension* methods. Extensions are adapter-specific, i.e.
specific to databases and database drivers. Extensions are registered with the `registerExtension`
adapter method. A database extension context for a specific adapter can now call the
defined extension using the `callExtension` method. As with the other
operations, extension methods return promises yielding the requested data.

### Use of database adapters

The built-in database adapters provided by the Coaty framework use specific
low-level database driver modules to connect to databases.

The drivers used by built-in adapters are defined as (optional) peer dependencies
in the package.json of the `coaty` npm module. To use a specific adapter in your
agent project, you must install the associated driver module(s) as dependencies
in the package.json. Refer to the framework's package.json
to figure out which version of the driver modules should be installed. You
only need to install driver modules for adapters that you really use in your
application project.

### Postgres adapter

To make use of the built-in Postgres database adapter, install PostgreSQL
version 9.5 or higher. Download and installation details can be found
[here](https://www.postgresql.org/). Then, set up and start the database
server as explained in the [Postgres documentation](https://www.postgresql.org/docs/).

You also need to add the npm module `pg` as a dependency to your project's package.json
and install it. The module version should correspond with the version of the `pg` module
specified in the `coaty` framework package definition as a peer dependency.

Next, create the target database(s) and user roles. This can be accomplished using

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
    common: {
        // Common options shared by all components
    },
    communication: {
         // Options used for communication
    },
    controllers: {
        // Controller configuration options
    },
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

When setting up PostgreSQL do not forget to set a proper password for the PostgreSQL
admin user if you want to make use of these extension methods. Usually,
when installing PostgreSQL on Windows or when using a PostgreSQL docker container the
admin user and admin password are both preset to `postgres`. On Linux, you might
have to set the password explicitely by running `sudo -u postgres psql postgres` and
then defining a password through the command `postgres=# \password postgres`.

The following example shows how to initialize a database (i.e. create a database and
database user, and add collections) at program startup with the PostgreSQL adapter:

```ts
import { Configuration } from "@coaty/core";

const configuration: Configuration = {
    common: {
        // Common options shared by all components
    },
    communication: {
        // Options used for communication
    },
    controllers: {
        // Controller configuration options
    },
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

import { DbContext } from "@coaty/core/db";
import { PostgresAdapter } from "@coaty/core/db/adapter-postgres";

const adminContext = new DbContext(this.runtime.databaseOptions["adminDb"], PostgresAdapter);

// Set up a Postgres database by creating a database user and a database with
// two collections named "mycollection1" and "mycollection2".
adminContext.callExtension("initDatabase", this.runtime.databaseOptions["db"], ["mycollection1", "mycollection2"])
    .catch(error => console.log(error));
```

Note that you have to be an admin user ("postgres" in the example, using "postgres"
as password) with access to the postgres admin database ("postgres") to successfully
execute these operations.

### In-memory adapter

For efficient non-persistent, in-memory storage of objects we recommend to use
the built-in `InMemoryAdapter`. This adapter supports the complete set of NoSQL
operations. Transactions are not supported. Fetching in chunks is not supported,
i.e. `DbObjectFilter.shouldFetchInChunks` and `DbObjectFilter.fetchSize` are ignored.

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

The database specified by either the connection string or options is implicitely and
automatically created in-memory the first time you are creating a `DbContext` on it.

The following example shows how to create and use a database with the `InMemoryAdapter`:

```ts
import { Configuration } from "@coaty/core";
import { DbContext } from "@coaty/core/db";
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

const dbContext = new DbContext(this.runtime.databaseOptions["inMemoryDb"], InMemoryAdapter);

dbContext.addCollection("appusers")
    .then(() => dbContext.insertObjects("appusers", <newObjects>))
    .then(() => dbContext.updateObjects("appusers", <updateObjects>))
    .catch(error => console.log(error));
```

Detailed descriptions of the supported NoSQL operations are documented in the code
of class `DbContext`. Further code examples can be found in the framework's unit tests
in the file `ts/test/spec/db-in-memory.spec.ts`.

### SQLite NodeJs adapter

The Coaty framework provides a built-in database adapter for persistent SQL-based
local storage and retrieval in Node.js processes. The `SqLiteNodeAdapter`
makes use of SQLite 3 utilizing the `sqlite3` npm module as database driver.

The SQLite node adapter supports SQL operations, transactions, and local
store operations exposed by a local database context (of class `DbLocalContext`).
For the `query` operation the `fetchSize` option is ignored.

The adapter also provides an extension method `deleteDatabase` for deleting an
SQLite database file.

The SQLite database file path is specified as connection string in the
connection info object. If you specify an absolute or relative file path
ensure that the path exists and is accessible by the process, otherwise
the database file cannot be created or opened. The database file name should
include the extension, if desired, e.g. `"db/myservice.db"`. No further connection
options are supported.

You also need to add the npm module `sqlite3` as a dependency to your project's package.json
and install it. The module version should correspond with the version of the `sqlite3` module
specified in the `coaty` framework package definition as a peer dependency.

To connect to a local SQLite database, specify `SqLiteNodeAdapter` in your
connection information and register the adapter before use:

```ts
import { Configuration } from "@coaty/core";
import { DbAdapterFactory, DbLocalContext } from "@coaty/core/db";
import { SqLiteNodeAdapter } from "@coaty/core/db/adapter-sqlite-node";

// Specify adapter in configuration
const configuration: Configuration = {
    common: {},
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

// Register adapter explicitely or
DbAdapterFactory.registerAdapter("SqLiteNodeAdapter", SqLiteNodeAdapter);

// Register adapter in local database context
const dbContext = new DbLocalContext(connectionInfo, SqLiteNodeAdapter);
```

### SQLite Cordova adapter

The Coaty framework provides a built-in database adapter for persistent SQL-based
local storage and retrieval in mobile browser apps running on iOS, Android and Windows.
The SQLite Cordova adapter makes use of the cordova-sqlite-storage plugin.
The adapter provides a powerful alternative to limited HTML5 local storage in
your mobile app.

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

Like with other Cordova plugins you must wait for the `deviceready` event
in your app before instantiating a local database context with this adapter.
Note that controllers and other service classes injected into Ionic/Angular
UI components are created before the `deviceready` event is fired. Thus, you
should never execute operations on a local database context on this adapter
in the constructor of such a class.

To use the SQLite Cordova adapter, yo need to add the npm module `cordova-sqlite-storage`
as a dependency to your project's package.json and install it. The module version should
correspond with the version of the `cordova-sqlite-storage` module specified
in the `coaty` framework package definition as a peer dependency.

To connect to a local SQLite database, specify `SqLiteCordovaAdapter` in your
connection information and register the adapter before use:

```ts
import { Configuration } from "@coaty/core";
import { DbAdapterFactory, DbLocalContext } from "@coaty/core/db";
import { SqLiteCordovaAdapter } from "@coaty/core/db/adapter-sqlite-cordova";

// Specify adapter in configuration
const configuration: Configuration = {
    common: {},
    communication: {
        ...
    },
    controllers: {
        ...
    },
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

// Register adapter explicitely or
DbAdapterFactory.registerAdapter("SqLiteCordovaAdapter", SqLiteCordovaAdapter);

// Register adapter in local database context
const dbContext = new DbLocalContext(connectionInfo, SqLiteCordovaAdapter);
```

### Implement a custom database adapter

You can implement your own custom database adapter by defining a class that
derives from `DbAdapterBase` and implements the `IDbAdapter` and
`IDbAdapterExtension` interfaces. `DbAdapterBase` provides default
implementations for all interface methods that return a rejected promise
which yields an "Operation not supported" error.

You can specify the custom adapter in the database configuration options.
Note that the custom adapter class must be registered before use.

```ts
import { Configuration } from "@coaty/core";

const configuration: Configuration = {
    common: {
        // Common options shared by all components
    },
    communication: {
        // Options used for communication
    },
    controllers: {
        // Controller configuration options
    },
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

import { DbAdapterFactory } from "@coaty/core/db";
import { MyCustomDatabaseAdapter } from "myapp/my-custom-adapter";

DbAdapterFactory.registerAdapter("MyCustomDatabaseAdapter", MyCustomDatabaseAdapter);

```

## Decentralized logging

The Coaty framework provides the object type `Log` for decentralized
logging of any kind of informational events in your Coaty agents, such as
errors, warnings, and system messages. Log objects are usually published
to interested parties using an Advertise event. These log objects can then
be collected and ingested into external processing pipelines such as the
[ELK Stack](https://www.elastic.co/elk-stack).

Any container component can publish a log object by creating and advertising a
`Log` object. You can specify the level of logging (debug, info, warning, error,
fatal), the message to log, its creation timestamp, and other optional information
about the host environment in which this log object is created. You can also
extend the `Log` object with custom property-value pairs.

You can also specify log tags as an array of string values in the
`Log.logTags` property. Tags are used to categorize or filter log output.
Agents may introduce specific tags, such as "service" or "app".
Note that log objects published by the framework itself always use the reserved
tag named "coaty" as part of the `logTags` property. This tag name
should never be used by your custom agents.

For convenience, the base `Controller` class provides methods for
publishing/advertising log objects:

* `logDebug`
* `logInfo`
* `logWarning`
* `logError`, `logErrorWithStacktrace`
* `logFatal`

The base `Controller` class also defines a protected method
`extendLogObject(log: Log)` which is invoked by the controller whenever
one of the above log methods is called. The controller first creates a
`Log` object with appropriate property values and passes it to this method
before advertising it. You can overwrite this method to additionally set
certain properties (such as `LogHost.hostname`) or to add custom
property-value pairs to the `Log` object. For example, a Node.js agent
could add the hostname to the `Log` object:

```ts
import { Log } from "@coaty/core";

protected extendLogObject(log: Log) {
    log.logHost.hostname = require("os").hostname();
}
```

To collect log objects advertised by your agent components, implement
a logging controller that observes Advertise events on the core type `Log`.
Take a look at the Hello World example of the Coaty framework to see
how this is implemented in detail.

Future versions of the framework could include predefined logging controllers
that collect `Log` entries, store them persistently; output them to
file or console, and provide a query interface for analyzing and visualizing
log entries by external tools.

## Utilities

The framework provides some useful utility functions in the `util` module
that are missing in the JavaScript ES5/ES6 standard.

### Asynchronous promise operations

The `Async.inSeries` method applies an asynchronous operation against each
value of an array of items in series (from left-to-right). You can break out
of the iteration prematurely by resolving a `false` value from an operation:

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
        }),
    })
    .then(() => console.log("some async operations completed"))
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

Determines whether two JavaScript values, typically objects or arrays, are deep equal according
to a recursive equality algorithm.

Note that the strict equality operator `===` is used to compare leave values. For checking the
containment of properties in objects the `hasOwnProperty` operator is used, i.e. only properties
defined on the object directly (not inherited) are considered.

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

Checks if a JavaScript value (usually an object or array) contains
other values. Primitive value types (number, string, boolean, null, undefined) contain
only the identical value. Object properties match if all the key-value
pairs of the specified object are contained in them. Array properties
match if all the specified array elements are contained in them.

The general principle is that the contained object must match the containing object
as to structure and data contents recursively on all levels, possibly after discarding
some non-matching array elements or object key/value pairs from the containing object.
But remember that the order of array elements is not significant when doing a containment match,
and duplicate array elements are effectively considered only once.

As a special exception to the general principle that the structures must match, an
array on *toplevel* may contain a primitive value:

```ts
contains([1, 2, 3], [3]) => true
contains([1, 2, 3], 3) => true
```

Note that the strict equality operator `===` is used to compare primitive values. For checking the
containment of properties in objects the `hasOwnProperty` operator is used, i.e. only properties
defined on the object directly (not inherited) are considered.

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

Checks if a value is included on toplevel in the given
operand array of values which may be primitive types (number, string, boolean, null)
or object types compared using the deep equality operator.

For example:

```ts
import { includes } from "@coaty/core";

includes([1, 46, 47, "foo"], 47) => true
includes([1, 46, "47", "foo"], 47) => false
includes([1, 46, { "foo": 47 }, "foo"], { "foo": 47 }) => true
includes([1, 46, { "foo": 47, "bar": 42 }, "foo"], { "foo": 47 }) => false
```

## NodeJS utilities

The framework includes a `NodeUtils` class in the `runtime-node` module which provides
some static utility methods to be used by Coaty agent services.

Use the `handleProcessTermination` method to perform synchronous and asynchronous cleanup
of allocated resources (e.g. file descriptors, handles, DB connections, etc.) before shutting
down the Node.js process.

Use the `logCommunicationState` method to log changes in online/offline communication state
(i.e. agent connection to Coaty broker) to the console.

Use the `logInfo`, `logError`, and `logEvent` methods to log a given informational message,
error, or event to the console, also providing a logging timestamp.

Usage examples can be found in the [Coaty JS code
examples](https://github.com/coatyio/coaty-examples).

## Multicast DNS discovery

The framework includes a `MulticastDnsDiscovery` class to support multicast DNS discovery
(a.k.a Bonjour, Zeroconf, mDNS) to be used within Node.js based agents. These functions can
be used, for example, to auto-discover the IP address of the Coaty broker/router
or the URL of a container configuration hosted on a web server.

Use the `publishMulticastDnsService`, `publishMqttBrokerService`, and `publishWampRouterService`
methods in a Coaty service to publish corresponding mDNS services (see examples below).

Use the `unpublishMulticastDnsServices` function to stop publishing of mDNS services when the
Coaty service exits.

Use the `findMulticastDnsService`, `findMqttBrokerService`, and `findWampRouterService` functions
in a Coaty agent component to discover a published mDNS service (see examples below).

> Note that multicast DNS discovery can only resolve host names within an IP subnet.
> If you need discovery of broker connection information across subnets, host the
> container configuration with this information as a JSON file on a centrally accessible
> web server and retrieve it using HTTP/REST as described in this
> [section](#bootstrap-a-coaty-container-in-nodejs).

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

Publish Coaty broker/router discovery information (with default connection parameters) as follows:

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

Auto discover the broker/router URL in a Coaty network and use this information to dynamically
configure the communication manager at run time. For this to work correctly, ensure that the
communication manager is *not* started automatically.

```ts
import { Container } from "@coaty/core";

const container = Container.resolve(...);

// On startup discover MQTT broker URL and start communication manager.

import { MulticastDnsDiscovery, NodeUtils } from "@coaty/core/runtime-node";

MulticastDnsDiscovery.findMqttBrokerService()
    .then(srv => {
        container.communicationManager.options.brokerUrl = `mqtt://${srv.host}:${srv.port}`;
        container.communicationManager.start();
    })
    .catch(error => {
        NodeUtils.logError(error, "Couldn't discover Coaty broker:");
        process.exit(1);
    });

// On startup discover WAMP router URL and realm and start communication manager.

import { MulticastDnsDiscovery, NodeUtils } from "@coaty/core/runtime-node";

MulticastDnsDiscovery.findWampRouterService()
    .then(srv => {
        container.communicationManager.options.routerUrl = `ws://${srv.host}:${srv.port}${srv.txt.path}`;
        container.communicationManager.options.realm = srv.txt.realm;
        container.communicationManager.start();
    })
    .catch(error => {
        NodeUtils.logError(error, "Couldn't discover Coaty router:");
        process.exit(1);
    });
```

> Note that the find functions described above can only be used in Node.js
> programs. If you want to discover a bonjour service within a cordova app, use
> the plugin `cordova-plugin-zeroconf`. In an Ionic app, you can use
> `@ionic-native/zeroconf` plugin which is a wrapper around the cordova plugin.
> In a pure browser environment, it is not possible to discover mDns services
> with JavaScript.

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
related Coaty script call by substituting a `%i` parameter, where `i` is the one-based
positional index of the desired npm run command parameter.

### Coaty broker for development

For Coaty development and testing purposes, the framework includes the
[Aedes](https://www.npmjs.com/package/aedes) MQTT broker. In your own
application projects, you can also use this broker for development and testing.

> Note: You should **not** use this broker in a production system. Instead, use
> a high-performance MQTT broker of your choice (such as VerneMQ, HiveMQ,
> Mosquitto, EMQ X, or Crossbar.io WAMP router).

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

The framework provides an object interface in the `runtime` module named `AgentInfo`.
This interface represents package, build and config information of any Coaty agent project,
whether it runs as a client app or as a backend service. Project information is generated
when the project is build and can be used at runtime, e.g. for logging,
informational display, or configuration (e.g. discriminating based on production vs.
development build mode).

The framework provides several methods to generate `AgentInfo` at build time of the
project:

* an `info` script to be run as part of the build process based on npm scripts
* a gulp task to be run as part of a gulp-based build process
* a pure function to be called in custom build processes based on Node.js.

Each of these methods generates a TypeScript file named `agent.info.ts` which exports
an `AgentInfo` object on a variable named `agentInfo`. You can import this object
into your project and use it as needed:

```ts
import { agentInfo } from "path_to/agent.info";

console.log(agentInfo.buildInfo.buildDate));
console.log(agentInfo.buildInfo.buildMode));
console.log(agentInfo.packageInfo.name));
console.log(agentInfo.packageInfo.version));
console.log(agentInfo.configInfo.serviceHost));
...
```

Package information exposed by the `AgentInfo.packageInfo` object is extracted from the
project's package.json file.

The build mode exposed by the `AgentInfo.buildInfo` object indicates whether the
agent is built for a production, development, staging, or any other custom build
environment. Its value is determined by the value of the environment variable
`COATY_ENV` at build time. Typical values include `production` or `development`,
but could be any other string as well. You should set this environment variable
to a proper value before starting the build process. If this variable is not
set, a `development` build mode is assumed unless a default build mode has been
specified in the info script or function.

The `serviceHost` property exposed by the `AgentInfo.configInfo` object represents the host
name used for MQTT broker connections and REST based services.
The value is acquired from the environment variable `COATY_SERVICE_HOST`.
If not set, the value defaults to an empty string.

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

Note that the `agentinfo` gulp task must be run **before** transpiling the TypeScript
source code.

#### Generate project info by a function

To integrate generation of project info into your custom Node.js based build process, you
can use the function `generateAgentInfoFile` which is exported by the `runtime` module:

```js
const infoScript = require("coaty/scripts/info");

const agentInfoFolder = "./src/";
const agentInfoFilename = "agent.info.ts";   // optional parameter
const packageFile = "package.json";          // optional parameter
const defaultBuildMode = "development";      // optional parameter
infoScript.generateAgentInfoFile(agentInfoFolder, agentInfoFilename, packageFile, defaultBuildMode);
```

### Release a project

The provided release scripts separate local steps that only affect the local git repo
from remote steps that affect the npm registry:

* `version-release` - bump new release version based on recommended conventional commits
* `cut-release` - cut the release using conventional changelog management
* `push-release` - push release commits and release tag to the remote git repo
* `publish-release` - publish the release to npm registry server

To use the release scripts in your project, add the npm modules `conventional-changelog`
and `conventional-recommended-bump` as dependencies to your project's package.json and
install them. The module versions should correspond with the versions specified in the
`coaty` framework package definition as peer dependencies.

#### Version a release

To prepare a new release locally, first run the `version-release` script. It
computes a new package version and bumps it.

```sh
coaty-scripts version-release (recommended | first | major | minor | patch | <semantic version>)
```

If supplied with `recommended`, a recommended version bump is computed based
on conventional commits. An error is reported, if the recommended version cannot
be computed because there are no commits for this release at all.

If supplied with `first`, the package version is bumped to the current version
specified in package.json.

If supplied with `major`, `minor`, or `patch`, the package version is
incremented to the next major, minor, or patch version, respectively.

If supplied with a valid semantic version (e.g. `1.2.3` or `1.2.3-beta.5`)
this version is bumped. You can also use this option to create a prerelease.

In any of the above cases except `first`, an error is reported if the new version
to be bumped is equal to the current package version.

> The auto-generated release information in the CHANGELOG only includes
> `feat`, `fix`, and `perf` conventional commits. Non-conventional commits are *not*
> included. Other conventional commit types such as `docs`, `chore`, `style`, `refactor`
> are *not* included. However, if there is any `BREAKING CHANGE`, this commit
> will *always* appear in the changelog.

#### Cut a release

The `cut-release` script

1. updates the CHANGELOG with release information from the conventional commits,
2. commits all pending changes,
3. creates an annotated git tag with the new release version.

```sh
coaty-scripts cut-release ["<release note>"]
```

If supplied with an optional release note, the given text is
prepended to the release information generated by conventional commits.
The text should consist of whole sentences.

*Before* executing the script, you should build the project's distribution
package, and other assets, such as auto-generated API documentation.

#### Push a release

Use the `push-release` script to push the cut release commits and the
release tag to the remote git repo server.

```sh
coaty-scripts push-release
```

Note that the `push-release` script may error because the git private key authentication
has not been set up properly. In this case, you can perform this step manually
using your preferred GIT client. Do **NOT** forget to push the release tag, too.
You can push both the release commits and the annotated tag by executing
`git push --follow-tags`.

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
authentication token (on npm website or by invoking `npm adduser`) and
paste the created authentication information into your `~/.npmrc`.

---
Copyright (c) 2018 Siemens AG. This work is licensed under a
[Creative Commons Attribution-ShareAlike 4.0 International License](http://creativecommons.org/licenses/by-sa/4.0/).
