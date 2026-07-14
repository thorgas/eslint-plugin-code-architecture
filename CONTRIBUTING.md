# Contributing

Thanks for helping make architectural feedback faster and more precise.

## Setup

```sh
bun install
bun run check
```

## Rule changes

Use a red-green-refactor slice:

1. Add one failing test that demonstrates observable lint output.
2. Run that test and confirm the intended failure.
3. Implement the minimum rule behavior.
4. Run the focused test, then `bun run check`.
5. Document options, valid examples, and invalid examples in `docs/rules`.

Rules must remain deterministic per file. Do not retain cross-file mutable state between ESLint rule executions. Options must have complete JSON Schema metadata, and diagnostics must explain the architectural action to take.

Use conventional commit messages such as `feat: add bounded-loop rule` or `fix: resolve aliased module boundaries`.
