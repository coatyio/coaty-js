/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

const childProcess = require("child_process");
const conventionalRecommendedBump = require("conventional-recommended-bump");
const conventionalChangelog = require("conventional-changelog");
const osEndOfLine = require("os").EOL;
const path = require("path");
const fs = require("fs");
const semver = require("semver");

const utils = require("./utils");

const tabAsSpace = 4;

/**
 * Automatically bumps the package version according to the 
 * specified version parameter.
 * 
 * The given version parameter can have the following values:
 * "recommended", "first", major", "minor", "patch", or a valid 
 * semantic version string.
 *
 * If the version is `recommended`, a recommended version bump is computed based
 * on conventional commits. An error is reported, if the recommended version 
 * cannot be computed because there are no commits for this release at all.
 *
 * If the version is "first", the package version is bumped to 
 * the current version specified in package.json.
 * 
 * If the version is "major", "minor" or "patch", the
 * package version is incremented to the next major, minor, or
 * patch version, respectively.
 * 
 * If the version is a valid semantic version string, the 
 * package version is bumped to this version.
 * 
 * In any of the above cases except "first", an error is reported
 * if the new version to be bumped is equal to the current package version.
 * 
 * Returns a promise that resolves to the bumped version, or a promise
 * that is rejected in case an error occured.
 */
function versionRelease(version) {
    "use strict";
    return new Promise((resolve, reject) => {
        const [pkgPath, pkg] = getPackageObject();
        const bumpVersion = (version, isReleaseType, throwOnEqual) => {
            const newVersion = isReleaseType ? semver.inc(pkg.version, version) : semver.valid(version);

            if (newVersion === null) {
                reject(new Error(`version must be one of: "recommended", first", major", "minor", "patch", or a semantic version`));
                return;
            }

            if (throwOnEqual && semver.eq(pkg.version, newVersion)) {
                reject(new Error(`version to be bumped is equal to package version: ${newVersion}`));
                return;
            }

            const oldVersion = pkg.version;
            pkg.version = newVersion;

            try {
                fs.writeFileSync(pkgPath, JSON.stringify(pkg, undefined, tabAsSpace));

                // Update version in package-lock file
                const [pkgLckPath, pkgLck] = getPackageObject(undefined, "package-lock.json");
                pkgLck.version = newVersion;
                fs.writeFileSync(pkgLckPath, JSON.stringify(pkgLck, undefined, tabAsSpace));

                // If we are in the Coaty project update package version and 
                // coaty dependency of all example projects.
                if (pkg.name === "coaty") {
                    updateExamplePackageVersions(newVersion, pkg.name);
                }
            } catch (err) {
                reject(new Error(`version couldn't be bumped: ${err.message}`));
                return;
            }

            resolve(`bumped from ${oldVersion} to ${newVersion}`);
        };

        if (version === "recommended") {
            conventionalRecommendedBump({
                preset: "angular"
            }, (err, result) => {
                if (err) {
                    reject(new Error(`conventional recommended bump failed: ${err.message}`));
                    return;
                }
                bumpVersion(result.releaseType, true, true);
            });
            return;
        }

        if (version === "first") {
            bumpVersion(pkg.version, false, false);
            return;
        }

        const isReleaseType = version === "major" || version === "minor" || version === "patch";
        bumpVersion(version, isReleaseType, true);
    });
}

function updateExamplePackageVersions(newVersion, frameworkName) {
    "use strict";
    const updater = (exPath, level, maxLevel) => {
        fs.readdirSync(exPath).forEach(file => {
            let projectPath = path.join(exPath, file);
            if (fs.lstatSync(projectPath).isDirectory()) {
                if (fs.existsSync(path.join(projectPath, "package.json"))) {
                    const [exPkgPath, exPkg] = getPackageObject(projectPath, "package.json");
                    exPkg.version = newVersion;
                    if (exPkg.dependencies && exPkg.dependencies[frameworkName]) {
                        exPkg.dependencies[frameworkName] = newVersion;
                    }
                    try {
                        fs.writeFileSync(exPkgPath, JSON.stringify(exPkg, undefined, tabAsSpace));
                    } catch (exerr) {
                        utils.logError(`${file} example version couldn't be bumped: ${exerr.message}`);
                    }
                }
                if (fs.existsSync(path.join(projectPath, "package-lock.json"))) {
                    const [exPkgPath, exPkgLck] = getPackageObject(projectPath, "package-lock.json");
                    exPkgLck.version = newVersion;
                    try {
                        fs.writeFileSync(exPkgPath, JSON.stringify(exPkgLck, undefined, tabAsSpace));
                    } catch (exerr) {
                        utils.logError(`${file} example version couldn't be bumped: ${exerr.message}`);
                    }
                }
                if (level < maxLevel) {
                    updater(projectPath, level + 1, maxLevel);
                }
            }
        });
    };
    updater(path.resolve(process.cwd(), "examples"), 0, 1);
}

module.exports.versionRelease = versionRelease;

/**
 * Updates the CHANGELOG with release information from the conventional commits,
 * commits all pending changes and creates an annotated git tag for the release.
 * 
 * If supplied with releaseNote, this text is prepended to the release information generated
 * by conventional commits.
 */
function cutRelease(releaseNote) {
    "use strict";
    const [pkgPath, pkg] = getPackageObject();
    const msg = getCommitTagMessage(pkg.version);
    return updateChangelogInternal(pkg.version, releaseNote)
        // Stage and commit all new, modified, and deleted files in the entire working directory
        .then(() => runCommand("git add --all"))
        .then(() => runCommand(`git commit --no-verify -m "${msg}"`))
        // Make an unsigned annotated tag, replacing an existing tag with the same version
        .then(output => {
            return runCommand(`git tag -a -f -m "${msg}" v${pkg.version}`)
                .then(() => `updated CHANGELOG, committed and tagged ${output}\n\n` +
                    "You can now push the tagged release: npm run push-release");
        });
}

module.exports.cutRelease = cutRelease;

/**
 * Push to current branch w/ the release tag to the remote git repo.
 */
function pushRelease() {
    "use strict";
    return Promise.resolve()
        .then(() => runCommand("git push --follow-tags"))
        .then(output => "pushed tagged release");
}

module.exports.pushRelease = pushRelease;

/**
 * Publishes all the distribution packages of the new release on an
 * npm registry. Authentication is required to publish packages. The 
 * registry location is determined by the `publishConfig` section in the 
 * package.json, if present. If not present, the public npm registry is used.
 * 
 * Registers the published packages with the given tag, such that npm install 
 * <name>@<tag> will install this version. By default, `npm install` installs the 
 * `latest` tag.
 */
function publishRelease(npmDistTag) {
    "use strict";
    const tag = npmDistTag || "latest";
    const distPath = path.resolve(process.cwd(), "dist");
    const distFolders = [];

    const asyncInSeries = (items, asyncFunc) => {
        return new Promise((resolve, reject) => {
            const series = index => {
                if (index === items.length) {
                    resolve();
                    return;
                }

                asyncFunc(items[index])
                    .then(() => series(index + 1))
                    .catch(error => reject(error));
            };
            series(0);
        });
    };

    for (const file of fs.readdirSync(distPath)) {
        let projectPath = path.join(distPath, file);
        if (fs.lstatSync(projectPath).isFile() && file === "package.json") {
            // Assume the  dist folder itself is the only project to be published
            distFolders.splice(0);
            distFolders.push(distPath);
            break;
        }
        if (fs.lstatSync(projectPath).isDirectory()) {
            distFolders.push(projectPath);
        }
    }

    return Promise.resolve()
        // Authentication is based on an OAuth provider.
        // Get the relevant authentication and paste it into your ~/.npmrc or invoke "npm adduser".
        // For details see here
        // https://www.jfrog.com/confluence/display/RTF/Npm+Registry#NpmRegistry-NpmPublish(DeployingPackages)
        // .then(() => runCommandWithRedirectedIo(`npm login --always-auth --registry=${reg}`))
        .then(() => asyncInSeries(distFolders, folder => runCommandWithRedirectedIo(`npm publish "${folder}" --tag=${tag}`)))
        .then(() => `published ${distFolders.length} distribution packages on '${tag}' tag to npm registry`);
}

module.exports.publishRelease = publishRelease;

/**
 * *For testing purposes only*: Updates the CHANGELOG for the given package version
 * with the given release information (optional) from the conventional commits.
 * 
 * If supplied with releaseNote, this text is prepended to the release information generated
 * by conventional commits.
 */
function updateChangelog(pkgVersion, releaseNote) {
    "use strict";
    const [pkgPath, pkg] = getPackageObject();
    const msg = getCommitTagMessage(pkg.version);
    return updateChangelogInternal(pkgVersion, releaseNote)
        .then(output => {
            return `updated CHANGELOG for version ${pkgVersion}`;
        });
}

module.exports.updateChangelog = updateChangelog;

function createIfMissing(file) {
    "use strict";
    try {
        fs.accessSync(file, fs.F_OK);
    } catch (err) {
        if (err.code === "ENOENT") {
            utils.logInfo(`created ${path.basename(file)}`);
            fs.writeFileSync(file, "");
        }
    }
}

function getPackageObject(folder, name) {
    name = name || "package.json";
    const pkgPath = path.resolve(folder || process.cwd(), "./" + name);
    return [pkgPath, require(pkgPath)];
}

function getCommitTagMessage(version) {
    return `chore(release): v${version}`;
}

/**
 * Runs the given command in a child process.
 * 
 * Returns a promise that is resolved with the generated 
 * stdout of the command (as UTF-8 string) when the child process
 * terminates normally or rejected if the child process 
 * terminates with a non-zero exit code.
 */
function runCommand(command) {
    "use strict";
    return new Promise((resolve, reject) => {
        utils.logInfo(`Command: ${command}`);
        childProcess.exec(command, (error, stdout, stderr) => {
            // If exec returns content in stderr, but no error, print it as a warning.
            // If exec returns an error, reject the promise.
            if (error) {
                reject(error);
                return;
            } else if (stderr) {
                utils.logInfo(stderr);
            }
            resolve(stdout);
        });
    });
}

function runCommandWithRedirectedIo(command) {
    "use strict";
    return new Promise((resolve, reject) => {
        try {
            utils.logInfo(`Command: ${command}`);
            childProcess.execSync(command, { stdio: "inherit" });
            resolve();
        } catch (err) {
            reject(err);
        }
    });
}

function updateChangelogInternal(newVersion, releaseNote) {
    "use strict";
    return new Promise((resolve, reject) => {
        const changelog = path.resolve(process.cwd(), "CHANGELOG.md");
        const versionAnchor = "<a name=\"";

        createIfMissing(changelog);

        let oldHeader = "";
        let oldContent = fs.readFileSync(changelog, "utf-8");

        // Insert the new release information before the topmost release entry and after the header
        const startIndex = oldContent.indexOf(versionAnchor);
        const startEndIndex = startIndex == -1 ? -1 : oldContent.indexOf("\"></a>", startIndex);
        let startVersion = "";

        if (startIndex !== -1 && startEndIndex !== -1) {
            startVersion = oldContent.substring(startIndex + versionAnchor.length, startEndIndex);
            oldHeader = oldContent.substring(0, startIndex);
            oldContent = oldContent.substring(startIndex);
        } else {
            oldHeader = oldContent;
            oldContent = "";
        }

        // If the new release version is identical to the topmost version of 
        // the changelog, replace this version by the new version.
        if (startVersion && startVersion === newVersion) {
            const nextIndex = oldContent.indexOf(versionAnchor, startEndIndex);
            if (nextIndex !== -1) {
                oldContent = oldContent.substring(nextIndex);
            } else {
                oldContent = "";
            }
        }

        const changelogStream = conventionalChangelog({
            preset: "angular"
        }, undefined, { merges: null });

        let content = "";
        let hasError = false;
        changelogStream.on("error", err => {
            hasError = true;
            reject(new Error(`conventional changelog update failed: ${err.message}`));
        });

        changelogStream.on("data", buffer => {
            if (hasError) {
                return;
            }
            content += buffer.toString();
        });

        changelogStream.on("end", () => {
            if (hasError) {
                return;
            }

            // Insert release note after heading
            if (releaseNote) {
                const startHeadingIndex = content.indexOf("# ");
                if (startHeadingIndex !== -1) {
                    const endHeadingIndex = content.indexOf("\n", startHeadingIndex);
                    if (endHeadingIndex !== -1) {
                        content = content.substring(0, endHeadingIndex + 1) + "\n" +
                            releaseNote + "\n\n" + content.substring(endHeadingIndex + 1);
                    }
                }
            }

            // Replace 3 or more consecutive newlines by 2 newlines.
            // Note: generated code contains Linux LF characters even on Windows!
            content = content.replace(/\n{3,}/g, "\n\n");

            // Replace LF by platform specific newline character
            content = content.replace(/\n/g, osEndOfLine);

            fs.writeFileSync(changelog, oldHeader + content + oldContent, { encoding: "utf8" });
            resolve();
        });
    });
}
