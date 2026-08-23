# Changelog

## Unreleased

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
