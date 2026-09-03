# max-function-parameters

Bounds positional inputs to keep interfaces low-dimensional. The default limit is five; destructured options count as one input.

```js
"code-architecture/max-function-parameters": ["error", { max: 3 }]
```

TypeScript's explicit `this` parameter is ignored unless `countThisParameter` is true. When inputs are cohesive, prefer an options object. Otherwise split the function responsibility.

## Production-derived example

A redacted notification backend accumulated positional arguments as delivery
options were added:

```ts
function sendDigest(
  userId: string,
  locale: string,
  timezone: string,
  dryRun: boolean,
  requestedAt: Date,
): Promise<DeliveryResult> {
  return deliverDigest(userId, locale, timezone, dryRun, requestedAt);
}
```

The production-shaped replacement gives names to every call-site value:

```ts
interface SendDigestOptions {
  readonly userId: string;
  readonly locale: string;
  readonly timezone: string;
  readonly dryRun: boolean;
  readonly requestedAt: Date;
}

function sendDigest(options: SendDigestOptions): Promise<DeliveryResult> {
  return deliverDigest(options);
}

await sendDigest({
  userId,
  locale: "de-DE",
  timezone: "Europe/Berlin",
  dryRun: false,
  requestedAt: clock.now(),
});
```

Named inputs prevent same-typed arguments from being silently swapped and let
tests override one concern without reconstructing an opaque positional tuple.

Reference: [TigerStyle](https://tigerstyle.dev/), especially logical interfaces and dimensionality.
