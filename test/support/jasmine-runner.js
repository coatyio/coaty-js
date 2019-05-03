/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

const chalk = require("chalk");
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

    const brokerConfig = process.env.npm_package_config_test_broker_config;
    const brokerSettings = require(path.resolve(brokerConfig) ||
        path.resolve("./test/support/broker.config.json"));

    // Start static http server first to provide Coaty JSON configuration in unit tests.
    startHttpServer(brokerSettings.staticServe, brokerSettings.staticPort)
        .then(() => {
            // Then start broker and execute the unit tests.
            startBroker(() => {
                jrunner.execute();
            },
                debug,
                {
                    port: brokerSettings.port,
                    wsPort: brokerSettings.wsPort,
                    logVerbose: brokerSettings.logVerbose
                });
        });
}

function startBroker(onReady, debug, options) {
    options.onReady = onReady;
    if (debug) {
        options.logVerbose = true;
    }
    broker.run(options);
}

function startHttpServer(static, port) {
    return new Promise((resolve) => {
        const fs = require("fs");
        const http = require("http");
        const server = http.createServer((req, res) => {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(fs.readFileSync(path.resolve(static, "." + req.url)));
        });
        server.listen(port, () => {
            console.log(chalk.yellow(`# Static HTTP server running on port ${port}...`));
            resolve();
        });
    });
}

module.exports = runTests;


