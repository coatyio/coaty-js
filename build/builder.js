/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

/**
 * Builder for Coaty framework (JS)
 * 
 * Use npm scripts to invoke the builder tasks:
 *
 * ```
 *   npm run clean         - Clean all distribution packages
 *   npm run build         - Build distribution packages and lint the source code
 *   npm run build:nolint  - Build distribution packages without linting
 *   npm run lint          - Lint TypeScript source files
 *   npm run lint:fix      - Lint TypeScript source files and fix linting errors
 *   npm run doc           - Generate HTML documentation from source code
 *   npm run test          - Run the test suites on the current build
 *   npm run test:debug    - Run the test suites on the current build with verbose output
 * ```
 */

"use strict";

const chalk = require("chalk");
const childProcess = require("child_process");
const fse = require("fs-extra");
const path = require("path");
const rimraf = require("rimraf");
const tslint = require("tslint");

const TS_TARGETDIR = "src";

builder(require("yargs")
    .command("clean", "Clean all distribution packages")
    .command("build", "Build distribution packages and lint the source code")
    .command("build:nolint", "Build distribution packages without linting")
    .command("lint", "Lint TypeScript source files")
    .command("lint:fix", "Lint TypeScript source files and fix linting errors")
    .command("doc", "Generate HTML documentation from source code")
    .command("test", "Run the test suites on the current build")
    .command("test:debug", "Run the test suites on the current build with verbose output")
    .argv);

function builder(argv) {
    const command = argv._[0];
    const [, pkg] = getPackageObject();
    logInfo(pkg.name + "@" + pkg.version);
    try {
        switch (command) {
            case "clean":
                clean();
                break;
            case "build":
                build(pkg.name, pkg.version);
                lint();
                break;
            case "build:nolint":
                build(pkg.name, pkg.version);
                break;
            case "lint":
                lint(false);
                break;
            case "lint:fix":
                lint(true);
                break;
            case "test":
                test(argv.verbose, argv.debug);
                break;
            case "broker":
                broker();
                break;
            case "doc":
                doc(pkg.name, pkg.version);
                break;
            default:
                logError("No such script command: " + command);
                break;
        }
    } catch (error) {
        logError(error.toString());
        process.exit(1);
    }
}

/**
 * Clean all distribution packages.
 */
function clean() {
    const distDir = "./dist";

    try {
        fse.readdirSync(distDir).forEach(file => {
            let filePath = path.resolve(distDir, file);
            if (fse.lstatSync(filePath).isDirectory()) {
                logInfo("Clean distribution package " + file);
                try {
                    rimraf.sync(filePath);
                } catch (e) {
                    logError("Could not clean distribution package: " + e);
                }
            }
        });
    } catch (e) { }
}

/**
 * Build distribution packages with modules and test specs for all defined 
 * ECMAScript versions and module formats.
 */
function build(pkgName, pkgVersion) {
    clean();

    // Update framework name/version/build date in Runtime class
    updateRuntimeInfo(Date.now(), pkgName, pkgVersion);

    const buildDir = "./build";

    fse.readdirSync(buildDir).forEach(file => {
        if (file.match(/tsconfig\..+\.json/gi)) {
            const tsconfigPath = path.resolve(buildDir, file);
            const opts = require(tsconfigPath).compilerOptions;
            const target = opts.target + "-" + opts.module;
            const targetDir = "./dist/" + target + "/";

            logInfo("Build distribution package " + target);

            // First, bring the desired tsconfig file into place
            fse.copySync(tsconfigPath, "./" + TS_TARGETDIR + "/tsconfig.json");

            // Execute "tsc --project TS_TARGETDIR", using compiler from local typescript npm package
            childProcess.execSync(path.resolve("./node_modules/.bin/tsc") +
                " --project " + TS_TARGETDIR +
                " --outDir " + targetDir,
                // redirect child output to parent's stdin, stdout and stderr
                { stdio: "inherit" });

            // Copy scripts folder into distribution package
            fse.copySync("./scripts", targetDir + "scripts");

            // Copy readme into distribution package
            fse.copySync("./README.md", targetDir + "README.md");

            // Copy license into distribution package
            fse.copySync("./LICENSE", targetDir + "LICENSE");

            // Copy tslint.json into distribution package (for use by Coaty projects)
            fse.copySync("./build/tslint.json", targetDir + "tslint-config.json");

            // Copy .npmignore into distribution package
            fse.copySync("./.npmignore", targetDir + ".npmignore");

            // Copy package.json into distribution package
            fse.copySync("./package.json", targetDir + "package.json");

            // Update package.json to include distribution as prerelease in version
            updatePackageInfo(target, targetDir + "package.json", file !== "tsconfig.es5-commonjs.json");
        }
    });
}

/**
 * Lint all TypeScript source files (except typings).
 */
function lint(applyFixes) {
    logInfo("Lint TypeScript source files");

    const tsDir = path.resolve(TS_TARGETDIR);
    const cwdLength = tsDir.length - TS_TARGETDIR.length;
    const tsSuffix = ".ts";
    const dtsSuffix = ".d.ts";
    const lintConfigFile = path.resolve("./build/tslint.json");
    const lintOptions = {
        formatter: "verbose",
        fix: applyFixes
    };

    lintFolders(tsDir);

    function lintFolders(parent) {
        fse.readdirSync(parent).forEach((file, index) => {
            let curPath = path.join(parent, file);
            if (!fse.lstatSync(curPath).isDirectory()) {
                if ((file.substr(-tsSuffix.length) === tsSuffix) &&
                    !(file.substr(-dtsSuffix.length) === dtsSuffix)) {
                    lintFile(curPath.substr(cwdLength));
                }
            } else {
                lintFolders(curPath);
            }
        });
    }

    function lintFile(file) {
        const contents = fse.readFileSync(file, "utf-8");
        const linter = new tslint.Linter(lintOptions);
        const configuration = tslint.Configuration.findConfiguration(lintConfigFile).results;
        linter.lint(file, contents, configuration);
        const result = linter.getResult();

        // For debugging, use console.log(result);
        result.errorCount > 0 && console.log(result.output);
    }
}

/**
 * Run the test suite.
 */
function test(verbose, debug) {
    const target = "es5-commonjs";
    const distDir = "./dist/";

    logInfo("Run test suites on distribution package " + target);

    // Copy src/test/config files to <target>/test/config
    const testConfigDir = distDir + target + "/test/config";
    rimraf.sync(path.resolve(testConfigDir));
    fse.copySync("./" + TS_TARGETDIR + "/test/config", testConfigDir);

    // Start Jasmine
    const testSpecDir = distDir + target + "/test/spec";
    const jasmineRunner = require(path.resolve("./test/support/jasmine-runner.js"));
    jasmineRunner(testSpecDir, verbose, debug);
}

/**
 * Generate API documentation from source code (using typedoc generator)
 */
function doc(pkgName, pkgVersion) {
    const typedoc = require("typedoc");
    const typescriptOptions = require(path.resolve("./build/tsconfig.es5-commonjs.json")).compilerOptions;
    const typedocOptions = require(path.resolve("./build/typedoc.js"));

    // Add version number to header of generated HTML documentation
    typedocOptions.name = pkgName + " v" + pkgVersion;

    const app = new typedoc.Application(Object.assign(typedocOptions, typescriptOptions));

    // A path to source files can only be specified on the command line, 
    // in the API we have to specify individual source files.
    // Note that the "exclude" option pattern is also not considered in API code.
    const srcFiles = [];
    getTypedocModuleSources(path.resolve(typedocOptions.src), srcFiles);
    getTypedocModuleSources(path.resolve(typedocOptions.src, "db/adapters/"), srcFiles);

    rimraf.sync(path.resolve("./" + typedocOptions.out));

    logInfo("Generate HTML documentation from source code...");
    const success = app.generateDocs(srcFiles, typedocOptions.out);
    if (!success) {
        logError("Failed to generate HTML documentation");
    }

    function getTypedocModuleSources(srcPath, srcFiles) {
        fse.readdirSync(srcPath).forEach((file, index) => {
            let filePath = path.join(srcPath, file);
            if (!fse.lstatSync(filePath).isDirectory()) {
                if (path.extname(filePath) === ".ts") {
                    srcFiles.push(filePath);
                }
            }
        });
    }
}

/* Internals */

function getPackageObject(folder) {
    const pkgPath = path.resolve(folder || process.cwd(), "./package.json");
    return [pkgPath, require(pkgPath)];
}

function updateRuntimeInfo(buildDate, pkgName, pkgVersion) {
    const runtimeFile = path.resolve("./" + TS_TARGETDIR + "/runtime/runtime.ts");
    const content = fse.readFileSync(runtimeFile, "utf-8").toString();
    let rewrittenContent = "";
    content.split("\n").forEach((line, index, array) => {
        rewrittenContent += line
            .replace(
                /FRAMEWORK_PACKAGE_NAME\s+=\s+"[^"]*"/,
                'FRAMEWORK_PACKAGE_NAME = "' + pkgName + '"')
            .replace(
                /FRAMEWORK_PACKAGE_VERSION\s+=\s+"[^"]*"/,
                'FRAMEWORK_PACKAGE_VERSION = "' + pkgVersion + '"')
            .replace(
                /FRAMEWORK_BUILD_DATE\s+=\s+\d+/,
                'FRAMEWORK_BUILD_DATE = ' + buildDate);
        if (index !== array.length - 1) {
            rewrittenContent += "\n";
        }
    });
    fse.writeFileSync(runtimeFile, rewrittenContent);
}

function updatePackageInfo(target, packageFile, shouldAddDistributionToVersion) {
    const pkgPath = path.resolve(packageFile);
    const info = require(pkgPath);
    if (shouldAddDistributionToVersion) {
        // Add distribution as prerelease to version
        info.version = info.version + "-" + target;
    }
    delete info.scripts;
    delete info.config;
    delete info.devDependencies;
    fse.writeFileSync(pkgPath, JSON.stringify(info, undefined, 4));
}

/* Logging */

function logInfo(message) {
    console.log(chalk.yellow("# " + message));
}

function logError(message) {
    console.error(chalk.red("\n** " + message));
}

function logMessage(message) {
    console.log(chalk.cyan("# " + message));
}
