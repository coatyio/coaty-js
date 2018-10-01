# Framework Developer Notes

This document contains important notes for framework developers, regarding specific issues
and points to take care of.

## TypeScript version

Do not bump the `typescript` package version to a version later than `2.9.2`. Keep this version
as long as Angular apps (version 6) are restricted to use this version. If the Coaty framework code
is transpiled with a newer version, any Angular app using Coaty will throw an error at build
time, with typescript compiler complaining about a feature not yet supported:

`ERROR in node_modules/coaty/model/types.d.ts(5,42): error TS1039: Initializers are not allowed in ambient contexts.`

---
Copyright (c) 2018 Siemens AG. This work is licensed under a
[Creative Commons Attribution-ShareAlike 4.0 International License](http://creativecommons.org/licenses/by-sa/4.0/).
