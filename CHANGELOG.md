# Changelog

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
