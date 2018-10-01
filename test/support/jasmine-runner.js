/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

"use strict";

const path = require("path");
const Jasmine = require("jasmine");
const SpecReporter = require("jasmine-spec-reporter").SpecReporter;
const reporters = require("jasmine-reporters");
const broker = require("../../dist/es5-commonjs/scripts/broker");

function runTests(testSpecDir, verbose, debug) {
    const noop = () => { };
    const jrunner = new Jasmine();

    // Boolean is implicitely converted to a string value.
    process.env.jasmineDebug = debug;

    if (verbose) {
        // Remove default reporter logs
        jrunner.configureDefaultReporter({ print: noop });

        // Add jasmine-spec-reporter
        jasmine.getEnv().addReporter(new SpecReporter({
            displaySpecDuration: true,
            displaySuiteNumber: true,
            displayPendingSpec: true,
            displayPendingSummary: false,
            displayStacktrace: "none",
        }));
    }

    // Add JUnit XML reporter
    const reportsDir = process.env.npm_package_config_test_reports_dir;
    jasmine.getEnv().addReporter(new reporters.JUnitXmlReporter({
        // Produce a single XML file
        consolidateAll: true,
        filePrefix: "junitresults.coaty",
        savePath: path.resolve(reportsDir || "./test/reports/"),
    }));

    // Configure Jasmine
    const jasmineConfigFile = process.env.npm_package_config_test_config;
    const jasmineConfig = require(path.resolve(jasmineConfigFile || "./test/support/jasmine.json"));
    jasmineConfig.spec_dir = testSpecDir;
    jrunner.loadConfig(jasmineConfig);

    startMosca(() => {
        jrunner.execute();
    }, debug);

}

function startMosca(onReady, debug) {
    const moscaConfig = process.env.npm_package_config_test_broker_config;
    const moscaSettings = require(path.resolve(moscaConfig) ||
        path.resolve("./test/support/mosca.config.json"));

    if (debug) {
        moscaSettings.logger.level = 30;
    }

    return broker.run({ moscaSettings, onReady, logVerbose: debug });
}

module.exports = runTests;


