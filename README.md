# Coaty Framework - JavaScript

[![Powered by Coaty 2](https://img.shields.io/badge/Powered%20by-Coaty%202-FF8C00.svg)](https://coaty.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![release](https://img.shields.io/badge/release-Conventional%20Commits-yellow.svg)](https://conventionalcommits.org/)
[![npm version](https://badge.fury.io/js/%40coaty%2Fcore.svg)](https://www.npmjs.com/package/@coaty/core)

> To upgrade to Coaty 2, take a look at the [Migration
> Guide](https://coatyio.github.io/coaty-js/man/migration-guide/).

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
* standardized event based communication patterns on top of an open publish-subscribe
  messaging protocol (currently [MQTT](https://mqtt.org)),
* a platform-agnostic, extensible object model to discover, distribute, share,
  query, and persist hierarchically typed data, and
* rule based, context driven routing of IoT (sensor) data using smart backpressure
  strategies.

Coaty supports interoperable framework implementations for multiple platforms.
The Coaty JS package provides the cross-platform implementation targeted at
JavaScript/TypeScript, running as mobile or web apps in the browser, or as Node.js
services.

Coaty JS comes with complete API documentation, a developer guide, a coding
style guide, best-practice examples, and additional extensions.

## Learn how to use

If you are new to Coaty or would like to learn more, we recommend reviewing the
[framework documentation](https://coatyio.github.io/coaty-js/) of the
[coaty-js](https://github.com/coatyio/coaty-js) project. This documentation
includes:

* a [Developer Guide](https://coatyio.github.io/coaty-js/man/developer-guide/)
  that provides the basics to get started developing a Coaty project with the
  Coaty JS framework,
* a complete [API
  documentation](https://coatyio.github.io/coaty-js/api/index.html) of all
  public type and member definitions of the Coaty JS framework sources,
* a [Coding Style
  Guide](https://coatyio.github.io/coaty-js/man/coding-style-guide/) for Coaty
  JS framework and application developers,
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

Finally, the unit tests delivered with the framework itself also provide a
valuable source of programming examples for experienced developers.

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
everywhere. Install the VS Code extension "TSLint" to enable TypeScript linting
within the IDE.

## Getting started

To build and run Coaty agents with the Coaty JS technology stack
you need to install the `Node.js` JavaScript runtime (version 8 or higher) globally on
your target machine. Download and installation details can be found [here](http://nodejs.org/).

The framework uses the package dependency manager `npm` to download dependent libraries.
npm comes with `Node.js` so you need to install it first.

## Installing the framework

Coaty JS includes a *standard distribution package*
that targets Coaty agents using ECMAScript version `es5` and
module format `commonjs`. It can be used to develop Node.js services
and browser or Cordova apps bundled with Webpack, Browserify, or any
other commonjs-compatible bundler. This package should be used to
develop web and mobile apps using e.g. Angular or Ionic.

You can install the latest standard distribution package in your
agent project as follows:

```sh
npm install coaty
```

*Note*: The distribution package defines several optional dependency modules, including
`pg`, `cordova-sqlite-storage`, and `sqlite3`. You need to install any such
optional dependency as a package dependency in your application project *if* you intend to make
use of the associated functionality. For example, if you want to make use of the framework's
Unified Storage API by persisting objects in a PostgreSQL database, you have to install
the `pg` module.

As need arises, more non-standard distribution packages will be made available,
e.g. to target ECMAScript versions ES6 or later. If you need such a package,
please contact one of the project maintainers.

## Contributing

If you like Coaty, please consider &#x2605; starring
[the project on github](https://github.com/coatyio/coaty-js). Contributions to the
Coaty framework are welcome and appreciated. Please follow the recommended practice
described in [CONTRIBUTING.md](https://github.com/coatyio/coaty-js/blob/master/CONTRIBUTING.md).
This document also contains detailed information on how to build, test, and release the
framework.

## License

Code and documentation copyright 2018 Siemens AG.

Code is licensed under the [MIT License](https://opensource.org/licenses/MIT).

Documentation is licensed under a
[Creative Commons Attribution-ShareAlike 4.0 International License](http://creativecommons.org/licenses/by-sa/4.0/).

## Credits

Last but certainly not least, a big *Thank You!* to the folks who helped to
implement Coaty JS and make it even better:

* Markus Sauer [@markussauer](https://github.com/markussauer)
* Alihan Livdumlu [@adragonite](https://github.com/adragonite)
* Atakan Dulker [@phynics](https://github.com/phynics)
* Antoine Beyet
