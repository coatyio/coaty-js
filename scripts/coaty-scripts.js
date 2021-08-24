#!/usr/bin/env node

/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

// ENSURE THAT THIS FILE HAS UNIX STYLE LINE ENDINGS

const utils = require("./utils");

if (process.argv.length > 2) {
    // Get args from original "npm run <cmd> ...<args>" command. Note that "npm
    // exec" and "npx" are not affected by the following "npm run" specific
    // clauses.
    const npmRunArgs = [];
    if (process.env.npm_config_argv) {
        // npm version up to 6
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
    } else if (process.env.npm_lifecycle_script && process.env.npm_command === "run-script") {
        // npm version 7+
        try {
            const pkg = require(process.env.npm_package_json);
            const paramsString = process.env.npm_lifecycle_script.substring(pkg.scripts[process.env.npm_lifecycle_event].length);
            npmRunArgs.push(...[].concat.apply([], paramsString.split('"').map((v, i) => i % 2 ? v : v.split(' '))).filter(s => !!s));
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
            cmdPromise = require("./broker").broker(cmdArgs);
            break;
        case "info":
            cmdPromise = require("./info").info(...cmdArgs);
            break;
        case "version-release":
            cmdPromise = require("./release").versionRelease(...cmdArgs);
            break;
        case "cut-release":
            cmdPromise = require("./release").cutRelease(...cmdArgs);
            break;
        case "push-release":
            cmdPromise = require("./release").pushRelease(...cmdArgs);
            break;
        case "publish-release":
            cmdPromise = require("./release").publishRelease(...cmdArgs);
            break;
        case "update-changelog":
            cmdPromise = require("./release").updateChangelog(...cmdArgs);
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
