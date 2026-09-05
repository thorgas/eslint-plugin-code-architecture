# Changelog

## 0.6.0-alpha.10

- Make `no-unasserted-return` check every call contributing to a returned local binding and reject postconditions invalidated by member writes using shared mutation analysis.
- Make `require-interactive-component-contract` treat unknown JSX spreads conservatively and honor attribute override order instead of inferring accessibility and disabled behavior.
- Document `allowedReturnCalls` as an explicit trusted-name exception and recommend receiver-specific patterns.

## 0.6.0-alpha.9

- Let `no-unasserted-return` accept narrow `allowedReturnCalls` minimatch patterns for return contracts that are already guaranteed by their API, such as standard boolean predicates, while keeping every unlisted call strict.

## 0.6.0-alpha.8

- Let `require-interactive-component-contract` trust configured primitives for press feedback only, and ignore noninteractive return paths during automatic detection while keeping explicitly named component owners strict on every JSX path.

## 0.6.0-alpha.7

- Make `require-contract-assertions` inspect `return await` and invalidate postconditions after direct writes to returned members or their owning object.
- Make `no-unasserted-return` follow a returned local binding back to its call initializer and require a dominating assertion of that binding.
- Make `require-interactive-component-contract` inspect the actual interactive element on every return path, require actual disabled wiring for every accepted unavailable prop, reject static style as press feedback, and support configured primitives nested beneath single-child providers.

## 0.6.0-alpha.6

- Let `require-interactive-component-contract` trust configured design-system roots through `contractComponents`. Feature wrappers inherit role, accessibility-state, and feedback ownership from those roots while still having to expose and forward their own disabled behavior and configurable content.

## 0.6.0-alpha.5

- Recognize `assertWorkletInvariant` as a built-in assertion helper across the assertion rules. This gives serialized Reanimated worklets an explicit invariant convention without requiring every consumer to repeat an `assertionNames` exception.

## 0.6.0-alpha.4

- Detect assertions structurally in `require-assertions`, `require-contract-assertions`, and `no-unasserted-return`: any call that resolves to an import from an assertion module (`assert`, `node:assert`, `tiny-invariant`, or any path ending in `assert`/`asserts`/`assertions`/`invariant`), a one-level local alias of it, or a same-file function with a TypeScript `asserts` predicate counts without configuration. `assertionNames` remains a textual fallback.
- Make `require-interactive-component-contract` work with no options: ship React Native and DOM defaults for role, state, disabled, feedback, and content attributes, detect interactive primitives structurally (a component whose rendered root, or single-wrapped child, carries `onPress`/`onClick`/`onPressIn`), accept `{...rest}` spread forwarding as a complete role/state/disabled contract, and follow one level of prop aliasing. `componentNames` is now an optional allow-list.
- Fix `no-over-depending` to resolve the `deps` parameter through scope analysis: destructuring, rest patterns, aliasing, and forwarding count as use, and nested functions with their own `deps` no longer cross-contaminate.
- Stop `prefer-arrow-functions` from reporting class methods, object methods, getters, setters, and constructors; document `allowedNames`/`allowedFiles` as migration baselines.
- Allow type arguments on the wrapped type in `dependency-wrapper-shape`.
- Narrow `declarative-components`: only JSX-returning functions are components, and `forbidInlineFunctions` reports only bound nested declarations, not JSX callbacks, array callbacks, or hook arguments.
- Require JSX-returning members in `require-compound-component-api`, recognize `Object.assign(Root, {...})` compounds in the compound rules, and make `no-root-owned-compound-parts` use the compound object's members as ground truth instead of name prefixes.
- Report re-exports of imported bindings in `no-barrel-files` and add `allowTypeExports`; detect directory index imports (`./feature`, `.`) in `no-barrel-imports` via the filesystem.
- Match `validationCalls` in `no-unvalidated-json-parse` as globs with `*.parse`, `*.safeParse`, `*.decode`, and similar defaults so schema-instance validators work; tolerate guard-only references before validation.
- Resolve Effect imports through scope in `effect-error-handling` (`import { Effect }`, namespace and named imports, aliases) and report silent `catchTag`/`catchTags` fallbacks including `Effect.succeed(null)`.
- Add pattern-based raw value detection to `no-raw-design-values` with default hex/rgb/hsl detection on color-like properties; detect conditional raw literals in `no-raw-design-properties`; resolve namespace JSX imports in `prefer-design-system-components`; resolve const style objects in `no-design-identity-overrides`.

## 0.6.0-alpha.3

- Redesign `no-implicit-external-dependencies` around built-in capability groups (`time`, `randomness`, `logging`, `environment`, `network`, `storage`, `locale`), all enabled by default. Custom `capabilities` now extend the built-ins instead of silently replacing them; narrow with `groups`. Selectors gain bare-global (`fetch`) and constructor (`new Date()`, `new WebSocket`) forms, global detection uses scope analysis so declared `globals` and type-only references behave correctly, and `create<Dependency>`/`createTest<Dependency>` factories are allowed automatically. **Breaking:** consumers that passed `capabilities` to replace the defaults must add `groups: []`.
- Redesign `no-exported-dependency-instances` to detect the concept it names: a module-level instance created at import time by a constructor or a factory verb (`create`, `make`, `build`, `init`, `open`, `connect`, …) and exported directly, by alias, or as the default export. Member factories, `Object.freeze`, `await`, and TypeScript casts are followed. Definition factories such as `createContext` and `StyleSheet.create` are ignored by default; tune with `ignoredFactories`, `factoryPattern`, and `compositionRoots`.
- Redesign `no-namespace-exports` to report only exported objects that bundle behavior (function members or references to functions) and exported TypeScript `namespace` declarations. Data objects such as configuration, lookup tables, migrations, and style objects are no longer reported, and PascalCase compound-component objects are allowed unless `allowCompoundComponents` is `false`.
- Add generic `dependencyInjection` and `conventions` presets. `evoluDependencyInjection` and `evoluConventions` remain as attribution aliases with identical rules.

## 0.6.0-alpha.2

- Add package/path exemptions to `named-imports` for APIs that require default or namespace imports.
- Fix `prefer-readonly-types` to recommend the built-in `Readonly<Record<K, V>>` shape and add contract-only collection enforcement for intentionally mutable implementation state.
- Add narrow framework, export, generator, hoisting, recursion, name, and file exemptions to `prefer-arrow-functions`.
- Make `top-down-declarations` preserve runtime initialization dependencies by default and support generated/framework file exemptions.
- Make `no-unasserted-return` evaluate each returned call independently, inspect conditional and logical return paths, and reuse production function eligibility options.

## 0.6.0-alpha.1

- Add shared production eligibility options to `require-contract-assertions` for callbacks, JSX, hooks, no-input closures, trivial constructors, delegates, statement thresholds, and assertion-helper implementations while keeping `agentReadiness` exhaustive.
- Require parameter preconditions to precede use and dominate the path to it; reject postconditions invalidated by later mutation.
- Reject vacuous self-comparisons and TypeScript-only checks hidden behind direct type aliases.
- Add redacted production-derived regression coverage for selectors, predicates, event delegates, React/XState-style framework callbacks, assertion helpers, and meaningful domain contracts.

## 0.6.0-alpha.0

- Add opt-in `evoluDependencyInjection` and `evoluConventions` presets derived from Evolu's dependency-injection and TypeScript convention guides.
- Add twelve syntax-only rules for dependency wrappers and arguments, lean dependency requirements, implicit external access, composition-root instances, named imports, unique exports, top-down declarations, arrow functions, readonly types, and interface-first object shapes.
- Exercise both Evolu presets through unit tests and the clean packed-package consumer smoke test.
- Add the opt-in `agentReadiness` preset, combining `strict` with assertion checks for empty, trivial, and expression-bodied functions.
- Add `require-contract-assertions` to require semantic runtime checks for every parameter binding and nontrivial return path without counting obvious checks already covered by explicit TypeScript annotations.

## 0.5.0

- Expand `require-assertions` with narrowly configurable exemptions for short direct callbacks, JSX components, React hooks, trivial constructors, and return-only factories; credit assertions inside thin wrapper closures; and optionally count guarded throws.
- Add the opt-in `no-unasserted-return` rule for assign-assert-return discipline, including strict checking for expression-bodied and unnamed delegates when configured.
- Add `allowedBarrels` to `no-barrel-imports` for explicitly approved relative and package barrels.

## 0.5.0-alpha.6

- Add the `no-unasserted-return` rule: in a function that contains no assertion, `return f(...)` and `return await f(...)` are reported with the fix of binding the result to a local, asserting its shape, and returning it - the assign-assert-return discipline. A function with any assertion is left alone, and `ignoreDelegates` (default true) exempts single-statement wrappers whose named callee carries the invariants. Excluded from every preset; adopt at `warn` first to measure.

## 0.5.0-alpha.5

- Add the opt-in `ignoreReactHooks` option to `require-assertions`, exempting custom hooks named with React's `use` + capital-letter-or-digit convention while continuing to check nested helpers and callbacks independently. Enabled in the `tigerstyle` and `strict` presets.

## 0.5.0-alpha.4

- Add the opt-in `countGuardedThrows` option to `require-assertions`: a `ThrowStatement` counts as one assertion when it is conditional - guarded by an `IfStatement` or a `ConditionalExpression` among its ancestors within the same function. This lets a validator that already fails loudly on untrusted input (`if (!isValid(x)) throw new Error(...)`) satisfy the density without a duplicate `assert()` next to it, which the rule's own docs already discourage. An unconditional throw (a stub), a rethrow inside a `catch`, and a throw inside a nested function still do not count. Enabled in the `tigerstyle` and `strict` presets.

## 0.5.0-alpha.3

- Add the opt-in `creditWrapperClosures` option to `require-assertions`: when a function's body is a single call that it hands a callback - `(args) => withAdmin(async (db) => {…})`, or a block ending in `setState((current) => {…})` - assertions written inside that callback count toward the wrapper too. Without it, putting the assertion where the work is left the wrapper reporting zero forever, so the rule argued against its own best placement. A function that computes on its own and merely calls something is not a wrapper and still owes its assertions. Enabled in the `tigerstyle` and `strict` presets.

## 0.5.0-alpha.2

- Extend `ignoreDirectCallbacks` in `require-assertions` to exempt a callback nested exactly one level inside an options-object argument (`stream(request, { onDone: () => {...} })`), while keeping variable-bound handler maps, two-levels-deep nesting, and array-member callbacks (XState actions) strict.
- Make `ignoreNoInputClosures` in `require-assertions` treat a zero-parameter `FunctionDeclaration` that only returns a value the same as the equivalent arrow form. A zero-parameter declaration that performs work still owes the postcondition that its work landed, and stays strict.
- Add the opt-in `ignoreJSXComponents` option to `require-assertions`, exempting a function that returns JSX — its preconditions are the typed props contract, and it renders rather than computes. Hooks and helpers that return data stay strict, and a component is judged by its own return rather than by a callback's. Enabled in the `tigerstyle` and `strict` presets, mirroring the existing `ignoreJSX` on `max-function-lines`.
- Add the opt-in `ignoreTrivialConstructors` option to `require-assertions`, exempting a class constructor whose body is only a `super(...)` call and/or `this.<field> = ...` assignments — enabled in the `tigerstyle` and `strict` presets.

## 0.5.0-alpha.0

- Add the opt-in `ignoreDirectCallbacks` option (with `directCallbackMaxStatements`, default 3) to `require-assertions`, and enable it in the `tigerstyle` and `strict` presets.
- Add the `allowedBarrels` path-glob option to `no-barrel-imports` for barrels a consumer deliberately keeps.

## 0.4.0

- Add five opt-in, configurable rules for design-system component adoption, token-only design properties, shared interactive contracts, dismissible transparent surfaces, and protected component identity.

## 0.4.0-alpha.3

- Let assertion-density presets exclude JSX callbacks and variable-bound zero-input orchestration closures while keeping XState actions, other call callbacks, boundary functions, and domain functions strict.

## 0.4.0-alpha.2

- Scope the preset 70-line function limit to logic functions by excluding functions that own JSX UI.

## 0.4.0-alpha.1

- Extend `no-raw-design-values` to configured JSX attributes while keeping runtime expressions and unconfigured attributes out of scope.

## 0.4.0-alpha.0

- Add the opt-in, consumer-configured `no-raw-design-values` rule for semantic design-token enforcement in object style properties.
- Support approved token files, narrow file/property/value exceptions, computed property keys, expression wrappers, and immutable local aliases without assuming a UI framework or token API.

## 0.3.0

- Repair the `composition` guardrails for component props, member slots, chained and optional collection mapping, aliases, structural variants, local helpers, wrapped Providers, and all-return-path children checks.
- Add the opt-in `lego` preset with positive exported compound API and consumer-owned usage enforcement.
- Document same-file and type-aware limits honestly; shared-state naming heuristics remain deliberately out of scope.

## 0.2.0

- Add an opt-in `composition` preset that keeps compound-component layout under consumer control.
- Detect prop-driven JSX assembly while allowing data mapping beneath a root or provider boundary.
- Require roots and providers to render children and prevent them from arranging their own compound parts.

## 0.1.1

- Recognize conservatively validated `JSON.parse` results in local bindings and Effect pipelines.
- Add complete ESLint plugin metadata with package name, namespace, and version.
- Exercise the packed tarball through a clean Node consumer in CI.
- Include the required TypeScript peer in TypeScript installation examples.
- Document incremental adoption and the post-`0.1.0` release workflow.

## 0.1.0

- Initial portable plugin with vertical architecture, TigerStyle, Effect, React, and runtime-safety rules.
- Flat-config presets for recommended, strict, TigerStyle, Effect, and declarative React usage.
- Library-specific Effect and React presets are opt-in and excluded from `strict`.
- Documented stable composition with Biome and Oxlint, with links to their official guidance.
- Manual first-release command plus trusted npm provenance publishing for subsequent GitHub releases.
