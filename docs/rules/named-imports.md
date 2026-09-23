# named-imports

Requires named imports. Side-effect-only imports remain valid.

Some packages and framework files require a default or namespace shape. Configure those APIs explicitly instead of disabling the rule for an entire directory:

```js
"code-architecture/named-imports": [
  "error",
  {
    allowDefaultImportsFrom: ["react", "./routes/**"],
    allowNamespaceImportsFrom: ["expo-*"],
  },
]
```

Both options accept minimatch patterns matched against the import source string. Default and namespace exceptions are separate so an API receives only the import shape it needs.

Invalid:

```ts
import Foo from "./Foo.js";
import * as Utils from "./utils.js";
```

Valid:

```ts
import { bar, baz } from "./Foo.js";
import "./setup.js";
```

Reference: Evolu, [Conventions: Named imports](https://www.evolu.dev/docs/conventions).

## Production-derived example

This redacted production module names each validation capability at the import boundary.

```ts
import {
  isUnknownRecord,
  readFiniteNumber,
  readString,
} from "../shared/validation.js";
```
