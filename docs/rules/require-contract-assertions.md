# require-contract-assertions

Requires semantic runtime assertions for every eligible function parameter binding and every nontrivial returned value. It implements TigerStyle's instruction to assert function arguments and return values while keeping assertions complementary to TypeScript.

This is a narrower companion to `require-assertions`, not a replacement. `require-assertions` establishes broad assertion density; this rule proves specific preconditions and postconditions in domain and application functions that own meaningful contracts. The `agentReadiness` preset deliberately applies both exhaustively. Production applications should use the eligibility options below instead of adding ceremonial assertions to framework callbacks and rendering code.

Do not apply `no-unasserted-return` to the same functions. Use that rule as a lighter alternative in complementary scopes; see [Assertion rule scoping](../assertion-scoping.md).

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

Each identifier introduced by a parameter must appear in a recognized assertion before its first use. The assertion must be reachable on every path to that use. Destructured objects and arrays, default parameters, and rest parameters are expanded into their runtime bindings. TypeScript's synthetic `this` parameter is ignored.

Obvious inline checks already guaranteed by an explicit annotation do not count:

- `typeof value === "string"` for `value: string`.
- `value instanceof Date` for `value: Date`.
- `Array.isArray(values)` for `values: ReadonlyArray<T>`.
- Null or undefined exclusion when the declared type does not permit that value.

A null or undefined check does count for an optional or explicitly nullable parameter because it establishes a real runtime precondition. Custom assertion helpers are opaque; the rule can only reject structurally recognizable type-only checks. Direct type aliases are resolved, so `type Label = string` does not make `typeof label === "string"` semantic.

## Returns

Every nontrivial return path must have a preceding semantic assertion that dominates that return. Assertions in conditional branches do not cover returns outside those branches. Mutating the returned binding after its postcondition invalidates that postcondition. Vacuous conditions such as `result === result` never count.

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
- `minimumStatements`: checks functions with at least this many top-level statements; defaults to `1`.
- `ignoreDirectCallbacks` and `directCallbackMaxStatements`: exclude short callbacks passed directly to a call, using the same eligibility logic as `require-assertions`.
- `ignoreJSXCallbacks` and `ignoreJSXComponents`: exclude render glue.
- `ignoreNoInputClosures`, `ignoreReactHooks`, `ignoreTrivialConstructors`, and `ignoreDelegates`: exclude function shapes that do not own useful input/output contracts.
- `ignoreAssertionHelpers`: excludes functions whose names match `assertionNames`, preventing circular requirements on the assertion implementation itself.

For a practical application policy, start with the same eligibility boundary used by `require-assertions` and keep the rule strict inside that boundary:

```js
"code-architecture/require-contract-assertions": [
  "error",
  {
    minimumStatements: 3,
    ignoreAssertionHelpers: true,
    ignoreDelegates: true,
    ignoreDirectCallbacks: true,
    ignoreJSXCallbacks: true,
    ignoreJSXComponents: true,
    ignoreNoInputClosures: true,
    ignoreReactHooks: true,
    ignoreTrivialConstructors: true,
  },
]
```

Assertions inside a nested function apply only to that nested function. Eligibility options default to `false`, preserving the exhaustive behavior of `agentReadiness` and direct configurations that do not opt into production exemptions.

Reference: TigerBeetle, [TigerStyle](https://github.com/tigerbeetle/tigerbeetle/blob/main/docs/TIGER_STYLE.md), especially “Assert all function arguments and return values” and the distinction between types checking structure and assertions checking logic and state.

## Production-derived example

This redacted production helper checks the input capability and the computed result instead of relying on TypeScript alone.

```ts
export const loadProfile = async (deps: StoreDep, id: string): Promise<Profile> => {
  assert(id.length > 0, "profile id must not be empty");
  const profile = await deps.store.load(id);
  assert(profile.id === id, "store must return the requested profile");
  return profile;
};
```
