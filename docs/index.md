---
layout: default
---
If you are new to Coaty or would like to learn more, we recommend reviewing this
framework documentation:

* [Developer Guide]({{ site.baseurl }}{% link man/developer-guide.md %}) - how
  to build a Coaty application with the Coaty JS framework
* [API Documentation]({{ site.baseurl }}{% link api/index.html %}) - complete
  code documentation of all public types and members of the Coaty JS sources
* [Coding Style Guide]({{ site.baseurl }}{% link man/coding-style-guide.md %}) -
  guidelines for coding with the Coaty JS framework
* [Communication Event Patterns]({{ site.baseurl }}{% link
  man/communication-events.md %}) - specification of Coaty communication
  events
* [Rights Management]({{ site.baseurl }}{% link man/rights-management.md %}) -
  guidance notes on authentication and authorization in a Coaty application
* [OGC SensorThings API]({{ site.baseurl }}{% link man/sensor-things-guide.md
  %}) - a guide on integration of the `OGC SensorThings API` in Coaty
* [Migration Guide]({{ site.baseurl }}{% link man/migration-guide.md %}) - a
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

---
Copyright (c) 2018 Siemens AG. This work is licensed under a
[Creative Commons Attribution-ShareAlike 4.0 International License](http://creativecommons.org/licenses/by-sa/4.0/).