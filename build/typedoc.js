/*! Copyright (c) 2018 Siemens AG. Licensed under the MIT License. */

// Typedoc options (execute "npx typedoc --help")

module.exports = {

    // Can be used to prevent TypeDoc from cleaning the output directory specified with --out.
    cleanOutputDir: false,

    // Define a (minimatch glob) pattern for excluded files when specifying paths.
    exclude: "test/**/*.ts",

    // Prevent externally resolved TypeScript files from being documented.
    excludeExternals: false,

    // Prevent private members from being included in the generated documentation.
    excludePrivate: true,

    // Ignores protected variables and methods
    excludeProtected: false,

    // Add the package version to the project name
    includeVersion: true,

    readme: "none",

};
