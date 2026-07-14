# eslint-plugin-code-architecture

Portable ESLint rules that turn architectural decisions into fast, local feedback for humans and coding agents.

The plugin combines three ideas:

- [TigerStyle](https://tigerstyle.dev/): explicit limits, assertion density, small interfaces, and visible error handling.
- [The Vertical Codebase](https://tkdodo.eu/blog/the-vertical-codebase): high-cohesion verticals with explicit dependency direction and public surfaces.
- [Components take care of themselves](https://www.sandromaglione.com/newsletter/components-take-care-of-themselves): strict lint feedback that keeps UI components declarative.

It is ESM-only, supports ESLint flat config, and does not require type-aware linting.

See [References and attribution](docs/references.md) for the source material behind each policy. Rule pages link directly to the work they adapt.

## Install

```sh
npm install --save-dev eslint eslint-plugin-code-architecture typescript-eslint
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

- Library-agnostic: `recommended`, `tigerstyle`, and `strict`. The `strict` preset combines the other two.
- Optional library integrations: `effect` and `react`. These are deliberately excluded from `strict`; enable them only when the corresponding library and conventions are used.

## Using Biome and Oxlint alongside the plugin

[Biome](https://biomejs.dev/guides/getting-started/) and [Oxlint](https://oxc.rs/docs/guide/usage/linter/quickstart) can handle formatting and broad, high-speed linting while ESLint runs only the architectural rules that remain specific to this plugin. Teams can use either tool or both; this example uses both:

```sh
npm install --save-dev --save-exact @biomejs/biome
npm install --save-dev oxlint eslint eslint-plugin-code-architecture typescript-eslint
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

## Optional library integrations

These presets are never enabled by `recommended`, `tigerstyle`, or `strict`.

| Ecosystem | Preset behavior | Enable when |
| --- | --- | --- |
| Effect | [`effect-error-handling`](docs/rules/effect-error-handling.md) plus [`no-barrel-imports`](docs/rules/no-barrel-imports.md) configured for `effect` and `@effect/platform` | The project installs and uses Effect |
| React | [`declarative-components`](docs/rules/declarative-components.md) | The project installs and uses React with declarative component conventions |

## Publish the first release

The repository, package metadata, `v0.1.0` release contents, tests, and npm tarball are prepared. The first publication must establish ownership of the package on npm, so it is intentionally a manual account-authenticated operation:

```sh
cd eslint-plugin-code-architecture
npm login
npm run release:publish
```

`release:publish` runs `prepublishOnly` first, so lint and all rule tests must pass before npm receives the package. It explicitly publishes the unscoped package with public access. If npm requires a one-time password, enter it at the prompt.

The local first release does not request provenance because npm provenance is generated from supported cloud CI environments. After `0.1.0` exists, future GitHub releases can publish through `.github/workflows/release.yml` with trusted publishing and provenance. Configure its npm trusted publisher with:

- GitHub owner: `thorgas`
- Repository: `eslint-plugin-code-architecture`
- Workflow: `release.yml`
- Environment: `npm`
- Allowed action: `npm publish`

The package publishes only the files named by `package.json#files` plus npm's standard metadata files.

## Development

```sh
bun install
bun run check
bun run test:coverage
npm pack --dry-run
```

Every rule change should start with one observable failing test, followed by the smallest implementation and a refactor pass.

## License

MIT
