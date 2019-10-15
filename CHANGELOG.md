# Changelog

<a name="1.11.0"></a>
# [1.11.0](https://github.com/coatyio/coaty-js/compare/v1.10.1...v1.11.0) (2019-10-15)

This release provides a new feature regarding mDNS and a patch for the Postgres database adapter.

### Bug Fixes

* **db:** correct bug in call extension `initDatabase` of PostgresAdapter ([90da87a](https://github.com/coatyio/coaty-js/commit/90da87a))

### Features

* **runtime-node:** extend `MulticastDnsDiscovery.getLocalIpV4Address` to accept a specific network interface ([eb83913](https://github.com/coatyio/coaty-js/commit/eb83913))

<a name="1.10.1"></a>
## [1.10.1](https://github.com/coatyio/coaty-js/compare/v1.10.0...v1.10.1) (2019-08-29)

This patch release fixes an issue with multiple Advertise events being published on failed reconnection attempts.

### Bug Fixes

* **com:** ensure communication manager's identity and associated device is advertised only once on reconnection ([6e8b6e6](https://github.com/coatyio/coaty-js/commit/6e8b6e6))

<a name="1.10.0"></a>
# [1.10.0](https://github.com/coatyio/coaty-js/compare/v1.9.1...v1.10.0) (2019-06-12)

This feature release adds support for secure communication with the Coaty development broker.

### Bug Fixes

* **runtime:** return `undefined` in `Container.getController()` instead of throwing an error if controller with the given name is not registered ([2e61b34](https://github.com/coatyio/coaty-js/commit/2e61b34))

### Features

* **scripts/broker:** add support for secure TLS communication with Coaty development broker (see documentation [here](https://coatyio.github.io/coaty-js/man/developer-guide/#coaty-broker-for-development)) ([9f23519](https://github.com/coatyio/coaty-js/commit/9f23519))

<a name="1.9.1"></a>
## [1.9.1](https://github.com/coatyio/coaty-js/compare/v1.9.0...v1.9.1) (2019-06-04)

This patch release provides a breaking change to the object lifecycle controller's public interface.

### Bug Fixes

* **controller:** redesign ObjectLifecycleInfo interface; BREAKING CHANGE: provide change info as objects ([592a252](https://github.com/coatyio/coaty-js/commit/592a252))

<a name="1.9.0"></a>
# [1.9.0](https://github.com/coatyio/coaty-js/compare/v1.8.0...v1.9.0) (2019-06-04)

This feature release provides additional convenience methods for ObjectLifecycleController.

### Features

* **controller:** add new methods to [`ObjectLifecycleController`](https://coatyio.github.io/coaty-js/man/developer-guide/#object-lifecycle-controller) to advertise/readvertise/deadvertise custom objects and observe/resolve corresponding Discover events ([48df161](https://github.com/coatyio/coaty-js/commit/48df161))

<a name="1.8.0"></a>
# [1.8.0](https://github.com/coatyio/coaty-js/compare/v1.7.2...v1.8.0) (2019-05-29)

This feature release adds a new convenience controller for distributed lifecycle management.

### Features

* **controller:** add convenience controller class [`ObjectLifecycleController`](https://coatyio.github.io/coaty-js/man/developer-guide/#object-lifecycle-controller) for distributed lifecycle management ([471360c](https://github.com/coatyio/coaty-js/commit/471360c))

<a name="1.7.2"></a>
## [1.7.2](https://github.com/coatyio/coaty-js/compare/v1.7.1...v1.7.2) (2019-05-22)

This patch release fixes an issue with reconnections not republishing initial Advertise events.

### Bug Fixes

* **com:** republish Advertise events for identity/device on reconnection ([97b206d](https://github.com/coatyio/coaty-js/commit/97b206d))

<a name="1.7.1"></a>
## [1.7.1](https://github.com/coatyio/coaty-js/compare/v1.7.0...v1.7.1) (2019-05-22)

This patch release fixes a potential race condition leading to messages being lost under rare circumstances.

### Bug Fixes

* **com:** fix potential race condition in communication manager where topics are published while MQTT client is disconnecting ([884c953](https://github.com/coatyio/coaty-js/commit/884c953))

<a name="1.7.0"></a>
# [1.7.0](https://github.com/coatyio/coaty-js/compare/v1.6.1...v1.7.0) (2019-05-21)

This feature release provides enhanced identity management of communication manager and controllers as well as parameterizing of the Coaty broker.

### Features

* **com:** observe and resolve Discover events for a communication manager's or controller's identity in addition to advertising it initially ([0b0e01d](https://github.com/coatyio/coaty-js/commit/0b0e01d))
* **runtime:** deprecate `Configuration.CommunicationOptions.brokerOptions`; use `Configuration.CommunicationOptions.mqttClientOptions` instead (the deprecated option will be removed in the next major release) ([298815b](https://github.com/coatyio/coaty-js/commit/298815b))
* **scripts:** support passing specific options to Coaty broker instance ([c0e9d5f](https://github.com/coatyio/coaty-js/commit/c0e9d5f))

### Performance Improvements

* **sensor-things:** emit data by ThingSensorObservationObserverController.registeredSensorChangeInfo$ only if changes occur ([5c2793b](https://github.com/coatyio/coaty-js/commit/5c2793b))

<a name="1.6.1"></a>
## [1.6.1](https://github.com/coatyio/coaty-js/compare/v1.6.0...v1.6.1) (2019-05-06)

This patch release fixes two minor issues in the broker and release scripts.

### Bug Fixes

* **scripts/broker:** fix wrong log message on 'unsubscribe' ([5380959](https://github.com/coatyio/coaty-js/commit/5380959))
* **scripts/release:** ensure version anchor tag is inserted in generated Changelog ([05a20ac](https://github.com/coatyio/coaty-js/commit/05a20ac))

<a name="1.6.0"></a>
# [1.6.0](https://github.com/coatyio/coaty-js/compare/v1.5.0...v1.6.0) (2019-05-03)

This feature release integrates a new Coaty development broker. Due to concerns regarding performance and vulnerability, the Mosca broker has been replaced by [Aedes](https://www.npmjs.com/package/aedes). To upgrade your Coaty apps, remove/uninstall 'mosca' dependency from package.json.

### Features

* **runtime:** deprecate `container.getCommunicationManager()` and `container.getRuntime()`; use `container.communicationManager` and `container.runtime` instead (the deprecated methods will be removed in the next major release) ([efe43de](https://github.com/coatyio/coaty-js/commit/efe43de))
* **scripts:** add `defaultBuildMode` parameter to Coaty `info` script and function; use `COATY_ENV` environment variable to determine build mode instead of `NODE_ENV`, as documented [here](https://coatyio.github.io/coaty-js/man/developer-guide/#generate-project-meta-info-at-build-time) ([08152ba](https://github.com/coatyio/coaty-js/commit/08152ba))
* **scripts:** include a new Coaty development broker instead of Mosca. To upgrade your Coaty apps, remove/uninstall "mosca" dependency from package.json. ([ffbba3f](https://github.com/coatyio/coaty-js/commit/ffbba3f))

<a name="1.5.0"></a>
# [1.5.0](https://github.com/coatyio/coaty-js/compare/v1.4.1...v1.5.0) (2019-04-09)

This feature release introduces the Call-Return communication pattern enabling execution of context-filtered remote operations by Coaty agents. Coaty JS code examples are now hosted separately under [coaty-examples](https://github.com/coatyio/coaty-examples).

### Features

* **com:** add one-to-many, two-way communication pattern [Call-Return](https://coatyio.github.io/coaty-js/man/developer-guide/#call---return-event-pattern---an-example) for performing context-filtered remote operations ([bbcde9a](https://github.com/coatyio/coaty-js/commit/bbcde9a))
* **examples:** move framework code examples to separate GitHub project [coaty-examples](https://github.com/coatyio/coaty-examples) ([71af192](https://github.com/coatyio/coaty-js/commit/71af192))
* **examples:** use npm module gulpSequence instead of runSequence in gulpfiles ([5299f80](https://github.com/coatyio/coaty-js/commit/5299f80))
* **runtime:** change method signatures of `Container.getController` and `Container.mapControllers` to use unique controller name instead of non-unique controller type (BREAKING CHANGE) ([fb5d73e](https://github.com/coatyio/coaty-js/commit/fb5d73e))
* **scripts:** define option '--nobonjour' in broker script to disable automatic multicast DNS broker discovery ([05f572e](https://github.com/coatyio/coaty-js/commit/05f572e))
* **scripts:** make Mosca broker module a **peer** dependency of Coaty and update hello-world and sensor-things examples ([bc675ca](https://github.com/coatyio/coaty-js/commit/bc675ca))

<a name="1.4.1"></a>
## [1.4.1](https://github.com/coatyio/coaty-js/compare/v1.4.0...v1.4.1) (2019-02-27)

This patch release provides missing type definitions for the `scripts/broker` module.

<a name="1.4.0"></a>
# [1.4.0](https://github.com/coatyio/coaty-js/compare/v1.3.0...v1.4.0) (2019-02-07)

This feature release provides a non-breaking change to handling Raw communication events.

### Features

* **com:** change handling of Raw events: observing raw subscription topics no longer suppresses observation of non-raw communication ([5dd9e9c](https://github.com/coatyio/coaty-js/commit/5dd9e9c))

<a name="1.3.0"></a>
# [1.3.0](https://github.com/coatyio/coaty-js/compare/v1.2.4...v1.3.0) (2019-02-04)

This feature release adds new features to the Unified Storage API and the broker script.

### Bug Fixes

* **sensor-things example:** add missing rxjs dependency to package.json in broker project ([889a320](https://github.com/coatyio/coaty-js/commit/889a320))

### Features

* **db:** support property chaining for object filter conditions, ordering, and aggregation ([b887d43](https://github.com/coatyio/coaty-js/commit/b887d43))
* **examples:** dockerize hello world example ([aa11610](https://github.com/coatyio/coaty-js/commit/aa11610))
* **scripts:** add option to specify hostname for multicast DNS in broker script ([9b1fa37](https://github.com/coatyio/coaty-js/commit/9b1fa37))
* **util:** add Async.withTimeout method to process promises with timeout ([c758cfd](https://github.com/coatyio/coaty-js/commit/c758cfd))

<a name="1.2.4"></a>
## [1.2.4](https://github.com/coatyio/coaty-js/compare/v1.2.3...v1.2.4) (2018-11-20)

This patch release covers some minor issues in the `com` and `controller` modules, simplifies agent configuration in the sensor-things example, and adds new content to the developer guide and sensor-things guide.

### Bug Fixes

* **com:** narrow eventSource property of communication events to type Component ([9bcfca9](https://github.com/coatyio/coaty-js/commit/9bcfca9))
* **controller:** identity properties specified in controller configuration options take precedence over the ones specified in the controller's `initializeIdentity` method ([57c88d6](https://github.com/coatyio/coaty-js/commit/57c88d6))

<a name="1.2.3"></a>
## [1.2.3](https://github.com/coatyio/coaty-js/compare/v1.2.2...v1.2.3) (2018-11-15)

This patch release fixes a problem concerning publication of multicast DNS service records.

### Bug Fixes

* **runtime-node:** modify function `publishMulticastDnsService` to use the local hostname by default, not the IPv4 address of the first network interface; optionally providing a specific host address as a parameter is now supported ([b825fcd](https://github.com/coatyio/coaty-js/commit/b825fcd))

<a name="1.2.2"></a>
## [1.2.2](https://github.com/coatyio/coaty-js/compare/v1.2.1...v1.2.2) (2018-11-14)

This patch release refactors two utility methods regarding Update-Complete event handling.

### Code Refactoring

* **com:** change the notion of non-partial Update events from "complete update" to "full update" to avoid any possibility of confusion regarding Complete events. ([9ab2904](https://github.com/coatyio/coaty-js/commit/9ab2904))

### Features

* **examples:** add human-readable identity names for Hellow World agents ([7cdcf3e](https://github.com/coatyio/coaty-js/commit/7cdcf3e))

### BREAKING CHANGES

* **com:** `UpdateEvent.withComplete` is now `UpdateEvent.withFull` and `UpdateEventData.isCompleteUpdate` is now `UpdateEventData.isFullUpdate`

<a name="1.2.1"></a>
## [1.2.1](https://github.com/coatyio/coaty-js/compare/v1.2.0...v1.2.1) (2018-10-29)

This patch release fixes a potential issue related to broker options in CommunicationManager, preserves all comments in generated .d.ts declaration files for use by IDEs, and adds new guidelines to the coding style guide.

### Bug Fixes

* **com:** fix error in CommunicationManager thrown if brokerOptions specify an empty servers array ([20e4f91](https://github.com/coatyio/coaty-js/commit/20e4f91))

<a name="1.2.0"></a>
# [1.2.0](https://github.com/coatyio/coaty-js/compare/v1.1.1...v1.2.0) (2018-10-23)

This minor release supports generation of non-compliant Client IDs by the communication manager on broker connections.

### Features

* **communication-manager:** support non-compliant Client IDs on broker connections ([d3e0b26](https://github.com/coatyio/coaty-js/commit/d3e0b26))

<a name="1.1.1"></a>
## [1.1.1](https://github.com/coatyio/coaty-js/compare/v1.1.0...v1.1.1) (2018-10-18)

This patch release fixes an issue with raw subscription topics containing wildcards (for details see section 'Observing and publishing raw MQTT messages').

### Bug Fixes

* **communication-manager:** support observation of raw subscription topics containing wildcards ([18f5045](https://github.com/coatyio/coaty-js/commit/18f5045))

<a name="1.1.0"></a>
# [1.1.0](https://github.com/coatyio/coaty-js/compare/v1.0.4...v1.1.0) (2018-10-16)

This feature release provides some improvements in handling the identity object of controllers.

### Features

* **controller:** set parentObjectId of controller's identity to communication manager's identity object ID; advertise controller identity by default (opt-out); support specifying identity properties in controller/communication configuration options ([c45767f](https://github.com/coatyio/coaty-js/commit/c45767f))

<a name="1.0.4"></a>
## [1.0.4](https://github.com/coatyio/coaty-js/compare/v1.0.3...v1.0.4) (2018-10-09)

This patch release fixes an issue in Coaty cut-release script.

### Bug Fixes

* **scripts:** fix tagging issue in cut-release script ([f33fe0c](https://github.com/coatyio/coaty-js/commit/f33fe0c))

<a name="1.0.3"></a>
## [1.0.3](https://github.com/coatyio/coaty-js/compare/v1.0.2...v1.0.3) (2018-10-09)

This patch release fixes an issue in Coaty publish-release script.

### Bug Fixes

* **scripts:** fix blocking I/O in publish-release script ([63f8974](https://github.com/coatyio/coaty-js/commit/63f8974))

<a name="1.0.2"></a>
## [1.0.2](https://github.com/coatyio/coaty-js/compare/v1.0.0...v1.0.2) (2018-10-09)

This patch release fixes an issue in Coaty broker script.

### Bug Fixes

* **scripts:** fix handling of command arguments in broker script ([0d0985e](https://github.com/coatyio/coaty-js/commit/0d0985e))

<a name="1.0.1"></a>
## [1.0.1](https://github.com/coatyio/coaty-js/compare/v1.0.0...v1.0.1) (2018-10-08)

This patch release fixes a multicast DNS discovery issue and provides some documentation updates.

### Bug Fixes

* **mDNS:** fix timeout problem in finding multicast DNS services ([272e2a4](https://github.com/coatyio/coaty-js/commit/272e2a4))

<a name="1.0.0"></a>
# 1.0.0 (2018-09-30)

Initial release of the Coaty JS framework.
