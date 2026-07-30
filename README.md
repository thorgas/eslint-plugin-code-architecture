# eslint-plugin-code-architecture

Portable ESLint rules that turn architectural decisions into fast, local feedback for humans and coding agents.

The plugin combines five ideas:

- [TigerStyle](https://tigerstyle.dev/): explicit limits, assertion density, small interfaces, and visible error handling.
- [The Vertical Codebase](https://tkdodo.eu/blog/the-vertical-codebase): high-cohesion verticals with explicit dependency direction and public surfaces.
- [Components take care of themselves](https://www.sandromaglione.com/newsletter/components-take-care-of-themselves): strict lint feedback that keeps UI components declarative.
- [Composition is all you need](https://www.youtube.com/watch?v=4KvbVq3Eg5w): compound components whose consumers control the child hierarchy.
- [Evolu's TypeScript guides](https://www.evolu.dev/docs/dependency-injection): explicit dependency passing and consistent, top-down module conventions.

It is ESM-only, supports ESLint flat config, and does not require type-aware linting.

See [References and attribution](docs/references.md) for the source material behind each policy. Rule pages link directly to the work they adapt.

## Install

```sh
npm install --save-dev eslint eslint-plugin-code-architecture typescript typescript-eslint
```

## Quick start

```js
// eslint.config.js
import architecture from "eslint-plugin-code-architecture";
import tseslint from "typescript-eslint";

const integrations = [
  // Add only when Effect is installed and used:
  // ...architecture.configs.effect,
  // Add only when React is installed and used:
  // ...architecture.configs.react,
  // Add for compound components whose consumers should own layout:
  // ...architecture.configs.composition,
  // Add only to files that implement or consume strict LEGO object APIs:
  // ...architecture.configs.lego,
  // Add when adopting Evolu's dependency-injection convention:
  // ...architecture.configs.evoluDependencyInjection,
  // Add when adopting Evolu's broader TypeScript conventions:
  // ...architecture.configs.evoluConventions,
];

export default tseslint.config(
  ...architecture.configs.strict,
  ...integrations,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { parser: tseslint.parser },
  },
);
```

Presets are flat-config arrays and fall into two groups:

- Library-agnostic: `recommended`, `tigerstyle`, `strict`, and `agentReadiness`. The `strict` preset combines `recommended` and `tigerstyle`; `agentReadiness` strengthens `strict` with per-function runtime contracts.
- Optional library and architecture integrations: `effect`, `react`, `composition`, `lego`, `evoluDependencyInjection`, and `evoluConventions`. These are deliberately excluded from `strict`; enable them only when the corresponding library and conventions are used.

## Adopt incrementally in an existing codebase

The presets describe a target state and intentionally report every violation. On an established codebase, enable a small baseline first, repair its findings, and then promote additional rules one at a time. Library integrations remain opt-in throughout the rollout.

```js
import architecture from "eslint-plugin-code-architecture";
import tseslint from "typescript-eslint";

export default tseslint.config({
  files: ["src/**/*.{ts,tsx}"],
  languageOptions: { parser: tseslint.parser },
  plugins: { "code-architecture": architecture },
  rules: {
    "code-architecture/no-unsafe-type-assertions": "error",
    "code-architecture/no-unvalidated-json-parse": "warn",
  },
});
```

Once warnings are resolved, change them to errors and add the next rule. Apply `effect`, `react`, or `composition` only to files that use the corresponding library or architecture. Project-specific rules such as `enforce-module-boundaries` and `centralize-domain-literals` still require explicit domain configuration.

## Using Biome and Oxlint alongside the plugin

[Biome](https://biomejs.dev/guides/getting-started/) and [Oxlint](https://oxc.rs/docs/guide/usage/linter/quickstart) can handle formatting and broad, high-speed linting while ESLint runs only the architectural rules that remain specific to this plugin. Teams can use either tool or both; this example uses both:

```sh
npm install --save-dev --save-exact @biomejs/biome
npm install --save-dev oxlint eslint eslint-plugin-code-architecture typescript typescript-eslint
```

Create `biome.json` using the [Biome configuration guide](https://biomejs.dev/guides/getting-started/#configuration). Keep library domains opt-in as well; for example, Biome's [React domain](https://biomejs.dev/linter/domains/#react) should only be enabled in a React project:

```json
{
  "formatter": { "enabled": true },
  "linter": {
    "enabled": true,
    "domains": { "project": "recommended" }
  }
}
```

Oxlint works without configuration. If a committed config is preferred, initialize one with `npx oxlint --init`; see the official [Oxlint configuration documentation](https://oxc.rs/docs/guide/usage/linter/config.html).

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json"
}
```

Use separate commands so each tool has a clear responsibility:

```json
{
  "scripts": {
    "lint": "npm run lint:biome && npm run lint:oxlint && npm run lint:architecture",
    "lint:biome": "biome check .",
    "lint:oxlint": "oxlint .",
    "lint:architecture": "eslint .",
    "format": "biome check --write ."
  }
}
```

Oxlint also has an [alpha JavaScript-plugin compatibility layer](https://oxc.rs/docs/guide/usage/linter/js-plugins.html). This example intentionally keeps `eslint-plugin-code-architecture` on ESLint's stable plugin API and follows Oxlint's documented [incremental migration approach](https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint.html): run fast general checks first, then ESLint for custom rules.

## Architecture boundaries

Verticals are deliberately configured by the consuming application because domain names and dependency direction are project-specific:

```js
import architecture from "eslint-plugin-code-architecture";

export default [
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { architecture },
    rules: {
      "architecture/enforce-module-boundaries": [
        "error",
        {
          modules: [
            {
              name: "checkout",
              pattern: "src/checkout/**",
              allow: ["catalog"],
            },
            {
              name: "catalog",
              pattern: "src/catalog/**",
              public: ["**/*.api.*", "**/*.service.*"],
            },
          ],
          allowPrivateImportsFrom: ["src/runtime/**"],
        },
      ],
    },
  },
];
```

This supports relative imports and configurable aliases. Cross-vertical imports must follow each source vertical's `allow` list and each target vertical's `public` patterns. Composition roots can be granted explicit private access.

## Domain vocabulary

ESLint visits files independently, so a reliable “literal appears in two files” rule cannot aggregate whole-program state. `centralize-domain-literals` instead requires the project to declare its fixed vocabulary and approved constants files. This deterministically enforces the stronger rule from the first use.

```js
"architecture/centralize-domain-literals": [
  "error",
  {
    constantsFiles: ["src/constants.ts"],
    literals: [
      { value: "completed", replacement: "JOB_STATUS.COMPLETED" },
      { value: "ollama", replacement: "AI_PROVIDERS.OLLAMA" },
    ],
  },
]
```

## Library-agnostic rules

| Rule | Purpose | Preset |
| --- | --- | --- |
| [`centralize-domain-literals`](docs/rules/centralize-domain-literals.md) | Keep fixed vocabulary in constants modules | Configure |
| [`enforce-module-boundaries`](docs/rules/enforce-module-boundaries.md) | Enforce vertical dependency direction and public surfaces | Configure |
| [`imports-first`](docs/rules/imports-first.md) | Keep dependencies at the top of a module | `recommended` |
| [`max-function-lines`](docs/rules/max-function-lines.md) | Enforce the 70-line TigerStyle limit | `recommended`, `tigerstyle` |
| [`max-function-parameters`](docs/rules/max-function-parameters.md) | Bound positional inputs | `recommended`, `tigerstyle` |
| [`no-barrel-files`](docs/rules/no-barrel-files.md) | Disallow re-export barrels | `recommended` |
| [`no-barrel-imports`](docs/rules/no-barrel-imports.md) | Require concrete module imports | `recommended`, `effect` |
| [`no-unsafe-type-assertions`](docs/rules/no-unsafe-type-assertions.md) | Ban casts and non-null assertions | `recommended` |
| [`no-unvalidated-json-parse`](docs/rules/no-unvalidated-json-parse.md) | Require runtime validation around JSON parsing | `recommended` |
| [`require-assertions`](docs/rules/require-assertions.md) | Require assertion density in functions | `tigerstyle` |
| [`require-contract-assertions`](docs/rules/require-contract-assertions.md) | Assert every runtime parameter and returned value beyond its TypeScript type | `agentReadiness` |

## Agent readiness

`agentReadiness` is the most mechanically strict library-agnostic preset. It includes every `strict` rule and configures assertion enforcement for code produced or maintained by coding agents:

- Every function, including concise arrows and otherwise trivial functions, contains at least two recognized runtime assertions.
- Every runtime parameter binding is referenced by at least one semantic assertion.
- Every nontrivial returned value is covered by a semantic assertion that dominates that return path.
- Obvious checks already expressed by an explicit TypeScript annotation do not satisfy the parameter or return contract.

```js
export default [
  ...architecture.configs.agentReadiness,
];
```

This preset is intentionally demanding. A computed return should normally be assigned to a local binding, checked with a postcondition, and then returned. Statically evident returns such as literals, JSX, and function values do not need a separate return assertion, but the function still needs the two assertions required by `require-assertions`.

## Optional integrations

These presets are never enabled by `recommended`, `tigerstyle`, or `strict`.

| Ecosystem | Preset behavior | Enable when |
| --- | --- | --- |
| Effect | [`effect-error-handling`](docs/rules/effect-error-handling.md) plus [`no-barrel-imports`](docs/rules/no-barrel-imports.md) configured for `effect` and `@effect/platform` | The project installs and uses Effect |
| React | [`declarative-components`](docs/rules/declarative-components.md) | The project installs and uses React with declarative component conventions |
| Composition guardrails | [`prefer-composition-over-configuration`](docs/rules/prefer-composition-over-configuration.md), [`require-composable-root-children`](docs/rules/require-composable-root-children.md), and [`no-root-owned-compound-parts`](docs/rules/no-root-owned-compound-parts.md) | Consumers should control the existence, order, repetition, and nesting of UI parts |
| LEGO compound APIs | The `composition` rules plus [`require-compound-component-api`](docs/rules/require-compound-component-api.md) and [`require-consumer-owned-compound-usage`](docs/rules/require-consumer-owned-compound-usage.md) | Selected files use the public object-namespace Provider/Root-and-parts convention |
| Evolu dependency injection | Six rules implementing Evolu's wrapper, `deps`, ordering, lean-dependency, implicit external-access, and composition-root guidance | The project adopts Evolu's argument-based dependency-injection convention |
| Evolu conventions | Six rules for named imports, unique exports, top-down order, arrows, immutability, and interfaces | The project adopts Evolu's TypeScript conventions |

## Evolu dependency injection and conventions

The two Evolu presets are direct, opt-in adaptations of Evolu's [Dependency Injection](https://www.evolu.dev/docs/dependency-injection) and [Conventions](https://www.evolu.dev/docs/conventions) pages:

| Rule | Source behavior | Preset |
| --- | --- | --- |
| [`dependency-wrapper-shape`](docs/rules/dependency-wrapper-shape.md) | Wrap dependencies as distinct, readonly `*Dep` interfaces | `evoluDependencyInjection` |
| [`dependency-parameter-convention`](docs/rules/dependency-parameter-convention.md) | Accept dependencies through one argument named `deps` | `evoluDependencyInjection` |
| [`sort-dependency-types`](docs/rules/sort-dependency-types.md) | Sort combined dependency wrappers alphabetically | `evoluDependencyInjection` |
| [`no-over-depending`](docs/rules/no-over-depending.md) | Require only dependencies the function uses | `evoluDependencyInjection` |
| [`no-exported-dependency-instances`](docs/rules/no-exported-dependency-instances.md) | Keep created instances in the composition root | `evoluDependencyInjection` |
| [`no-implicit-external-dependencies`](docs/rules/no-implicit-external-dependencies.md) | Route time, logging, and configured service locators through dependencies | `evoluDependencyInjection` |
| [`named-imports`](docs/rules/named-imports.md) | Use named imports | `evoluConventions` |
| [`no-namespace-exports`](docs/rules/no-namespace-exports.md) | Export unique members instead of object namespaces | `evoluConventions` |
| [`top-down-declarations`](docs/rules/top-down-declarations.md) | Put public contracts before implementation details | `evoluConventions` |
| [`prefer-arrow-functions`](docs/rules/prefer-arrow-functions.md) | Use arrows except for TypeScript overloads | `evoluConventions` |
| [`prefer-readonly-types`](docs/rules/prefer-readonly-types.md) | Use readonly interface properties and collections | `evoluConventions` |
| [`prefer-interface-over-type`](docs/rules/prefer-interface-over-type.md) | Use interfaces until a type-only feature is needed | `evoluConventions` |

The implementation stays syntax-only and documents the places where cross-file type resolution would be required. `evoluConventions` deliberately conflicts with namespace-object APIs, including files governed by the optional `lego` preset; scope those presets to different files.

`no-implicit-external-dependencies` defaults only to the external capabilities shown by Evolu: `Date.now` maps to `TimeDep`, and `console.*` maps to `LoggerDep`. Configure project-specific service locators such as database instances explicitly rather than relying on naming guesses.

## Consumer-owned composition

The `composition` preset provides portable architectural guardrails: a root may coordinate state and infrastructure, but the consumer owns the child hierarchy. It catches statically visible prop-driven hierarchy assembly, requires every top-level boundary return to reference children, and prevents a boundary from rendering its own public parts.

Invalid:

```tsx
function Accordion({ items, showFooter, renderFooter }) {
  return (
    <section>
      {items.map((item) => <AccordionItem item={item} />)}
      {showFooter && renderFooter()}
    </section>
  );
}
```

Valid:

```tsx
<Accordion.Root open={open} setOpen={setOpen}>
  {items.map((item) => (
    <Accordion.Item key={item.id}>
      <Accordion.Trigger>{item.title}</Accordion.Trigger>
      <Accordion.Content>{item.content}</Accordion.Content>
    </Accordion.Item>
  ))}
</Accordion.Root>
```

Passing `composition` does not prove a complete LEGO architecture. The preset deliberately does not mandate dot-notation object exports, barrel files, React `useState`, or a `state/actions/meta` context shape. Module namespace exports are equally composable, and context organization is a separate convention rather than proof that consumers control structure.

## Strict LEGO compound APIs

The opt-in `lego` preset combines `composition` with positive, convention-oriented checks. Apply it only to files that define or consume compound APIs; ordinary screens and components are not required to become compounds.

```tsx
const CounterProvider = ({ children }) => (
  <CounterContext.Provider value={actor}>{children}</CounterContext.Provider>
);
const CounterDisplay = () => <output />;
const CounterIncrement = () => <button />;

export const Counter = {
  Provider: CounterProvider,
  Display: CounterDisplay,
  Increment: CounterIncrement,
};

<Counter.Provider>
  <Counter.Display />
  <Counter.Increment />
</Counter.Provider>
```

By default, an identified compound object must be exported, expose `Provider` or `Root`, expose at least two additional component-valued parts, and avoid duplicate bindings. Imported or same-file compound boundaries must be open and contain a consumer-selected part from the same namespace. Configure `boundaryMembers`, `minimumParts`, `compoundNamePattern`, or `headlessCompounds` for other conventions and intentional actor/store-backed headless boundaries.

The rules use deterministic same-file syntax analysis. They can validate bindings declared or imported in the current file, but they do not resolve re-export graphs, prove that a component consumes a particular context across files, or prove shared state semantics. No shared-state rule is shipped because naming a hook is not reliable evidence that state is shared. Actor and store implementations are supported without requiring React local state; teams may scope the preset and configure their boundary names without adopting `state/actions/meta`.

## Publishing

See [PUBLISHING.md](PUBLISHING.md) for first-release and automated publishing instructions.

## Development

```sh
bun install
bun run check
bun run test:coverage
npm pack --dry-run
```

Every rule change should start with one observable failing test, followed by the smallest implementation and a refactor pass.

`npm run smoke:package` additionally packs the publishable tarball, installs it into a clean temporary project, and runs ESLint through the package's public export.

## License

MIT
