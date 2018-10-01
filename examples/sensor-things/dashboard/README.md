# Dashboard

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 6.2.1.

## Integration of Coaty in Angular project

Starting with Angular CLI 6, the underlying webpack doesn't configure shims for Node.js
any more. But the MQTT.js client library used by Coaty requires some Node.js polyfills
(for process, global, Buffer, etc.) when run in the browser.

To solve this problem, webpack needs to be reconfigured to polyfill or mock required Node.js
globals and modules. This Node.js configuration is specified in the
`webpack.node-polyfills.config.js` file. The Angular project configuration in `angular.js`
must be adjusted to integrate the custom webpack config file by using custom builders
for the build and serve targets. Finally, the custom builders must be installed as development
dependencies of your project.

This approach is described in detail in the
[Coaty JS Developer Guide](https://github.com/coatyio/coaty-js/tree/master/docs/developer-guide.md#bootstrap-a-coaty-container-in-angular-or-ionic).

---
Copyright (c) 2018 Siemens AG. This work is licensed under a
[Creative Commons Attribution-ShareAlike 4.0 International License](http://creativecommons.org/licenses/by-sa/4.0/).
