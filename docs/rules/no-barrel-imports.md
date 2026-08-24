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

Reference: Marvin Hagemeister, [Speeding up the JavaScript ecosystem - The barrel file debacle](https://marvinh.dev/blog/speeding-up-javascript-ecosystem-part-7/).
