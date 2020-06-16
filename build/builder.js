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
 * ```
 */

const chalk = require("chalk");
const childProcess = require("child_process");
const fse = require("fs-extra");
const path = require("path");
const rimraf = require("rimraf");
const tslint = require("tslint");

const SRC_TARGETDIR = "src";
const DIST_TARGET = "es5-commonjs";

builder(require("yargs")
    .command("clean", "Clean all distribution packages")
    .command("build", "Build distribution packages and lint the source code")
    .command("build:nolint", "Build distribution packages without linting")
    .command("lint", "Lint TypeScript source files")
    .command("lint:fix", "Lint TypeScript source files and fix linting errors")
    .command("doc", "Generate HTML documentation from source code")
    .command("test", "Run the test suites on the current build with args [<binding-name>] [--verbose] [--debug]")
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
                test(argv._[1], argv.verbose, argv.debug);
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
            const distDir = "./dist/" + target + "/";

            logInfo("Build distribution package " + target);

            // First, bring the desired tsconfig file into place
            fse.copySync(tsconfigPath, "./" + SRC_TARGETDIR + "/tsconfig.json");

            // Transpile TS core modules into one JS file, using TS compiler in
            // local typescript npm package. Remove all comments except
            // copy-right header comments, and do not generate corresponding
            // .d.ts files (see next step below).
            childProcess.execSync(path.resolve("./node_modules/.bin/tsc") +
                " --noEmitOnError " +
                " --project " + SRC_TARGETDIR +
                " --outDir " + distDir +
                " --removeComments true --declaration false",
                // redirect child output to parent's stdin, stdout and stderr
                { stdio: "inherit" });

            // Only emit .d.ts files, using TS compiler in local typescript npm package.
            // The generated declaration files include all comments so that
            // IDEs can provide this information to developers.
            childProcess.execSync(path.resolve("./node_modules/.bin/tsc") +
                " --noEmitOnError " +
                " --project " + SRC_TARGETDIR +
                " --outDir " + distDir +
                " --removeComments false --declaration true --emitDeclarationOnly true",
                // redirect child output to parent's stdin, stdout and stderr
                { stdio: "inherit" });

            // Copy scripts folder into distribution package
            fse.copySync("./scripts", distDir + "scripts");

            // Copy readme into distribution package
            fse.copySync("./README.md", distDir + "README.md");

            // Copy license into distribution package
            fse.copySync("./LICENSE", distDir + "LICENSE");

            // Copy tslint.json into distribution package (for use by Coaty projects)
            fse.copySync("./build/tslint.json", distDir + "tslint-config.json");

            // Copy .npmignore into distribution package
            fse.copySync("./.npmignore", distDir + ".npmignore");

            // Copy package.json into distribution package
            fse.copySync("./package.json", distDir + "package.json");

            // Update package.json to include distribution as prerelease in version
            updatePackageInfo(target, distDir + "package.json", file !== "tsconfig." + DIST_TARGET + ".json");
        }
    });
}

/**
 * Lint all TypeScript source files (except typings).
 */
function lint(applyFixes) {
    logInfo("Lint TypeScript source files");

    const tsDir = path.resolve(SRC_TARGETDIR);
    const cwdLength = tsDir.length - SRC_TARGETDIR.length;
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
function test(binding, verbose, debug) {
    const target = DIST_TARGET;
    const distDir = "./dist/";

    logInfo(`Run tests with ${binding || "default"} binding on distribution package ${target}`);

    // Copy src/test/config files to <target>/test/config
    const testConfigDir = distDir + target + "/test/config";
    rimraf.sync(path.resolve(testConfigDir));
    fse.copySync("./" + SRC_TARGETDIR + "/test/config", testConfigDir);

    // Set up and start test environment
    const testSpecDir = distDir + target + "/test/spec";
    const jasmineRunner = require(path.resolve("./test/support/jasmine-runner.js"));
    jasmineRunner(testSpecDir, binding, verbose, debug);
}

/**
 * Generate API documentation from source code (using typedoc generator)
 */
function doc(pkgName, pkgVersion) {
    const TYPEDOC = require("typedoc");
    const typescriptOptions = require(path.resolve("./build/tsconfig." + DIST_TARGET + ".json")).compilerOptions;
    const typedocOptions = require(path.resolve("./build/typedoc.js"));
    const app = new TYPEDOC.Application();
    const inputFiles = [];

    app.bootstrap(Object.assign({}, typedocOptions, typescriptOptions));

    getTypedocModuleEntryPoints(path.resolve(SRC_TARGETDIR), inputFiles);

    const project = app.convert(app.expandInputFiles(inputFiles));

    if (project) {
        rimraf.sync(path.resolve("./" + typedocOptions.out));
        logInfo("Generating API documentation at " + typedocOptions.out);
        app.generateDocs(project, typedocOptions.out);

    } else {
        logError("API documentation could not be projected due to errors. For details, turn on logger option.");
    }

    function getTypedocModuleEntryPoints(srcPath, srcFiles) {
        fse.readdirSync(srcPath).forEach((file, index) => {
            let filePath = path.join(srcPath, file);
            if (fse.lstatSync(filePath).isDirectory()) {
                getTypedocModuleEntryPoints(filePath, srcFiles);
            } else {
                if (path.basename(filePath) === "index.ts") {
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
    const runtimeFile = path.resolve("./" + SRC_TARGETDIR + "/runtime/runtime.ts");
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
