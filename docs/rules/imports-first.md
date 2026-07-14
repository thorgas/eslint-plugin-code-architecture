# imports-first

Requires static imports to appear before declarations and executable statements. Directive prologues remain allowed before imports.

Invalid:

```js
const ready = true;
import { start } from "./start.js";
```

Valid:

```js
import { start } from "./start.js";
const ready = true;
```

Reference: TigerBeetle, [TigerStyle](https://github.com/tigerbeetle/tigerbeetle/blob/main/docs/TIGER_STYLE.md), especially its guidance that order is part of readability and important definitions belong near the top.
