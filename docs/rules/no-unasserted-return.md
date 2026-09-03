# no-unasserted-return

Disallows returning a call's result directly without asserting that specific result. The intended shape is **assign, assert, return**:

```ts
async function loadProfile(id: string): Promise<Profile> {
  const url = buildUrl(id);
  const profile = await fetchJson(url);
  assert(profile.id.length > 0, "loadProfile: a profile must carry its id");
  return profile;
}
```

`return f(...)` and `return await f(...)` smuggle a value out of a function without the function ever looking at it. Binding the result to a local first creates the place where its shape can be asserted — the same discipline `require-assertions` teaches, applied to the one statement that most often escapes it. A returned identifier, literal, or object built in place is not reported: those already passed through the function's own hands.

A precondition or an assertion covering another return does not prove the returned call's result. This is therefore still invalid:

```ts
function totalFor(entries: ReadonlyArray<Entry>, unit: string): number {
  assert(unit.length > 0, "totalFor: unit must be named");
  return sumInUnit(entries, unit); // reported: the result has no postcondition
}
```

## Options

Default assertion names are `assert`, `assertDefined`, `nodeAssert`, and `nodeAssert.ok`; configure `assertionNames` for application helpers, as with `require-assertions`.

`ignoreDelegates` (default `true`) exempts a function whose whole body is the one return — an expression-bodied arrow, or a block with a single statement:

```ts
const loadProfile = (id: string) => fetchJson(buildUrl(id));
```

A delegate computes nothing of its own, so the named callee carries the invariants and the wrapper has nothing true to assert — the same reasoning behind `require-assertions`' thin-delegate guidance. Set `ignoreDelegates: false` to check delegates too.

Conditional and logical returns are inspected path by path, so both calls in `return ready ? loadFresh() : cached || loadFallback()` are reported.

The rule shares production eligibility options with `require-assertions`: `minimumStatements`, `ignoreDirectCallbacks`, `directCallbackMaxStatements`, `ignoreJSXCallbacks`, `ignoreJSXComponents`, `ignoreNoInputClosures`, `ignoreReactHooks`, `ignoreTrivialConstructors`, and `ignoreDelegates`. `ignoreAssertionHelpers` excludes recognized assertion-helper implementations.

Assertions inside a nested function count only toward that nested function, matching `require-assertions`' scoping.

## Production-derived example

A redacted repository adapter used to return a downstream call without checking
the contract it promised to its callers:

```ts
async function loadMembership(userId: string): Promise<Membership> {
  const recordId = membershipIdFor(userId);
  return await database.getMembership(recordId);
}
```

The production-shaped version names the boundary result and verifies its key
postconditions before it escapes:

```ts
async function loadMembership(userId: string): Promise<Membership> {
  const recordId = membershipIdFor(userId);
  const membership = await database.getMembership(recordId);

  assertDefined(membership, "loadMembership: membership must exist");
  assert(
    membership.userId === userId,
    "loadMembership: database result must belong to the requested user",
  );
  return membership;
}
```

Failure is now attributed at the repository boundary instead of surfacing later
as unrelated behavior. Tests can target the missing and mismatched-record cases,
and agents can infer the function's contract from executable evidence.

## When not to use it

This rule is deliberately excluded from every preset. It encodes a strict house style; adopt it at `warn` first to measure, then per directory as files are brought up to the standard.

Reference: TigerBeetle, [TigerStyle](https://github.com/tigerbeetle/tigerbeetle/blob/main/docs/TIGER_STYLE.md) — assertion density, paired assertions, and positive/negative space.
