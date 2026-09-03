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

## Production-derived example

This redacted backend job originally loaded its dependency after configuration
and logging had already begun:

```ts
const queueName = process.env.REDACTED_QUEUE_NAME ?? "default";
logger.info("starting worker", { queueName });

import { consumeQueue } from "./queue/consume-queue.js";

await consumeQueue({ queueName });
```

Keeping dependencies at the top makes the file's inputs visible before an
engineer or coding agent reasons about its startup behavior:

```ts
import { consumeQueue } from "./queue/consume-queue.js";

const queueName = process.env.REDACTED_QUEUE_NAME ?? "default";
logger.info("starting worker", { queueName });
await consumeQueue({ queueName });
```

That predictable ordering reduces navigation and review time, and prevents an
import from being mistaken for runtime-dependent loading.

Reference: TigerBeetle, [TigerStyle](https://github.com/tigerbeetle/tigerbeetle/blob/main/docs/TIGER_STYLE.md), especially its guidance that order is part of readability and important definitions belong near the top.
