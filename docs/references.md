# References and attribution

These rules adapt published engineering guidance; they do not claim those ideas as original work. Each mechanically enforceable idea links back to its source from the rule metadata and rule page.

| Source | Rules influenced |
| --- | --- |
| ESLint, [Create Plugins](https://eslint.org/docs/latest/extend/plugins) | Portable plugin API, flat-config presets, and rule metadata |
| Sindre Sorhus and contributors, [eslint-plugin-unicorn](https://github.com/sindresorhus/eslint-plugin-unicorn) | Repository structure, per-rule documentation, testing, and release ergonomics |
| TigerBeetle, [TigerStyle](https://tigerstyle.dev/) and [full style guide](https://github.com/tigerbeetle/tigerbeetle/blob/main/docs/TIGER_STYLE.md) | `require-assertions`, `max-function-lines`, `max-function-parameters`, `imports-first` |
| Marvin Hagemeister, [The barrel file debacle](https://marvinh.dev/blog/speeding-up-javascript-ecosystem-part-7/) | `no-barrel-files`, `no-barrel-imports` |
| TkDodo, [The Vertical Codebase](https://tkdodo.eu/blog/the-vertical-codebase) | `enforce-module-boundaries` |
| Sandro Maglione, [Components take care of themselves](https://www.sandromaglione.com/newsletter/components-take-care-of-themselves) | `declarative-components` |
| Fernando Rojo, [Composition is all you need](https://www.youtube.com/watch?v=4KvbVq3Eg5w) and [Composition Pattern Guide](https://github.com/francostan/composition-pattern-starter/blob/main/docs/Pattern.md) | The three portable composition rules plus `require-compound-component-api` and `require-consumer-owned-compound-usage` in the stricter `lego` preset |
| Vercel, [Composition](https://www.components.build/composition) | `prefer-composition-over-configuration`, `require-composable-root-children`, `no-root-owned-compound-parts` |
| Effect, [project website](https://effect.website/) and [LLM standards](https://effect.website/llms-full.txt) | `effect-error-handling`, `no-unvalidated-json-parse`, `no-unsafe-type-assertions` |
| Paul J. Philp, [Effect Patterns](https://github.com/PaulJPhilp/EffectPatterns/tree/main/rules) | `effect-error-handling` |
| [Effect by Example](https://effectbyexample.com/) | `effect-error-handling`, `no-unvalidated-json-parse` |
| Michael Arnaldi, [Effect guide](https://github.com/mikearnaldi/accountability/blob/main/specs/guides/effect-guide.md) | Effect error, schema, and dependency-injection policies |
| Michael Arnaldi, [error-tracker specification](https://github.com/mikearnaldi/accountability/blob/main/specs/completed/error-tracker.md) | `effect-error-handling` |
| Evolu, [Dependency Injection](https://www.evolu.dev/docs/dependency-injection) | `dependency-wrapper-shape`, `dependency-parameter-convention`, `sort-dependency-types`, `no-over-depending`, `no-exported-dependency-instances`, `no-implicit-external-dependencies` |
| Evolu, [Conventions](https://www.evolu.dev/docs/conventions) | `named-imports`, `no-namespace-exports`, `top-down-declarations`, `prefer-arrow-functions`, `prefer-readonly-types`, `prefer-interface-over-type` |

The originating project also references SurrealDB's [schema creation best practices](https://surrealdb.com/docs/surrealdb/reference-guide/schema-creation-best-practices) and [sample industry schemas](https://surrealdb.com/docs/surrealdb/reference-guide/sample-industry-schemas). Those guides require domain-aware schema review and are not represented as generic AST rules; linking them here preserves attribution without pretending a syntax check can enforce database design quality.

[Evalite](https://evalite.dev/), [Agent Skills](https://agentskills.io/), and [Cursor Skills](https://cursor.com/docs/context/skills) are project tooling references rather than sources for a lint policy, so no rule is attributed to them.

## Toolchain interoperability

The README's combined-tooling example follows the official [Biome getting-started guide](https://biomejs.dev/guides/getting-started/), [Biome domain documentation](https://biomejs.dev/linter/domains/), [Oxlint configuration guide](https://oxc.rs/docs/guide/usage/linter/config.html), [Oxlint JavaScript-plugin status](https://oxc.rs/docs/guide/usage/linter/js-plugins.html), and [Oxlint incremental migration guidance](https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint.html). These tools complement the plugin; they are not sources for its architecture policies.
