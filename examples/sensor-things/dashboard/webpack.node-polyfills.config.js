module.exports = {
    // These options configure whether to polyfill or mock certain Node.js globals and modules.
    // This allows code originally written for the Node.js environment to run in other environments
    // like the browser.
    //
    // Starting with Angular CLI 6, webpack doesn't configure these shims for Node.js global variables 
    // any more by default. Nut some of these (process, global, Buffer, etc.) are required by 
    // MQTT.js sdependency modules when run in the browser.
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