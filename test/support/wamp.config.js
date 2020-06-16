/*! Copyright (c) 2020 Siemens AG. Licensed under the MIT License. */

const chalk = require("chalk");
const os = require("os");
const path = require("path");
const childProcess = require("child_process");

const routerConfigPath = path.resolve("./test/support/wamp.router.config.json");
const routerConfig = require(routerConfigPath);
const routerPort = routerConfig.workers[0].transports[0].endpoint.port;

module.exports = {

    initBinding: (debug) => {
        // Configure global debug and warn modes for autobahn package before
        // loading the library.
        if (debug) {
            global["AUTOBAHN_DEBUG"] = true;
            global["AUTOBAHN_WARN"] = true;
        }

        const WampBinding = require("@coaty/binding.wamp").WampBinding;

        return WampBinding.withOptions({
            routerUrl: `ws://localhost:${routerPort}`,

            // If router is not running, do not retry to connect.
            retryIfUnreachable: false,

            // 0:debug, 1:info, 2:error
            logLevel: debug ? 0 : 2,
        });
    },

    withTests: (debug, testRunner) => {
        // Spawn child process which runs Crossbar.io WAMP router. Note that
        // crossbar itself spins up additional python processes which have to be
        // killed explicitely on exit.
        //
        // Also note that the crossbar router configuration includes an MQTT bridge
        // for message inspection available on port 1884.
        const cbdir = path.join(os.tmpdir(), "crossbar");
        const subprocess = childProcess.spawn("crossbar",
            ["start", "--loglevel", "error", "--cbdir", cbdir, "--config", routerConfigPath], {
            stdio: ["ignore", "inherit", "inherit"]
        });

        let isSubprocessError = false;
        subprocess.on("error", error => {
            console.log(chalk.red(`# Couldn't start Crossbar.io router. ${error}`));
            console.log(chalk.red(`# Install Crossbar.io router before running tests.`));
            isSubprocessError = true;
            process.exit();
        });

        // Ensure crossbar processes are terminated when this process exits.
        process.on("exit", code => {
            if (isSubprocessError) {
                return;
            }

            // @todo For crossbar-20.5.1, "crossbar stop" command throws an
            // error on Windows platforms because Windows cannot handle SIGINT
            // signals to terminate a process (see main.py line 619ff).
            //
            // An alternative to patching crossbar is to extract the process ID
            // from the node.pid JSON file in the CBDIR folder and to terminate
            // this process with Node.js `process.kill()` (see def
            // _check_is_running in main.py).
            childProcess.spawnSync("crossbar", ["stop", "--cbdir", cbdir],
                {
                    stdio: ["ignore", "inherit", "inherit"]
                });
        });

        console.log(chalk.yellow(`# Starting Crossbar.io router on port ${routerPort}...`));

        // Wait until router is up and runnig, then execute the tests.
        setTimeout(() => {
            testRunner();
        }, 10000);
    },
};
