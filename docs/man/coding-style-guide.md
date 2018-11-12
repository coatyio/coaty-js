---
layout: default
title: Coaty JS Documentation
---

# Coaty Coding Style Guide

These guidelines and principles shall provide a common basis for coding
Coaty framework components and application projects using TypeScript.

The coding guidelines are *obligatory* for TypeScript developers that contribute
to the Coaty framework. We strongly suggest that application developers shall
also follow these guidelines in their Coaty projects.

If you are new to TypeScript programming, we recommend to take a look at the official
[TypeScript website](http://www.typescriptlang.org/). Its "Playground" is especially useful
to interactively try some TypeScript code in your browser.

## Table of Contents

* [Linting TypeScript Code](#linting-typescript-code)
* [TypeScript Coding Guidelines](#typescript-coding-guidelines)
  * [Naming](#naming)
  * [Style](#style)
  * [undefined and null](#undefined-and-null)
  * [Comparison Operators](#comparison-operators)
  * [Variables](#variables)
  * [Strings](#strings)
  * [Destructuring](#destructuring)
  * [Functions](#functions)
  * [Classes and Methods](#classes-and-methods)
  * [Generic Types](#generic-types)
  * [External Modules](#external-modules)
  * [Components and Files](#components-and-files)
  * [Comments](#comments)
  * [Typings](#typings)
* [Coding Principles](#coding-principles)
  * [Asynchronous Data Flow](#asynchronous-data-flow)
  * [Container Components](#container-components)
  * [Object Models](#object-models)

## Linting TypeScript Code

The Coaty framework uses `TSLint` for linting the TypeScript code. The TS linter is
run automatically when building the framework distribution package with `npm run build`.

To build distribution packages but not lint the source code use `npm run build:nolint`.

You can also invoke the linter on its own: `npm run lint`.

To fix linting errors automatically, invoke `npm run lint:fix`.

Please ensure that the TypeScript files compile correctly *before* running the
linter.

The linter uses a recommended set of rules that conform with the TypeScript Coding
Guidelines for Coaty projects as described in the following section. These rules
are defined in the TSLint configuration file `tslint-config.json` which is part of
the framework's distribution package, so a Coaty application project can also use them
in its `tsconfig.json` file:

```ts
{
    "extends": "coaty/tslint-config",
    "rules": {
        // You may overwrite some rule settings here
    }
}
```

All available rules and options for TSLint are described
[here](https://palantir.github.io/tslint/).

You may enable/disable TSLint or a subset of rules within certain lines of a
TypeScript file with the following comment rule flags

```ts
/* tslint:disable-next-line:rule1 rule2 rule3... */

/* tslint:disable:rule1 rule2 rule3... */
...
/* tslint:enable:rule1 rule2 rule3... */
```

## TypeScript Coding Guidelines

### Naming

* Use whole words in names when possible.
* Use PascalCase for type names, such as classes, enums, interfaces.
* Use PascalCase for enum values.
* Use camelCase for function names.
* Use camelCase for property names and local variables.
* If a property is a boolean, name it `isVal()`, `hasVal()`, `shouldVal()`, or `canVal()`.
* Use a leading `_` for private properties and functions to distinguish their usage
  easily from public or protected ones in TS code or transpiled JS code.
* Do not use a leading `_` for protected or public properties and functions.
* Do not use `I` as a prefix for interface names that define objects.
* You can use `I` as a prefix for interface names that define call and property
  signatures in the classic sense as used in Java or C#.

### Style

* Use soft tabs set to **4** spaces (not 2 spaces, not tabs) to avoid inconsistencies due
  to different tab spacings in editors and to avoid Git whitespace merge conflicts.
* Use semicolons.
* Parenthesized constructs should have no surrounding whitespace.
  A single space follows commas, colons, and semicolons in those constructs.
  For example:
1. `for (var i = 0, n = str.length; i < 10; i++) { }`
2. `if (x < 10) { }`
3. `function f(x: number, y: string): void { }`
* Always surround loop and conditional bodies with curly braces.
* Open curly braces always go on the same line as whatever necessitates them.
* `else` goes on the same line as the `if` block's closing curly brace.
* `catch` goes on the same line as the `try` block's closing curly brace.
* Use indentation when making long method chains. Use a leading dot, which
  emphasizes that the line is a method call, not a new statement.
* End files with a single newline character.

### undefined and null

* Use `undefined`, do not use `null`. `typeof null` returns `"object"` which
  incorrectly suggests that `null` is an object (it isn’t, it’s a primitive value).
  This is an immanent bug in JavaScript language design.

### Comparison Operators

* Use `===`  and `!==`.
* Do not use `==`  and `!=`.

### Variables

* Use block-scoped (`const`, `let`) references wherever possible.
* Avoid using function-scoped references (`var`).
* Use `const` for all your references that should be immutable.
* Use `let` **only** if you must mutate a reference (e.g. a counter variable).
* Use one `const` or `let` declaration per variable.
* Group all your `const`s and then group all your `let`s.
* Use a single declaration per variable statement
 (i.e. use  `var x = 1; var y = 2;`  over  `var x = 1, y = 2;` ).

### Strings

* Use double quotes `""` for literal strings in TypeScript files. Double quotes
  are preferred over single quotes because JSON uses double quotes; double
  quotes are broadly used in programming; and double quotes look clearly different
  than backticks.
* In HTML, you should use backticks for strings in JavaScript code or Angular
  binding expressions. Within backticks you can continue using double quotes.
* When programmatically building up strings, use template strings (with
  backticks) instead of concatenation: `` `${firstName} ${lastName}` ``

### Destructuring

* Use object destructuring when accessing and using multiple properties of an object:
  `const { firstname, lastname } = user;`
* Use array destructuring: `const [first, , third] = array;`
* Use array spreads `...` to copy arrays: `[...array]`

### Functions

* Never use `arguments`, opt to use rest syntax  `...`  instead.
* Use default parameter syntax rather than mutating function arguments:
  `function(opts = {}) {}`
* Use arrow functions over anonymous function expressions. It creates
  a version of the function that executes in the context of `this`, which is
  usually what you want.
* Only surround arrow function parameters when necessary.
  For example, `(x) => x + x` is bad but the following are good:
1. `x => x + x`
2. `(x,y) => x + y`
3. `<T>(x: T, y: T) => x === y`
* If the function body fits on one line and there is only a single argument,
  feel free to omit the braces and parentheses, and use the implicit return.
  Otherwise, add the parentheses, braces, and use a `return` statement.

### Classes and Methods

* Always use `class`. Avoid manipulating `prototype` directly.
* Use `class extends` for inheritance.
* Methods can return `this` to help with method chaining.
* It's okay to write a custom `toString()` method, just make sure it works
  successfully and causes no side effects.
* Within a class, property members should precede constructor and method members.
  Within each group, public members should precede protected and private members.

### General Types

* Don’t ever use the types `Number`, `String`, `Boolean`, or `Object`. These types
  refer to non-primitive boxed objects that are almost never used appropriately in
  JavaScript code.
* Do use the types `number`, `string`, and `boolean`
* Instead of `Object`, use the non-primitive `object` type (added in TypeScript 2.2).

### Generic Types

* Use `T` for the type variable if only one is needed.
* When possible, allow the compiler to infer type of variables:
  Use `identity("myString");` instead of `identify<string>("myString");`.
* When creating factories using generics, be sure to include the constructor
  function in the type:
  `function create<T>(thing: {new(): T;}): T { return new thing(); }`.

### External Modules

* Use TS / ES6 external modules (`import`, `export`) over a non-standard
  module system.
* Prefer ES6 external module syntax over TS syntax: Use
  `import { Foo } from "module";` instead of
  `import Foo = require("module");`.
* Never use TS internal modules (i.e. namespaces). They are not useful
  in combination with external modules.
* In a Coaty **application project**, always import from a toplevel module, not 
  from submodules, i.e. not from individual files.
* In the Coaty framework, always import from individual TS files, not toplevel modules.
* In the Coaty framework, only export public types in modules. Do not export
  types in modules that are internal or private to the framework.
* Group import statements in the following order and separate them by an
  empty line:
1. Imports from npm modules used by the framework.
2. Imports from framework modules in other toplevel modules.
3. Imports from framework modules in the same toplevel module.
* In RxJS, do not use the deprecated coding style of chaining operators, but use the
  pipeable operator syntax and import RxJS operators individually:
  `import { map, take } from "rxjs/operators";`

### Components and Files

* One file per logical component.
* Within a file, type definitions should come first.
* Your files should use lower-dash naming so we don't worry about case
  sensitivity on the server or in source control.
* If your file exports a single class, your filename should correspond to
  the name of the class, e.g. the filename for `class FooBar` should be
  `foo-bar.ts`.
* In your Angular or Ionic application projects, use consistent naming
  following the Angular Styleguide as defined [here](https://angular.io/guide/styleguide).
  For example, the filename of a component named `TaskRequestComponent`
  should be `task-request.component.ts`.

### Comments

* Use JSDoc style comments for *public* functions, interfaces, enums, and classes:
  `/** ... */`. Include a description, specify types and values for all
  parameters and return values.
* Use ``//`` for single line comments. Place single line comments on a newline
  above the subject of the comment. Put an empty line before the comment.
* Prefixing your comments with `FIXME` or `TODO` or `HACK` helps other
  developers quickly understand if you're pointing out a problem that needs to
  be revisited, or if you are suggesting a solution to the problem that needs
  to be implemented, or if you are explaining the reason for a workaround.
  These are different than regular comments because they are actionable.
  The actions are `FIXME -- need to figure this out` or
  `TODO -- need to implement` or `HACK -- reason for`. You can also
  append the short name of the person who is responsible: `TODO(HHo)`.

### Typings

* If you embed external typings (.d.ts declaration files) into your project,
  ensure that the type definitions are wrapped in a `declare module "<name>"`
  statement and that exports are properly defined. Old-style typings often miss this
  convention so that the TypeScript compiler complains with a `Cannot find module`
  error.
* Use npm @types packages to import external typings as dev dependencies into your
 project.

## Coding Principles

Framework developers who are implementing new framework components must
strictly follow the coding principles listed below:

### Asynchronous Data Flow

* Asynchronous date flow between components should be modelled using RxJS
  observables. An introduction to Reactive Programming can be found
  [here](http://reactivex.io/). Examples and explanations can be found on
  the [Learn RxJS](https://www.learnrxjs.io/) website.

* In RxJS, use pipeable operator syntax. Import only those RxJS operators that you
  actually use in your code, e.g. `import { map, take } from "rxjs/operators";`.
  Do not load the whole operator bundle, it consumes a lot of memory.

* Whenever you subscribe to an RxJS observable in your code explicitely, you
  should consider to keep the subscription in order to unsubscribe when the
  observable is no longer used to avoid memory leaks. For example,
  in an Angular or Ionic view component you should unsubscribe at the
  latest when the component is destroyed by implementing the `OnDestroy`
  interface or the Ionic `ionViewWillUnload` method. As an alternative
  you can use observables in Angular data binding expressions in combination
  with the `async` pipe which subscribes and unsubscribes automatically. In your
  application-specific controllers usually you should subscribe in the
  `onCommunicationManagerStarting` hook method and unsubcribe in the
  `onCommunicationManagerStopping` hook method.

* Avoid using the RxJS `share` operator in combination with source
  observables that are realized as *behavior subjects*. Only the first subscriber
  of the shared observable will be pushed the initial value of the behavior subject
  immediately when subscribed. Any subsequent subscribers will **not** get
  the initial value replayed when subscribed but only the next values which the
  subject emits lateron. That is because the `share` operator returns a hot
  observable.

* The unified persistent storage and retrieval API of the framework is based on
  promises. When using promise-based APIs to invoke multiple asynchronous operations
  in sequence, it is best practice to use composing promises and promise chaining.
  Note that after a catch operation the promise chain is restored. Avoid the
  common bad practice pattern of nesting promises as if they were callbacks.

### Container Components

* If a component encounters a transient error this error must be caught and
  handled internally. The component must not throw transient errors to callers. You may
  decide to log errors and report them to dependent components using e.g. an error
  emitting observable, a rejected promise, or an error callback.

* You should throw an error in the component's constructor if the passed in
  arguments are invalid or the component cannot start its lifecycle with the
  provided configuration parameters.

* Note that the `onDispose` method of container components is only called
  when the container is shut down by invoking the `shutdown` method. You should
  not perform important side effects in `onDispose`, such as saving application
  state persistently, because the `onDispose` method is not guaranteed to be called
  by the framework in every circumstance, e.g., when the application process
  terminates abnormally or when the `shutdown` method is not called by your app.

### Object Models

* Coaty framework objects are defined as interfaces, not classes, deriving from
  `CoatyObject`. The reason is that Objects are transferred as JSON event data
  between distributed system components. Define your own custom object type
  extending `CoatyObject` or one of its subinterfaces. Specify a unique canonical
  object type name in the property `objectType`. Do not use class instances
  as property values of your custom object types because class instances cannot
  be serialized correctly, as they are serialized as pure JavaScript objects
  without prototype information.

* Whenever you add new core object types to the framework, ensure that the
  new interface type is added to the `CoreTypes` class and the `CoreType` type
  definition (see `model/types.ts`).

* Whenever an object ID of a `CoatyObject` is hardcoded (e.g. in a config file), use
  a Version 4 UUID generator to ensure the generated UUID is unique.
  An online generator can be found [here](https://www.uuidgenerator.net).
  Ensure that in the string representation of a UUID the hexadecimal values "a"
  through "f" are output as lower case characters. Never use UUIDs which contain
  uppercase characters because external components such as databases could
  automatically convert such a UUID (used e.g. as a primary key) to lowercase
  which results in mismatches on retrieval.

---
Copyright (c) 2018 Siemens AG. This work is licensed under a
[Creative Commons Attribution-ShareAlike 4.0 International License](http://creativecommons.org/licenses/by-sa/4.0/).
