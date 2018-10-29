# Coaty - Hello World Example

[![Powered by Coaty](https://img.shields.io/badge/Powered%20by-Coaty-FF8C00.svg)](https://coaty.io)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Check this example to see a complete application scenario of the
Coaty JavaScript framework in action.

## Table of Contents

* [Introduction](#introduction)
* [Installation](#installation)
* [Start-up](#start-up)
* [Project Structure](#project-structure)
* [Communication Event Flow](#communication-event-flow)
  * [Task Flow between Service and Clients](#task-flow-between-service-and-clients)
  * [Component Lifecycle Event Flow](#component-lifecycle-event-flow)
  * [Logging Event Flow](#logging-event-flow)

## Introduction

Our Hello World example demonstrates the best practice use of communication
events to discover, distribute, share, and persist information in a decentralized
application. The example application realizes a simplified
task scheduling and assignment scenario based on three system components:

* a Hello World service,
* any number of Hello World clients, and
* a Hello World monitor.

The application scenario looks like the following:

* The Hello World service periodically generates new task requests and
  advertises them to connected Hello World clients.
* Each client can decide to make an offer to carry out such a task (if
  not currently busy).
* The service assigns tasks to offering clients on a first-come
  first-serve basis.
* After completing a task a client can compete for further incoming
  task requests.
* Task assignments and status changes of a task (request -> pending ->
  in progress -> done) are advertised to other system components.
* The Hello World monitor presents informational log events that are
  advertised by system components on initialization and in case of errors.

In addition to the basic scenario described above, the historian functionality is integrated:

* The service is generating a `Snapshot` object whenever a new task request is generated or a property of an
  existing task is changed. This is performed by calling the public method `generateSnapshot` of the generic
  `HistorianController` in the Coaty framework. Note that the `TaskSnapshotController` used in the service
  is just an extension to `HistorianController` providing additional logging functionality.
* By setting the database key, the database collection and setting the `TaskSnapshotController` options
  `shouldPersistLocalSnapshots` to `true` in the `app.config` of the service, the generic `HistorianController`
  of the framework is able to retrieve the database context of the application and to persist all snapshot
  objects in the corresponding database.
* The client is performing a distributed query for snapshot objects whenever it completes a task. The
  retrieved snapshot objects from the service are given as log output. For this, the service makes use of
  the generic observe query functionality of the `HistorianController` enabled by the controller option
  `shouldReplyToQueries`. The results are printed to the console.

For simplicity and to focus on the essentials, the Hello World example is
completely non-interactive and provides no graphical user interface. Both
service, monitor, and client components are running autonomously without
user input and describe their behavior by textual output to a console window.

The Hello World example exposes the following framework features:

* Definition of domain object models
* Use of communication event patterns, such as `Advertise`, `Update-Complete`,
  and `Query-Retrieve`
* Component lifecycle management
* Persistent storage and retrieval of domain objects using the Unified
  Storage API
* Use of the generic Historian concept and Snapshot object implementation
* Decentralized logging of application-specific informational events
* Shared configuration options for service and client components

## Installation

This example comes bundled with the Coaty framework but it can be
build and run independently. The example has its own npm package definition
and a simple build environment based on npm scripts.

First, make sure that the `Node.js` JavaScript runtime (version 6 or higher) is globally
installed on your target machine. Download and installation details can be found
[here](http://nodejs.org/).

Next, install the open source PostgreSQL database on your machine. You should
install version 9.5 or higher. Download and installation details can be found
[here](https://www.postgresql.org/). When installing PostgreSQL do not forget
to set a proper password for the PostgreSQL admin user. This example expects
the admin user is named `postgres` and its password is set to `postgres` (see
static method `Db.getAdminConnectionString` in `src/shared/db.ts`). Usually,
these values correspond to the defaults when installing PostgreSQL on Windows
and when using a PostgreSQL docker container. On Linux, you might have to set the password
explicitely by running `sudo -u postgres psql postgres` and then defining a password
through the command `postgres=# \password postgres`.

Next, checkout the Hello World example sources from
[https://github.com/coatyio/coaty-js/tree/master/examples/hello-world](https://github.com/coatyio/coaty-js/tree/master/examples/hello-world).

Next, install and build the example by running these commands on
the checked out project's root folder:

* `npm install` to install the project dependencies.
* `npm run build` to build the example project.

## Start-up

Before starting the Hello World application on your local machine, you have
to launch an MQTT broker that is listening on port 1883 (MQTT)
on the local host. For convenience, the Hello World example uses the built-in
broker provided with the Coaty framework by a Coaty script.
To easily trace communication events distributed by the
Hello World application, this broker logs any MQTT messages to the console.
Note that you should **not** use this broker as is for production purposes.

To start the built-in MQTT broker, type  `npm run broker` in a separate
console window.

To start the Hello World service, type `npm run service` in a separate
console window.

To start the Hello World monitor, type `npm run monitor` in a separate
console window.

To start a Hello World client, type `npm run client` in a separate
console window.

You can launch as many clients in separate console windows as you like.
We recommend to first launch just one client, watch its
behavior and then start additional ones to see how they compete for incoming
task requests.

## Project Structure

The file structure for the Hello World project looks like the following:

```
|-- dist/                           - executable code generated on build
|-- node_modules                    - project dependencies
|-- src/                            - source code
    |-- client/
        |-- agent.config.ts         - Coaty container configuration for client agent
        |-- agent.info.ts           - client agent info auto-generated by build script
        |-- agent.ts                - client agent startup
        |-- task-controller.ts      - process task requests and assigned tasks
    |-- monitor/
        |-- agent.config.ts         - Coaty container configuration for monitor agent
        |-- agent.info.ts           - monitor agent info auto-generated by build script
        |-- agent.ts                - monitor agent startup
        |-- monitor-controller.ts   - listen for and output log objects
    |-- service/
        |-- agent.config.ts         - Coaty container configuration for service agent
        |-- agent.info.ts           - service agent info auto-generated by build script
        |-- agent.ts                - service agent startup
        |-- component-controller.ts - observe lifecyle of Hello World components
        |-- log-controller.ts       - collect and persist log objects
        |-- task-controller.ts      - issue task requests and assign tasks
        |-- task-snapshot-controller.ts - a HistorianController that handles task snapshots
    |-- shared/
        |-- config.ts               - common agent configuration options
        |-- db.ts                   - constants/functions for database initialization
        |-- log-tags.ts             - custom log tags for db, client, monitor, and service operations
        |-- models.ts               - definitions of domain object models
|-- gulpfile.js                     - project gulpfile with tasks for building and linting
|-- package.json                    - project package definition
|-- tsconfig.json                   - TypeScript compiler options
|-- tslint.json                     - TypeScript linter options
```

The source code of the project is divided into component-specific definitions for client,
service, and monitor as well as common definitions shared by client, service and/or monitor
components.

For simplicity, all components share the same package definition
`package.json` in the root folder. In a real-world application,
client and service/monitor projects have their own package definitions and build scripts
because they depend on different npm packages and the client build process is specific
to the client UI technology stack used.

The `agent.info.ts` files located in the client, service, and monitor projects are autogenerated
when the Hello World project is build (see gulp commands `agentinfo:*` in `gulpfile.js`).
The generated files contain package, build and config information of the application, extracted
from the package.json and other sources. This information can be used at runtime, e.g. for
logging, informational display, or configuration (e.g. discriminating based on production
vs. development build mode).

## Communication Event Flow

The following sequence diagrams depict the asynchronous communication event flow
between Hello World components.

### Task Flow between Service and Clients

```
 Service                                        Client
    |                                              |
    | ADVERTISE Task request                       |
    |--------------------------------------------->|
    |                                              |
    |             UPDATE Task offer by client user |
    |<---------------------------------------------|
    `--------------------------------------------->|
    | COMPLETE Task offer accepted / rejected      |
    |                                              |
    | ADVERTISE Task assigned to client user       |
    |--------------------------------------------->|
    |                                              |
    |             ADVERTISE Task status InProgress |
    |<---------------------------------------------|
    |                                              |
    |                   ADVERTISE Task status Done |
    |<---------------------------------------------|
    |                                              |
    |                         QUERY Task Snapshots |
    |<---------------------------------------------|
    `--------------------------------------------->|
    | RETRIEVE Task Snapshots                      |
    |                                              |
```

All Advertise and Update events operate on a domain-specific `HelloWorldTask`
object model which is derived from the framework object type `Task` (see
common definitions under `shared/models.ts`).

Both service and client components provide a `TaskController` class to handle the
task-related communication event flow.

The service component generates new task objects with status `Request` every 10
seconds. The generated task request is persisted in the database task collection and
advertised to other system components (see `TaskController._generateRequests`).

The client component observes incomimg task requests and - if not currently busy
accomplishing another task - makes an offer to carry out the task by publishing
a partial Update event for the received task request object with the property `assigneeUserId`
set to the client's associated user ID defined in the client configuration.
(see `TaskController._observeAdvertiseRequests`).

For simplicity client users are not managed in the database. On initialization
each client component is associated with its own user object based on a randomly
generated unique object ID (see function `associateClientUser` in `client/app.ts`).

The service observes partial Update events and checks if any such event received
matches a task request it has generated previously (see
`TaskController._observeUpdateRequests`). This is accomplished by looking
up the object ID of the Update event object in the database task collection.
If a matching task is found which is no longer in `Request` status, the task offer
is rejected by sending a Complete response event with the already assigned task object
to the requesting client. If a matching task is found which is still in `Request`
status, it is assigned to the offering client user by updating the task's
`assignedUserId` property and setting the task status to `Pending`. The
updated task is stored in the database. Then, the updated task is sent as
a Complete response event to the requesting client. Finally, the updated task
is also advertised to any interested system components to notify that the task is
now assigned and in status `Pending`.

After receiving the task offer response the client accomplishes the task if
the task offer has not been rejected by the service. This is checked by
comparing the client's user ID with the `assignedUserId` property of the
task object received.

Before carrying out the task, the client updates the task status to `InProgress`
and notifies other components by advertising the updated task object.

Likewise, after the task has been completed, other components are notified
by advertising an updated task object with status `Done`.

The service in return observes task status changes (see
`TaskController._observeAdvertiseTasks`) and updates the task stored in the
database task collection.

In addition, after the task has been completed, the client is performing a query
for snapshot objects. The retrieved snapshot objects from the service are logged
on the client's console.

### Component Lifecycle Event Flow

```
 Service                                Service   Client   Monitor
    |                                       |        |        |
    |                   ADVERTISE Component |        |        |
    |<--------------------------------------|--------|--------|
    |                                       |        |        |
    |                                       |        |        |
    |                 DEADVERTISE Component |        |        |
    |<--------------------------------------|--------|--------|
```

Whenever the Communication Manager of a Coaty container is started
it advertises its identity as a `Component` object. Likewise,
when it is stopped, it deadvertises its identity. In case the
component is terminated abnormally, the MQTT broker takes over
deadvertisement as a last will/testament.

The same behavior applies to all controllers defined in a Coaty container.

Identity advertisement/deadvertisement can be activated or deactivated
by setting the boolean option `shouldAdvertiseIdentity` in the communication
or controller options of the container configuration. By default, this option is
activated for both communication managers and controllers.

The service component keeps track of connected components by
observing Advertise and Deadvertise events for `Component` identities,
storing them in an in-memory hash map, and advertising a log object
for each of them in return (see class `ComponentController`).

### Logging Event Flow

```
 Service                                Service   Monitor
    |                                       |        |
    |                         ADVERTISE Log |        |
    |<--------------------------------------|        |
    |                                  ADVERTISE Log |
    |<-----------------------------------------------|
    |                                                |
    | ADVERTISE DatabaseChange logChanged            |
    |----------------------------------------------->|
    |                                                |
    |                              QUERY Log objects |
    |<-----------------------------------------------|
    `----------------------------------------------->|
    | RETRIEVE Log objects                           |
    |                                                |
```

The framework supports decentralized logging of application-specific informational
events, such as errors, warnings, or system messages. Any Coaty component can publish a
log object by creating and advertising a `Log` object.

The service component advertises log objects for errors that occur while accessing
the database. The monitor component advertises a log object when the query for
log objects times out.

The service component observes advertised log objects (see
`LogController._observeAdvertiseLog`), stores them in the database log
collection and advertises a corresponding `DatabaseChange` object.

The monitor component observes these Advertise events and in return
queries the list of `Log` objects containing the top 100 log entries
order descendingly by log date, then ascendingly by log level.

This query event is satifies by the service component which responds with
a list of corresponding log objects retrieved from the database log collection
(see `LogController._observeQueryLog`).

Due to the asynchronous nature of communication events we need a separate object
type `DatabaseChange` to notify the monitor component that the database log
collection has been updated. The monitor could just observe Advertise events
on `Log` objects, but then the subsequent query event might be answered by
the service **before** it has received the Advertise event on the `Log` object.

---
Copyright (c) 2018 Siemens AG. This work is licensed under a
[Creative Commons Attribution-ShareAlike 4.0 International License](http://creativecommons.org/licenses/by-sa/4.0/).
