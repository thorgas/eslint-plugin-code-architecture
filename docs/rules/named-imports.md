# named-imports

Requires named imports. Side-effect-only imports remain valid.

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

This redacted private-backend module names each validation capability at the import boundary.

```ts
import {
  isUnknownRecord,
  readFiniteNumber,
  readString,
} from "../shared/validation.js";
```
