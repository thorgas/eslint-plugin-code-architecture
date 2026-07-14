# no-barrel-imports

Requires concrete imports instead of local `index` modules or configured package barrels.

```js
[
  "error",
  { packages: ["effect", "@effect/platform"], checkLocalIndex: true },
]
```

Invalid: `import { Effect } from "effect"`. Valid: `import * as Effect from "effect/Effect"`. Set `checkLocalIndex` to false when package exports intentionally resolve through an index module.

Reference: Marvin Hagemeister, [Speeding up the JavaScript ecosystem - The barrel file debacle](https://marvinh.dev/blog/speeding-up-javascript-ecosystem-part-7/).
