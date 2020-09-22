/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

const chalk = require("chalk");
const path = require("path");
const Jasmine = require("jasmine");
const SpecReporter = require("jasmine-spec-reporter").SpecReporter;
const reporters = require("jasmine-reporters");

const TEST_REPORT_DIR = "./test/report/";
const TEST_SUPPORT_DIR = "./test/support/";

function runTests(testSpecDir, binding, verbose, debug) {
    const noop = () => { };
    const jrunner = new Jasmine();

    // Boolean is implicitely converted to a string value.
    process.env.test_debug = debug;

    if (verbose) {
        // Remove default reporter logs
        jrunner.configureDefaultReporter({ print: noop });

        // Add jasmine-spec-reporter
        jasmine.getEnv().addReporter(new SpecReporter({
            displaySpecDuration: true,
            displaySuiteNumber: true,
            displayPendingSpec: true,
            displayPendingSummary: false,
            displayStacktrace: "pretty",
        }));
    }

    // Add JUnit XML reporter
    const reportsDir = process.env.npm_package_config_test_reports_dir;
    jasmine.getEnv().addReporter(new reporters.JUnitXmlReporter({
        // Produce a single XML file
        consolidateAll: true,
        filePrefix: "junitresults.coaty",
        savePath: path.resolve(reportsDir || TEST_REPORT_DIR),
    }));

    // Configure Jasmine
    const jasmineConfigFile = process.env.npm_package_config_test_config;
    const jasmineConfig = require(path.resolve(jasmineConfigFile || TEST_SUPPORT_DIR + "jasmine.json"));
    jasmineConfig.spec_dir = testSpecDir;
    jrunner.loadConfig(jasmineConfig);

    // Enable display of error stack trace in debug mode
    

    // Start static http server first to provide Coaty JSON configuration to tests.
    startHttpServer()
        .then(() => {
            if (!binding) {
                binding = "MQTT";
                console.log(chalk.yellow(`# No communication binding specified: using MQTT...`));
            }
            const bnd = binding.toLowerCase();
            try {
                const bndConfig = require(path.resolve(`${TEST_SUPPORT_DIR}${bnd}.config.js`));

                // Provide the communication binding with options to all tests.
                global["test_binding"] = bndConfig.initBinding(debug);

                // Execute tests in the context of the given binding.
                bndConfig.withTests(debug, () => jrunner.execute());
            } catch (error) {
                console.log(chalk.red(`# Failed to init ${binding} binding: ${error}`));
                console.log(chalk.red(`# Make sure binding @coaty/binding.${bnd} has been installed as a devDependency.`));
                process.exit();
            }
        });
}

function startHttpServer() {
    const config = require(path.resolve(TEST_SUPPORT_DIR + "webserve.config.json"));
    return new Promise((resolve) => {
        const fs = require("fs");
        const http = require("http");
        const server = http.createServer((req, res) => {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(fs.readFileSync(path.resolve(config.staticServe, "." + req.url)));
        });
        server.listen(config.staticPort, () => {
            console.log(chalk.yellow(`# Static HTTP server running on port ${config.staticPort}...`));
            resolve();
        });
    });
}

module.exports = runTests;


