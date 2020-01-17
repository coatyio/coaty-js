---
layout: default
title: Coaty JS Documentation
---

# Coaty JS Migration Guide

The jump to a new major release of Coaty involves breaking changes to the Coaty
JS framework API. This guide describes what they are and how to update your
Coaty JS application to comply with the new release.

## Coaty v1 -> Coaty v2

The primary goal of Coaty v2 is to streamline the framework API, as well as to
get rid of unused and deprecated functionality. Coaty v2 also prepares for
so-called "communication bindings", a mechanism to make the publish-subscribe
messaging protocol that Coaty uses internally interchangeable.

Among others, Coaty v2 carries breaking changes regarding package naming and
import declarations, IO routing, and the communication protocol. Therefore,
Coaty v2 applications are no longer backward-compatible and interoperable with
Coaty v1 applications. However, the essential set of communication event
patterns didn't change.

To update to Coaty v2, follow the migration steps described next.

---
Copyright (c) 2020 Siemens AG. This work is licensed under a
[Creative Commons Attribution-ShareAlike 4.0 International License](http://creativecommons.org/licenses/by-sa/4.0/).
