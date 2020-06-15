# Contributing to Coaty JS Framework

Contributions to the Coaty JavaScript framework are welcome and appreciated.
If you wish to contribute please follow the guidelines described in this document.

## Table of Contents

* [Workflow](#workflow)
* [Automatic versioning and changelog management](#automatic-versioning-and-changelog-management)
* [Copyright Notice](#copyright-notice)
* [Coding Style](#coding-style)
* [Developer Notes](#developer-notes)
* [Build Coaty framework](#build-coaty-framework)
* [Generate Coaty framework documentation](#generate-coaty-framework-documentation)
* [Test Coaty framework](#test-coaty-framework)
* [Release Coaty framework](#release-coaty-framework)
  * [Prepare a release](#prepare-a-release)
  * [Push a release](#push-a-release)
  * [Publish a release](#publish-a-release)

## Workflow

Contributions should be incorporated into the repository using pull requests on
a separate branch. We use the [GitHub Pull Request Workflow](https://guides.github.com/introduction/flow/).
The mentioned link is the recommended documentation to read and understand this workflow.

## Automatic versioning and changelog management

We are using the [Conventional Commits Style](https://conventionalcommits.org/)
for our [commit
messages](https://www.conventionalcommits.org/en/v1.0.0/#summary):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Conventional Commits Style helps structuring Git commit messages in a way that
allows automatic generation of changelogs. These conventions form the basis for
automatic version bumping and CHANGELOG management when cutting a new release.

For details, see the section [Release Coaty framework](#release-coaty-framework) below.

## License and Copyright Notice

Coaty JS source code is licensed under the [MIT License](https://opensource.org/licenses/MIT).
Attach a license and copyright notice to the top of each created source files as follows:

```ts
/*! Copyright (c) <year> <contributor>. Licensed under the MIT License. */
```

`<year>` specifies the year of *first* publication and must *not* be changed
when you modify the contents of the file later on. Do *not* add additional
copyright notices or dates when the work is revised at a future time.

Contributions without this header on each new source file won't be accepted.

The meaning of source file covers all files, which allow adding a comment
easily (e.g. `.js`, `.ts`, `.css`) and contribute to the core value of the
project by adding originality (e.g. no `.editorconfig`, etc.).

Documentation and media work (such as icons) should be licensed under
a [Creative Commons Attribution-ShareAlike 4.0 International License](http://creativecommons.org/licenses/by-sa/4.0/)
(CC BY-SA 4.0).

## Coding Style

Please ensure that all your contributions are aligned to our obligatory
[Coding Style Guide](https://coatyio.github.io/coaty-js/man/coding-style-guide/).

The framework includes a custom linter configuration that conforms to our
style guide and should also be used in Coaty application projects.

## Developer Notes

Please take a look at the `DEVNOTES.md` file in the project root folder. It
contains important notes for framework developers, regarding specific issues
and points to take care of.

## Build Coaty framework

Install the project's dependendies on the root folder:

```sh
npm install
```

**Note:** Peer dependencies will be installed automatically because they have
also been defined as devDependencies (for executing the framework's tests).

The following npm scripts are used to control the build process:

```sh
npm run build         - Build distribution package and lint the source code
npm run build:nolint  - Build distribution package but do not lint the source code
npm run lint          - Lint TypeScript source files
```

The `build` command generates an ECMAScript ES5 distribution package under `dist`
by running the TypeScript compiler on the TypeScript source files under `/ts`.

Builds include inline source maps in the generated JS files and have comments
included. When bundling the framework into an application project, source maps and
comments can be removed by applying appropriate tools.

## Generate Coaty framework documentation

```sh
npm run doc           - Generate HTML documentation from source code
```

Execute `npm run doc` to generate HTML documentation from the TypeScript
source code and the included JavaDoc comments. The generated documentation
is written to the `docs/api/` folder and accessible by `index.html`.

## Test Coaty framework

The framework test suite contains unit, component and E2E integration tests:

```sh
npm run test        - Run the test suite on the current build
npm run test:debug  - Run the test suite on the current build with verbose output
```

Before running the test suites, build the framework.
Test output is written to the console. Additionally, a JUnit XML output file
is written to be used when running in a CI environment such as Jenkins.
By default, the JUnit XML file is written to the `test/reports` folder.

For CI environments you can adjust the test configurations by modifying
the npm `config` settings provided in the framework's `package.json`.
The default values provided here can be overwritten by
`npm config set <key> <value>`.

```
test_config          Jasmine config options
test_broker_config   the Coaty MQTT broker config (for MQTT binding only)
test_reports_dir     where JUnit XML output is written
```

The test suite performs E2E communication messaging tests using the Coaty broker
that is installed as a local npm dev dependency. The broker's options are
configured in `./test/support/broker.config.json`. To avoid collisions with
other brokers running on the local machine, the test broker listens to MQTT port
1898 and http/ws port 9898 (typically brokers use 1883/9883 by default). Note
that the broker is only running while the test suite is executed.

To support debugging of communication-related tests use the `test:debug` target.
Any published and subscribed messages are logged to the console by the broker.

## Release Coaty framework

The release process separates local steps that only affect the local git repo
from remote steps that affect the repository and the npm registry:

1. `npm run cut-release` - prepare a new release, including automatic versioning,
  conventional changelog and tagging.
2. `npm run push-release` - push the prepared release to the remote git repo
3. `npm run publish-release` - publish the package on npm registry.

### Prepare a release

To prepare a new release locally on the current branch, run the `cut-version`
npm run script. It

1. computes a new package version and bumps it,
2. builds the distribution packages and generates HTML documentation,
3. updates the CHANGELOG with release information from the conventional commits,
4. commits all pending changes,
5. creates an annotated git tag with the new release version.

```sh
npm run cut-release (recommended | first | major | minor | patch | <semantic version>) ["<release note>"]

// examples
npm run cut-release patch
npm run cut-release recommended "This is a release note."
npm run cut-release 2.0.0-beta.3 "This is another release note."
```

If supplied with `recommended`, a recommended version bump is computed based
on conventional commits. An error is reported, if the recommended version
cannot be computed because there are no commits for this release at all.

If supplied with `first`, the package version is bumped to the current version
specified in package.json.

If supplied with `major`, `minor`, or `patch`, the package version is
incremented to the next major, minor, or patch version, respectively.

If supplied with a valid semantic version (e.g. `1.2.3` or `1.2.3-beta.5`)
this version is bumped. You can also use this option to create a prerelease.

In any of the above cases except `first`, an error is reported if the
new version to be bumped is equal to the current package version.

**Note**: the auto-generated release information in the CHANGELOG only includes
`feat`, `fix`, and `perf` conventional commits. Non-conventional commits are *not*
included. Other conventional commit types such as `docs`, `chore`, `style`, `refactor`
are *not* included. However, if there is any `BREAKING CHANGE`, this commit will
*always* appear in the changelog.

**Note**: if you want to edit the auto-generated CHANGELOG afterwards, you should
amend this change to the last commit (`git commit --amend`). Ensure that the tag set with
the last commit is re-added by calling `git tag -a -f -m "chore(release): v<new-version>" v<new-version>`
where `<new-version>` is substituted by the new package version number.

If supplied with an optional release note, the given text is prepended to the release
information generated by conventional commits. The text should consist of whole sentences.

### Push a release

After executing the `cut-release` npm run script, the new release commits and
the release tag on the current branch are ready to be pushed to the remote git
repo server.

```sh
npm run push-release
```

Afterwards, depending on your GIT workflow, you can merge your remote branch
into master.

Note that the `push-release` script may error because the git private key authentication
has not been set up properly. In this case, you can perform this step manually using your
preferred GIT client. Do **NOT** forget to push the release tag, too. You can push both
the release commits and the annotated tag by executing `git push --follow-tags`.

### Publish a release

To publish the framework distribution package to an npm registry, you can use the
following script:

```sh
npm run publish-release [npm-tag]
```

If supplied with `npm-tag`, the published package is registered with the given tag,
such that `npm install <package>@<npm-tag>` will install this version. If not supplied
with `npm-tag`, the `latest` tag is registered. In this case, `npm install` installs
the version tagged with `latest`.

Note that authentication is required for publishing, so you need to set up an
appropriate account at the npm registry server first. Then, create an npm
authentication token (on npm website or by invoking `npm adduser`) and
paste the created authentication information into your `~/.npmrc`.

---
Copyright (c) 2018 Siemens AG. This work is licensed under a
[Creative Commons Attribution-ShareAlike 4.0 International License](http://creativecommons.org/licenses/by-sa/4.0/).
