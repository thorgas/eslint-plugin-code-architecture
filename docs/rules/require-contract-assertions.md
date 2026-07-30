# require-contract-assertions

Requires semantic runtime assertions for every function parameter binding and every nontrivial returned value. It implements TigerStyle's instruction to assert all function arguments and return values while keeping assertions complementary to TypeScript.

Invalid:

```ts
function normalize(value: string): string {
  assert(typeof value === "string");
  const result = value.trim();
  assert(typeof result === "string");
  return result;
}
```

The `typeof` checks merely repeat the explicit TypeScript annotations, so they do not satisfy this rule.

Valid:

```ts
function normalize(value: string): string {
  assert(value.length > 0);
  const result = value.trim();
  assert(result.length > 0);
  return result;
}
```

## Parameters

Each identifier introduced by a parameter must appear in a recognized assertion. Destructured objects and arrays, default parameters, and rest parameters are expanded into their runtime bindings. TypeScript's synthetic `this` parameter is ignored.

Obvious inline checks already guaranteed by an explicit annotation do not count:

- `typeof value === "string"` for `value: string`.
- `value instanceof Date` for `value: Date`.
- `Array.isArray(values)` for `values: ReadonlyArray<T>`.
- Null or undefined exclusion when the declared type does not permit that value.

A null or undefined check does count for an optional or explicitly nullable parameter because it establishes a real runtime precondition. Custom assertion helpers are opaque; the rule can only reject structurally recognizable type-only checks.

## Returns

Every nontrivial return path must have a preceding semantic assertion that dominates that return. Assertions in conditional branches do not cover returns outside those branches.

Prefer naming computed results:

```ts
const result = calculate(input);
assert(result >= 0);
return result;
```

Direct computed returns are reported because there is no stable returned binding on which to express a postcondition. Bare `return`, literals, static templates, JSX, and newly created function values are treated as statically evident. Generator return/yield contracts are outside this syntax-only rule.

## Options

- `assertionNames`: replaces the recognized assertion helper names.
- `checkParameters`: enables parameter contracts; defaults to `true`.
- `checkReturns`: enables return contracts; defaults to `true`.
- `ignoreTypeOnlyAssertions`: rejects recognizable TypeScript-redundant assertions; defaults to `true`.

Assertions inside a nested function apply only to that nested function.

Reference: TigerBeetle, [TigerStyle](https://github.com/tigerbeetle/tigerbeetle/blob/main/docs/TIGER_STYLE.md), especially “Assert all function arguments and return values” and the distinction between types checking structure and assertions checking logic and state.
