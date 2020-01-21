/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

const utils = require("./utils");

/**
 * Coaty script command for generating agent info file.
 * Returns a promise that resolves to the generated `AgentInfo` object.
 */
function info(agentInfoFolder, defaultBuildMode) {
    return new Promise((resolve, reject) => {
        const result = generateAgentInfoFile(agentInfoFolder || "./src/", undefined, undefined, defaultBuildMode);
        resolve(result[1]);
    });
}

module.exports.info = info;

/**
 * Returns a gulp task function for generating a TypeScript file including agent
 * info in the specified folder.
 *
 * Agent project package information is acquired from the specified package.json
 * file and the build mode is determined by environment variable setting
 * `COATY_ENV`. Set `COATY_ENV` to "development", "production", "testing", etc.
 * before building your application. If the `COATY_ENV` variable is not set, its
 * value defaults to "development".
 *
 * This function is intended to be used in a gulp task definition within a
 * gulpfile.
 *
 * @param agentInfoFolder the folder where to write the agent info file
 * @param agentInfoFilename the file name of the agent info file (defaults to
 * "agent.info.ts")
 * @param packageFile the path to the package.json to extract package
 * information from (defaults to "package.json")
 */
function gulpBuildAgentInfo(agentInfoFolder, agentInfoFilename, packageFile) {
    if (agentInfoFilename === undefined) {
        agentInfoFilename = "agent.info.ts";
    }
    if (packageFile === undefined) {
        packageFile = "package.json";
    }
    return () => {
        const gulp = require("gulp");
        const result = generateAgentInfoFile(agentInfoFolder, agentInfoFilename, packageFile);
        return gulp.src(result[0]);
    };
}

module.exports.gulpBuildAgentInfo = gulpBuildAgentInfo;

/**
 * Generates a TypeScript file including agent info in the specified folder and
 * returns its absolute file path and the build mode as a tuple array.
 *
 * Agent project package information is acquired from the specified package.json
 * file and the build mode is determined by environment variable setting
 * `COATY_ENV`. Set `COATY_ENV` to "development", "production", "staging", etc.
 * before building your application. If the `COATY_ENV` variable is not set, its
 * value defaults to "development", unless overriden by the given
 * `defaultBuildMode` parameter. The service host name is acquired from the
 * environment variable `COATY_SERVICE_HOST`.
 *
 * This function is intended to be used in a Node.js program only.
 *
 * @param agentInfoFolder the folder where to write the agent info file
 * @param agentInfoFilename the file name of the agent info file (defaults to
 * "agent.info.ts")
 * @param packageFile the path to the package.json to extract package
 * information from (defaults to "package.json")
 * @param defaultBuildMode the default build mode to use (if not overriden by
 * COATY_ENV)
 */
function generateAgentInfoFile(agentInfoFolder, agentInfoFilename, packageFile, defaultBuildMode) {
    if (agentInfoFilename === undefined) {
        agentInfoFilename = "agent.info.ts";
    }
    if (packageFile === undefined) {
        packageFile = "package.json";
    }
    const fs = require("fs");
    const path = require("path");
    const agentInfoResult = generateAgentInfo(packageFile, defaultBuildMode);
    const agentInfoCode = agentInfoResult[0];
    const buildMode = agentInfoResult[1];
    const file = path.resolve(agentInfoFolder, agentInfoFilename);
    if (fs.statSync(path.resolve(agentInfoFolder)).isDirectory()) {
        fs.writeFileSync(file, agentInfoCode);
        return [file, buildMode];
    }
    throw new Error(`specified agentInfoFolder is not a directory: ${agentInfoFolder}`);
}

module.exports.generateAgentInfoFile = generateAgentInfoFile;

/**
 * Generates code for a TypeScript file which exports agent information as a
 * `AgentInfo` object on a variable named `agentInfo`. The information is
 * acquired from the specified package.json file and build mode from environment
 * variable setting `COATY_ENV`, unless overriden by the given
 * `defaultBuildMode` parameter. The service host name is acquired from the
 * environment variable `COATY_SERVICE_HOST`.
 *
 * @param packageFile the path to the package.json to extract package
 * information from
 * @param defaultBuildMode the default build mode (defaults to "development")
 */
function generateAgentInfo(packageFile, defaultBuildMode) {
    if (defaultBuildMode === undefined) {
        defaultBuildMode = "development";
    }
    const path = require("path");
    const pkg = require(path.resolve(packageFile));
    const buildMode = process.env.COATY_ENV || defaultBuildMode;
    const buildDate = utils.toLocalIsoString(new Date());
    const serviceHost = process.env.COATY_SERVICE_HOST || "";
    const copyrightYear = new Date().getFullYear();
    return ["/*! -----------------------------------------------------------------------------\n * <auto-generated>\n *     This code was generated by a tool.\n *     Changes to this file may cause incorrect behavior and will be lost if\n *     the code is regenerated.\n * </auto-generated>\n * ------------------------------------------------------------------------------\n * Copyright (c) " + copyrightYear + " Siemens AG. Licensed under the MIT License.\n */\n\nimport { AgentInfo } from \"@coaty/core\";\n\nexport const agentInfo: AgentInfo = {\n    packageInfo: {\n        name: \"" + (pkg.name || "n.a.") + "\",\n        version: \"" + (pkg.version || "n.a.") + "\",\n    },\n    buildInfo: {\n        buildDate: \"" + buildDate + "\",\n        buildMode: \"" + buildMode + "\",\n    },\n    configInfo: {\n        serviceHost: \"" + serviceHost + "\",\n    },\n};\n",
        buildMode];
}

module.exports.generateAgentInfo = generateAgentInfo;
