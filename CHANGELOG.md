# Changelog

<a name="2.4.1"></a>
## [2.4.1](https://github.com/coatyio/coaty-js/compare/v2.4.0...v2.4.1) (2021-10-22)

This patch release fixes an issue in the MQTT binding where a stopped Coaty agent keeps the Node.js process from terminating.

### Bug Fixes

* **com:** on unjoining in MQTT binding only deregister client event handlers that have been registered previously to prevent dangling asynchronous I/O operations which keep Node.js event loop from exiting ([32ff5a8](https://github.com/coatyio/coaty-js/commit/32ff5a80b302b627f9ac922194f41cdb3fd9bf0e))

<a name="2.4.0"></a>
# [2.4.0](https://github.com/coatyio/coaty-js/compare/v2.3.3...v2.4.0) (2021-09-22)

This release features an optimized Postgres adapter to significantly speed up NoSQL operations on recent PostgreSQL server versions.

### Bug Fixes

* **scripts:** ensure coaty-scripts can not only be run by "npm run" but also by "npx" and "npm exec" ([9542ad1](https://github.com/coatyio/coaty-js/commit/9542ad1f180674ebc07c5838424d737e121b0f66))

### Features

* **db:** in Postgres adapter support highly optimized NoSQL containment, existence, and comparison operations on JSON objects using indexed access via jsonpath operators (only available for PostgreSQL server version 13 or later) ([5ff94f0](https://github.com/coatyio/coaty-js/commit/5ff94f0370741190a183b0d0b4cfd31dbdd2be57))

<a name="2.3.3"></a>
## [2.3.3](https://github.com/coatyio/coaty-js/compare/v2.3.2...v2.3.3) (2021-07-01)

This patch release fixes an issue that causes publications to be blocked after connection downtime in some rare situations.

### Bug Fixes

* **mqtt-binding:** prevent publications from being not submitted after reconnection in some rare situations ([b1cfa4e](https://github.com/coatyio/coaty-js/commit/b1cfa4e80011dc4f8627b30a77338adea7cab9f3))

<a name="2.3.2"></a>
## [2.3.2](https://github.com/coatyio/coaty-js/compare/v2.3.1...v2.3.2) (2021-06-29)

This patch release optimizes keep-alive behavior of the MQTT binding to detect broken connections more quickly.

### Bug Fixes

* **com:** do not reschedule keep-alive messages in MQTT binding after publishing to detect broken connections more quickly ([12b1765](https://github.com/coatyio/coaty-js/commit/12b1765edc3ef5d91c203dd2433583566285a68f))

<a name="2.3.1"></a>
## [2.3.1](https://github.com/coatyio/coaty-js/compare/v2.3.0...v2.3.1) (2021-06-07)

This patch release fixes an issue with async cleanup on process termination and supports coaty-scripts with npm version 7+.

### Bug Fixes

* **runtime-node:** fix async cleanup in NodeUtils.handleProcessTermination to await completion before termination ([b92cc54](https://github.com/coatyio/coaty-js/commit/b92cc54d57e71caaf6d3d5205a52593016335f9a))
* **scripts:** support coaty-scripts for npm version 7+ ([4623f4e](https://github.com/coatyio/coaty-js/commit/4623f4e8d02df1fb43fa1e341b8418010b4f89c9))
* fix an incorrect uuid in SensorThings module ([966f0a1](https://github.com/coatyio/coaty-js/commit/966f0a12b19c17aafe75a7ae318dc86883b42dfd))

<a name="2.3.0"></a>
# [2.3.0](https://github.com/coatyio/coaty-js/compare/v2.2.1...v2.3.0) (2020-09-22)

This feature release supports additional `NodeUtils` functionality and fixes a bug in the IO routing module. Additionally, it supports the libp2p binding in the framework test suite.

### Bug Fixes

* **io-routing:** clone Uint8Array value parameter in `IoSourceController.publish()` if needed ([536d796](https://github.com/coatyio/coaty-js/commit/536d796ebc2b8c04eaec08854092b647bf77f3a5))
* **runtime-node:** change default realm argument of `NodeUtils.publishWampRouterService()` to "coaty" ([c300048](https://github.com/coatyio/coaty-js/commit/c3000488fea386f679f6f55354beeeaf19150fda))

### Features

* **runtime-node:** add `NodeUtils.getLocalIpV6Address()`, move `MulticastDnsDiscovery.getLocalIpV4Address()` to `NodeUtils.getLocalIpV4Address()` and mark old definition as deprecated ([d484816](https://github.com/coatyio/coaty-js/commit/d4848169328d583919b7c581a95c5fc072dbdc28))

<a name="2.2.1"></a>
## [2.2.1](https://github.com/coatyio/coaty-js/compare/v2.2.0...v2.2.1) (2020-06-17)

This patch release fixes some binding-related issues, updates binding-specific documentation, and supports configurable communication bindings for the framework test suite.

### Bug Fixes

* **com:** correct UTF8 byte count calculation of high surrogate pairs ([b22b7cd](https://github.com/coatyio/coaty-js/commit/b22b7cdc1ce638d1ef8ad3d9ac9c00b4e1ae2ada))
* **communication:** ignore undefined optional arguments passed to the `CommunicationBinding.log` method ([ad75ea6](https://github.com/coatyio/coaty-js/commit/ad75ea6febd2f13074e01588c48da5eb15a329d7))
* provide correct validation of plain JavaScript objects using `isPlainObject` utility function ([e21a17d](https://github.com/coatyio/coaty-js/commit/e21a17d4529d5bae16c4ab20835a8d1a1c632578))

<a name="2.2.0"></a>
# [2.2.0](https://github.com/coatyio/coaty-js/compare/v2.1.1...v2.2.0) (2020-06-03)

### Features

* **communication:** make communication binding protocol publicly accessible by external binding implementations ([d3dea5a](https://github.com/coatyio/coaty-js/commit/d3dea5a91ce8419875fff4195101b0815a0c640f))

<a name="2.1.1"></a>
## [2.1.1](https://github.com/coatyio/coaty-js/compare/v2.1.0...v2.1.1) (2020-05-29)

### Bug Fixes

* **communication:** fix incorrect advertisements of an agent's Identity and IoNodes ([47bbf5e](https://github.com/coatyio/coaty-js/commit/47bbf5ebfb2cc52ad1238641733a53b60e5db84b))

<a name="2.1.0"></a>
# [2.1.0](https://github.com/coatyio/coaty-js/compare/v2.0.1...v2.1.0) (2020-05-29)

This minor release introduces *communication bindings*, a mechanism to make Coaty's underlying publish-subscribe messaging protocol interchangeable, while keeping the set of communication event patterns and your application code unaffected. The default binding - MQTT with JSON-UTF8 payload encoding - is backward-compatible with Coaty 2 releases of Coaty JS and Coaty Swift. The communication binding API is considered experimental until Coaty 3.

### Features

* **communication:** add support for communication bindings ([41220bd](https://github.com/coatyio/coaty-js/commit/41220bdf78e73433baa2291edb20abd74973671c))
* **communication:** deprecate `CommunicationManager.publishRaw(topic:value:shouldRetain:)`, use `CommunicationManager.publishRaw(event:)` instead (the deprecated method signature will be removed in the next major release) ([e6c90c9](https://github.com/coatyio/coaty-js/commit/e6c90c909174ad7d0a4c619fb4a586ef0e79b0a1))
* **communication:** support passing a binary IO value to `CommunicationManager.publishIoValue()` ([2ec9a59](https://github.com/coatyio/coaty-js/commit/2ec9a59e67ade5352048519ad575a3168ca1bc2b))
* **configuration:** deprecate binding-specific CommunicationOptions, these should be specified in binding options instead (the deprecated options will be removed in the next major release) ([57dcd99](https://github.com/coatyio/coaty-js/commit/57dcd997ce6015723466cc23659981e0bf5ce085))
* **io-routing:** support both raw binary and JSON data formats when publishing and observing IO values ([b06447e](https://github.com/coatyio/coaty-js/commit/b06447e146cc4f2a366417879455328f883109c5))

<a name="2.0.1"></a>
## [2.0.1](https://github.com/coatyio/coaty-js/compare/v2.0.0...v2.0.1) (2020-04-15)

This patch release fixes two issues related to the Communication Manager.

### Bug Fixes

* **communication:** as `CommunicationManager.options` is read-only, use `CommunicationManager.start(options)` to (re)start with new communication options that override communication options in the configuration ([4aee1fb](https://github.com/coatyio/coaty-js/commit/4aee1fbddc6faf236ad4dc73a5ab415d660da821))
* **communication:** clean up MQTT.JS event listeners on client end ([9139159](https://github.com/coatyio/coaty-js/commit/913915978a5a862a4d95012ce22462fa087cea16))
* **communication:** fix race condition causing sporadic crash when starting communication manager ([46a9df6](https://github.com/coatyio/coaty-js/commit/46a9df607837ed7eab800382f8635bfe749df6bd))

<a name="2.0.0"></a>
# [2.0.0](https://github.com/coatyio/coaty-js/compare/v1.11.1...v2.0.0) (2020-03-09)

This major Coaty 2 release incorporates experience and feedback gathered with Coaty 1. It pursues the main goal to streamline and simplify the framework API, to get rid of unused and deprecated functionality, and to prepare for future extensions. To upgrade your Coaty JS v1 projects, follow the instructions in the [migration guide](https://coatyio.github.io/coaty-js/man/migration-guide/).

### Bug Fixes

* **communication:** do not automatically deadvertise application-specific subtypes of Identity and Device objects ([4312bd7](https://github.com/coatyio/coaty-js/commit/4312bd78ed660b5ec2c7de47eb86f8f0337a6b86))
* **communication:** invoke `Controller.onCommunicationManagerStopping()` whenever the container is shut down ([1f5c4a7](https://github.com/coatyio/coaty-js/commit/1f5c4a7a72e5c16943afebae962fd7aa131b8f3e))

### Features

* change in `runtime-node` module ([ef2b90e](https://github.com/coatyio/coaty-js/commit/ef2b90e5494ac863398c9c60a675f509392ea5d0))
* **communication:** add namespacing concept to isolate different Coaty applications ([472cae9](https://github.com/coatyio/coaty-js/commit/472cae9941959d80bf32c8aeb9c12cfb2c9bab88))
* change package naming and import declarations for Coaty 2 ([4d83c8e](https://github.com/coatyio/coaty-js/commit/4d83c8e723ac57d34f6a1f98192385452d67ed3f))
* **CoatyObject:** remove property `CoatyObject.assigneeUserId` ([f9fcac2](https://github.com/coatyio/coaty-js/commit/f9fcac26e158e58a6d18cf486340dbeeb5046eef))
* **communication:** abandon support for partial Update events ([9c942af](https://github.com/coatyio/coaty-js/commit/9c942af3fbd9ca989575c7739b520890aed224a3))
* **communication:** add configuration option to specify an MQTT QoS level for communication ([e244be7](https://github.com/coatyio/coaty-js/commit/e244be74a8db47f0187c7ac9a7ef4e9abcc2a70c))
* **communication:** no longer emit Call event with `CommunicationManager.observeCall` if context filter is *not* supplied *and* context object *is* specified ([b22b892](https://github.com/coatyio/coaty-js/commit/b22b892e5d52e0b0465fdd748538342160abd028))
* **communication:** only *matching* incoming raw messages are dispatched to `CommunicationManager.observeRaw()` ([3b9b4bd](https://github.com/coatyio/coaty-js/commit/3b9b4bdce50e3e64aab5de36d8d827acf20d65c3))
* **communication:** optimize MQTT topic structure; application code not affected by this change ([36b9b75](https://github.com/coatyio/coaty-js/commit/36b9b75c2c72ce886e1dbbe053d16e12758d3bb6))
* **communication:** optimized raw message handling with `CommunicationManager.observeRaw` ([090c38d](https://github.com/coatyio/coaty-js/commit/090c38d2c169bb8d50a014c6879cce51a36a69e1))
* **communication:** remove `CommunicationOptions.useReadableTopics` ([637bcb3](https://github.com/coatyio/coaty-js/commit/637bcb370653af90a2e4ed31ac3e73a453fdacb4))
* **communication:** simplify distributed lifecycle management ([bbac21a](https://github.com/coatyio/coaty-js/commit/bbac21ab4304196495de55ede3e8ffec7f5a4397))
* **communication:** support partial options for `CommunicationManager.restart(); returns promise resolving on completion ([b1878d7](https://github.com/coatyio/coaty-js/commit/b1878d70ddd6eb8101a298cebe982ec8888facfd))
* **communication:** unsubscribe observables returned by publish and observe event methods automatically when communication manager is stopped ([62628cd](https://github.com/coatyio/coaty-js/commit/62628cda16859fbaccac6fa6048aba0d8466de12))
* **communication:** validate object type for Advertise and Update events ([69ff3fe](https://github.com/coatyio/coaty-js/commit/69ff3fe8946ef37bd75d2be10187b22b67715955))
* **Component:** rename core object type `Component` to `Identity` ([c59389b](https://github.com/coatyio/coaty-js/commit/c59389b0fb2c568bf35f2a745c4a53db3cb21198))
* **Config:** remove object type `Config` ([026afde](https://github.com/coatyio/coaty-js/commit/026afde77a5c5e229351affbc922c5e3ee341e43))
* **configuration:** change signature of `mergeConfigurations` function to accept *partial* primary or secondary configuration parameters. ([42ac724](https://github.com/coatyio/coaty-js/commit/42ac7243ca6114c0818e6d85a325a7a249e34771))
* **configuration:** rename `Runtime.options` to `Runtime.commonOptions` and make `Configuration.common` optional ([a798738](https://github.com/coatyio/coaty-js/commit/a798738cd9be5eecda2246c5ccd1ae606d14a566))
* **deprecated:** remove functionality marked as deprecated in Coaty v1 ([552199f](https://github.com/coatyio/coaty-js/commit/552199f3a51c65292cd351817aea3d7830c4a3f0))
* **events:** rename public `CommunicationEvent` and `IoStateEvent` getters ([ff3148a](https://github.com/coatyio/coaty-js/commit/ff3148af1be2bbe0332e814953d666e77cad0ec4))
* **io-routing:** redesign IO routing by generalizing and broadening the scope of routing ([4c9aadc](https://github.com/coatyio/coaty-js/commit/4c9aadc84bdf1e832413a6bcd1d04a862744499f))
* **Log:** add optional property `Log.logLabels` to provide multi-dimensional context-specific data along with a log ([7521c39](https://github.com/coatyio/coaty-js/commit/7521c394e99f44fb31096e009507cc1f04b5657d))
* **object types:** remove `Task.workflowId`; add `Task.assigneeObjectId`, change value type of `Task.requirements` ([ff8e32a](https://github.com/coatyio/coaty-js/commit/ff8e32a234eb446a36fd2ec035cb92dff3587653))
* **sensor-things:** add `SensorSourceController.findSensor()` to look up a registered sensor by predicate ([b085661](https://github.com/coatyio/coaty-js/commit/b085661b77aab59cb6036ac7f15b3f601d8e1e60))
* make access to container identity and configuration options readonly ([3a4e6f1](https://github.com/coatyio/coaty-js/commit/3a4e6f12cb33a793cccf2af443353e7d669ec3c4))
* **sensor-things:** make Sensor objects emitted by `SourceCodeController.registeredSensorsChangeInfo$` read-only ([78da6ba](https://github.com/coatyio/coaty-js/commit/78da6ba3b347f3b79fd7ee52e21f1acca3219af4))
* **util:** resolve promise returned by `Async.inSeries` function to the last item index executed instead of a boolean indicating premature termination ([ea2b9ea](https://github.com/coatyio/coaty-js/commit/ea2b9eae7de061a1de8ea492cd5f6935acc2facd))

### Performance Improvements

* **communication:** optimize dispatching of incoming response events ([bac3451](https://github.com/coatyio/coaty-js/commit/bac3451772e46a4ae6cc56a39bfd56788c56c70f))

### BREAKING CHANGES

* **util:** promise returned by `Async.inSeries` function resolves to the last item index executed instead of a boolean indicating premature termination
* use scoped npm package named `@coaty/core` with revised module structure
* **io-routing:** migrate to the new IO routing concept as described in [Coaty JS Migration Guide](https://coatyio.github.io/coaty-js/man/migration-guide/)
* **communication:** abandon partial Update events in favor of full Update events to observe a specific core or object type
* **object types:** stop using `Task.workflowId` as this property has been removed. If needed, define an equivalent property in your custom task type. Use new property `Task.assigneeObjectId` to reference an object, e.g. a user or machine, that this task is assigned to. Change type of `Task.requirements` property to consist of key-value pairs.
* **sensor-things:** Sensor objects emitted by `SourceCodeController.registeredSensorsChangeInfo$` are read-only. If you need to manipulate one, clone the object first (using `clone()` function in `@coaty/core`).
* **communication:** Coaty communication events are no longer dispatched to raw message handlers
* **communication:** remove `CommunicationOptions.useReadableTopics` because this feature is no longer supported
* **communication:** observed Call events are no longer emitted if a context filter is *not* supplied *and* a context object *is* specified
* **communication:** refactor distributed lifecycle management as described in migration guide section "Changes in distributed lifecycle management"
* **Component:** rename core object type `Component` to `Identity`
* **CoatyObject:** remove property `CoatyObject.assigneeUserId`; if needed add it to a custom object type
* **Config:** remove object type `Config`: if needed, define an equivalent object type in your application code
* **configuration:** rename `Runtime.options` to `Runtime.commonOptions`
* **deprecated:** deprecated members have been removed, use replacements instead
* functions `provideConfiguration` and `provideConfigurationAsync` moved to `NodeUtils` class
* **events:** rename public `CommunicationEvent` and `IoStateEvent` getters

<a name="1.11.1"></a>
## [1.11.1](https://github.com/coatyio/coaty-js/compare/v1.11.0...v1.11.1) (2020-01-02)

This patch release fixes some issues regarding IO routing, the Coaty broker, and controller identity definition.

### Bug Fixes

* **controller:** ensure a controller's identity always has a `parentObjectId` referring to the communication manager's identity. It should never be overwritten by an `identity` communication option ([d2bf88c](https://github.com/coatyio/coaty-js/commit/d2bf88c))
* **io:** preserve IO value topic routes for already existing IO sources of readvertised or rediscovered devices ([37a4759](https://github.com/coatyio/coaty-js/commit/37a4759))
* **scripts/broker:** print non-Coaty MQTT message payloads in hex format if Coaty broker is run in verbose mode ([68b763d](https://github.com/coatyio/coaty-js/commit/68b763d))

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
