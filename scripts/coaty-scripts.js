#!/usr/bin/env node

/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

// ENSURE THAT THIS FILE HAS UNIX STYLE LINE ENDINGS

const brokerScript = require("./broker");
const infoScript = require("./info");
const releaseScripts = require("./release");

const utils = require("./utils");

if (process.argv.length > 2) {
    // Get args from original "npm run <cmd> ...<args>" command
    const npmRunArgs = [];
    if (process.env.npm_config_argv) {
        try {
            const npmConfigArgs = JSON.parse(process.env.npm_config_argv);
            if (npmConfigArgs && npmConfigArgs.original && npmConfigArgs.original.length > 2) {
                for (let i = 2; i < npmConfigArgs.original.length; i++) {
                    npmRunArgs.push(npmConfigArgs.original[i]);
                }
            }
        }
        catch (e) {
            utils.logError(e);
            process.exit(1);
        }
    }

    const cmd = process.argv[2];

    // Substitute %i in command args (i >= 1) by the corresponding 
    // positional npm run command argument. If such an index arg 
    // doesn't exist it is substituted by null.
    const cmdArgs = process.argv.slice(3).map(arg => {
        if (arg.startsWith("%")) {
            return npmRunArgs[parseInt(arg.substr(1)) - 1];
        }
        return arg;
    });

    let cmdPromise = undefined;
    switch (cmd) {
        case "broker":
            cmdPromise = brokerScript.broker(cmdArgs);
            break; 
        case "info":
            cmdPromise = infoScript.info(...cmdArgs);
            break;
        case "version-release":
            cmdPromise = releaseScripts.versionRelease(...cmdArgs);
            break;
        case "cut-release":
            cmdPromise = releaseScripts.cutRelease(...cmdArgs);
            break;
        case "push-release":
            cmdPromise = releaseScripts.pushRelease(...cmdArgs);
            break;
        case "publish-release":
            cmdPromise = releaseScripts.publishRelease(...cmdArgs);
            break;
        case "update-changelog":
            cmdPromise = releaseScripts.updateChangelog(...cmdArgs);
            break;
        default:
            cmdPromise = Promise.reject(new Error(`undefined script '${cmd}'`));
    }
    cmdPromise
        .then(cmdResult => {
            utils.logInfo(`coaty-scripts ${cmd}: ${cmdResult}`);
            process.exit();
        })
        .catch(e => {
            utils.logError(`coaty-scripts ${cmd}: ${e}`);
            process.exit(1);
        });
}
else {
    utils.logError("coaty-scripts: missing script name");
    process.exit(1);
}
