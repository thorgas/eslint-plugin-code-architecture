# no-namespace-exports

Disallows exporting objects that bundle behavior behind a namespace, and exported TypeScript `namespace` declarations. Export unique, descriptive members individually so call sites import exactly what they use, tree-shaking works, and every symbol stays searchable.

Invalid:

```ts
export const Utils = { ok, trySync };
export const api = { load: async () => null, save() {} };
export default { parse: () => 1 };
export namespace Result {
  export const ok = () => true;
}
```

Valid:

```ts
export const ok = () => true;
export const trySync = () => {};
```

## What counts as a namespace

An exported object literal is a namespace when at least one member is a function literal, a method, or a shorthand reference to a function declared in the module. Objects whose members are only data are not reported, so configuration, lookup tables, migrations, enum-like constants, and style objects remain valid:

```ts
export const tabScreenContentStyle = { paddingHorizontal: 16 };
export const ReduceMotion = { Always: "always", Never: "never" };
export const migration = { id: "occurrence-time", statements: [...] };
```

Objects whose members are all PascalCase are treated as compound-component APIs (`export const Card = { Root, Title }`) and allowed by default; set `allowCompoundComponents: false` to report them. This keeps the rule compatible with the plugin's `lego` preset when both apply to the same files.

`Object.freeze`, `as`, `satisfies`, and `!` wrappers are unwrapped. Direct exports, same-file named re-exports, and default exports are checked. Ambient `declare namespace` blocks are ignored.

## Configuration

```js
"code-architecture/no-namespace-exports": [
  "error",
  { allowCompoundComponents: false },
]
```

Reference: Evolu, [Conventions: Unique exported members](https://www.evolu.dev/docs/conventions).

## Production-derived example

This redacted private-backend source module exports searchable operations directly instead of hiding them behind a namespace object.

```ts
export const sourcePlatform = (url: string): Platform | null => parsePlatform(url);
export const sourceId = (url: string): string | null => parseSourceId(url);
```
