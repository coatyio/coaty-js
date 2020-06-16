/*! Copyright (c) 2020 Siemens AG. Licensed under the MIT License. */

const path = require("path");
const broker = require("../../dist/es5-commonjs/scripts/broker");
const MqttBinding = require("@coaty/binding.mqtt").MqttBinding;

function startBroker(onReady, debug, options) {
    options.onReady = onReady;
    if (debug) {
        options.logVerbose = true;
    }
    broker.run(options);
}

function getBrokerConfig() {
    return require(path.resolve(process.env.npm_package_config_test_broker_config) ||
        path.resolve("./test/support/mqtt.broker.config.json"));
}

module.exports = {

    // Configure global debug and warn modes for autobahn package.
    initBinding: (debug) => {
        return MqttBinding.withOptions({
            brokerUrl: `mqtt://localhost:${getBrokerConfig().port}`,

            // 0:debug, 1:info, 2:error
            logLevel: debug ? 0 : 2,
        });
    },

    // Start Coaty MQTT broker and execute the tests.
    withTests: (debug, testRunner) => {
        const config = getBrokerConfig();

        startBroker(() => {
            testRunner();
        },
            debug,
            {
                port: config.port,
                wsPort: config.wsPort,
                logVerbose: config.logVerbose
            });
    },
};
