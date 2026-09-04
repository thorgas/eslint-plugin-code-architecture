# no-barrel-imports

Requires concrete imports instead of local `index` modules or configured package barrels.

```js
[
  "error",
  {
    packages: ["effect", "@effect/platform"],
    checkLocalIndex: true,
    allowedBarrels: ["src/legacy/**"],
  },
]
```

Invalid: `import { Effect } from "effect"`. Valid: `import * as Effect from "effect/Effect"`. Set `checkLocalIndex` to false when package exports intentionally resolve through an index module.

`allowedBarrels` takes path globs and exempts a matching import before any other check. Relative sources are resolved against the importing file and matched as a project-relative path; bare specifiers are matched as written. Use it for barrels a consumer deliberately keeps, not as a blanket escape hatch.

`checkLocalIndex` also catches a relative specifier whose text never mentions `index`, such as `import x from "./feature"` or `import x from "."`, when that specifier resolves to a directory containing an `index.{js,jsx,ts,tsx,mjs,cjs,mts,cts}` file. This detection is filesystem-backed: it resolves the specifier relative to the linted file's own path (`context.filename`) and checks the filesystem, so it is deterministic per file and requires no extra configuration.

## Production-derived example

A redacted worker imported one helper through a local feature barrel and one
Effect module through the package barrel:

```ts
import { Effect } from "effect";
import { persistCheckpoint } from "../sync/index.js";

export const saveCheckpoint = (checkpoint: Checkpoint) =>
  Effect.tryPromise(() => persistCheckpoint(checkpoint));
```

The direct imports reveal both owners and avoid loading unrelated export graphs:

```ts
import * as Effect from "effect/Effect";
import { persistCheckpoint } from "../sync/persist-checkpoint.js";

export const saveCheckpoint = (checkpoint: Checkpoint) =>
  Effect.tryPromise(() => persistCheckpoint(checkpoint));
```

That makes dependency tracing faster for people, test runners, bundlers, and
coding agents: the imported symbol maps directly to the module that implements
it.

Reference: Marvin Hagemeister, [Speeding up the JavaScript ecosystem - The barrel file debacle](https://marvinh.dev/blog/speeding-up-javascript-ecosystem-part-7/).
