# no-namespace-exports

Disallows exporting object literals as namespace-style APIs. Export unique, descriptive members individually instead.

Invalid:

```ts
export const Utils = { ok, trySync };
```

Valid:

```ts
export const ok = () => true;
export const trySync = () => {};
```

Direct exports and same-file named re-exports are checked. This Evolu convention conflicts with namespace-object APIs such as the plugin's optional `lego` preset, so the presets should not be applied to the same files.

Reference: Evolu, [Conventions: Unique exported members](https://www.evolu.dev/docs/conventions).

## Production-derived example

This redacted private-backend source module exports searchable operations directly instead of hiding them behind a namespace object.

```ts
export const sourcePlatform = (url: string): Platform | null => parsePlatform(url);
export const sourceId = (url: string): string | null => parseSourceId(url);
```
