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

export default tseslint.config(
  ...architecture.configs.recommended,
  ...architecture.configs.tigerstyle,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { parser: tseslint.parser },
  },
);
```

Available presets are `recommended`, `tigerstyle`, `effect`, `react`, and `strict`. Presets are flat-config arrays and can be spread into a configuration.

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

## Rules

| Rule | Purpose | Preset |
| --- | --- | --- |
| [`centralize-domain-literals`](docs/rules/centralize-domain-literals.md) | Keep fixed vocabulary in constants modules | Configure |
| [`declarative-components`](docs/rules/declarative-components.md) | Keep state/effects/business logic out of UI components | `react` |
| [`effect-error-handling`](docs/rules/effect-error-handling.md) | Prevent silent Effect failures and generic errors | `effect` |
| [`enforce-module-boundaries`](docs/rules/enforce-module-boundaries.md) | Enforce vertical dependency direction and public surfaces | Configure |
| [`imports-first`](docs/rules/imports-first.md) | Keep dependencies at the top of a module | `recommended` |
| [`max-function-lines`](docs/rules/max-function-lines.md) | Enforce the 70-line TigerStyle limit | `recommended`, `tigerstyle` |
| [`max-function-parameters`](docs/rules/max-function-parameters.md) | Bound positional inputs | `recommended`, `tigerstyle` |
| [`no-barrel-files`](docs/rules/no-barrel-files.md) | Disallow re-export barrels | `recommended` |
| [`no-barrel-imports`](docs/rules/no-barrel-imports.md) | Require concrete module imports | `recommended`, `effect` |
| [`no-unsafe-type-assertions`](docs/rules/no-unsafe-type-assertions.md) | Ban casts and non-null assertions | `recommended` |
| [`no-unvalidated-json-parse`](docs/rules/no-unvalidated-json-parse.md) | Require runtime validation around JSON parsing | `recommended` |
| [`require-assertions`](docs/rules/require-assertions.md) | Require assertion density in functions | `tigerstyle` |

## Moving this directory into its own repository

This directory is a standalone repository seed. After copying it to a new repository root:

1. Confirm that `eslint-plugin-code-architecture` is available on npm, or choose a scoped package name.
2. Add `repository`, `bugs`, and `homepage` URLs to `package.json` after the GitHub URL exists.
3. Run `bun install` and commit the generated lockfile.
4. Enable npm trusted publishing for the GitHub repository.
5. Run `bun run check` and `npm pack --dry-run`.
6. Create a GitHub release to trigger `.github/workflows/release.yml`.

The package uses npm provenance and publishes only the files named by `package.json#files`.

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
