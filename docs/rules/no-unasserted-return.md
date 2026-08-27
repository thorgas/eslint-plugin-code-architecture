# no-unasserted-return

Disallows returning a call's result directly from a function that contains no assertion. The intended shape is **assign, assert, return**:

```ts
async function loadProfile(id: string): Promise<Profile> {
  const url = buildUrl(id);
  const profile = await fetchJson(url);
  assert(profile.id.length > 0, "loadProfile: a profile must carry its id");
  return profile;
}
```

`return f(...)` and `return await f(...)` smuggle a value out of a function without the function ever looking at it. Binding the result to a local first creates the place where its shape can be asserted — the same discipline `require-assertions` teaches, applied to the one statement that most often escapes it. A returned identifier, literal, or object built in place is not reported: those already passed through the function's own hands.

A function is reported only when it holds **no** assertion at all. One assertion anywhere in the body — a precondition on the inputs, a postcondition before an earlier return — is evidence the function participates in the discipline, and the rule does not demand that every single return be individually asserted:

```ts
function totalFor(entries: ReadonlyArray<Entry>, unit: string): number {
  assert(unit.length > 0, "totalFor: unit must be named");
  return sumInUnit(entries, unit); // accepted: the function asserts its input
}
```

## Options

Default assertion names are `assert`, `assertDefined`, `nodeAssert`, and `nodeAssert.ok`; configure `assertionNames` for application helpers, as with `require-assertions`.

`ignoreDelegates` (default `true`) exempts a function whose whole body is the one return — an expression-bodied arrow, or a block with a single statement:

```ts
const loadProfile = (id: string) => fetchJson(buildUrl(id));
```

A delegate computes nothing of its own, so the named callee carries the invariants and the wrapper has nothing true to assert — the same reasoning behind `require-assertions`' thin-delegate guidance. Set `ignoreDelegates: false` to check delegates too.

Assertions inside a nested function count only toward that nested function, matching `require-assertions`' scoping.

## When not to use it

This rule is deliberately excluded from every preset. It encodes a strict house style; adopt it at `warn` first to measure, then per directory as files are brought up to the standard.

Reference: TigerBeetle, [TigerStyle](https://github.com/tigerbeetle/tigerbeetle/blob/main/docs/TIGER_STYLE.md) — assertion density, paired assertions, and positive/negative space.
