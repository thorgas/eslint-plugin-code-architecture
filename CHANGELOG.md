# Changelog

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
