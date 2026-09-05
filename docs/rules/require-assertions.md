# require-assertions

Requires a minimum number of runtime assertions per eligible function. The TigerStyle preset uses two.

This numerical threshold is a heuristic, not a proof of contract completeness. TigerStyle says assertion density should **average a minimum of two assertions per function** across the codebase; this plugin's per-function minimum is a deliberately stricter, configurable adaptation. Meeting it does not establish contract completeness or correctness. Counted assertions are prompts to record meaningful arguments, returns, and invariants, and they never replace tests or error handling.

This is the broad density layer. Keep it enabled across both full-contract and lighter return-policy scopes; see [Assertion rule scoping](../assertion-scoping.md).

The `agentReadiness` preset also uses two, but sets `minimumStatements: 0` and `checkExpressionBodies: true`, so empty, trivial, and concise-arrow functions are checked rather than skipped.

A call counts as an assertion structurally, without any configuration:

- it resolves (through ESLint scope analysis, including one level of local aliasing, e.g. `const a = nodeAssert;`) to an import from an assertion module — `assert`, `node:assert`, `node:assert/strict`, `assert/strict`, `tiny-invariant`, `invariant`, or any specifier whose last path segment is `assert`, `asserts`, `assertions`, or `invariant`. Namespace and default imports, and any member accessed off them (`a.ok(x)`, `nodeAssert.strictEqual(x, y)`), all qualify — the local name and the member name do not matter;
- it resolves to a same-file function (declaration, `const` arrow, or `TSDeclareFunction` overload) whose return type is a TypeScript `asserts` predicate (`function assertPositive(x): asserts x is number { ... }`).

`assertionNames` (default `assert`, `assertDefined`, `assertWorkletInvariant`, `nodeAssert`, `nodeAssert.ok`) is a purely textual fallback on top of that: it matches the printed callee name exactly, regardless of where the callee came from, for project-specific helpers that use neither pattern above. `assertWorkletInvariant` covers Reanimated worklets, where an ordinary imported Node assertion cannot execute and a TypeScript `asserts` predicate is not preserved across worklet serialization. Configure `minimum` for density, `minimumStatements` for trivial-function handling, and `checkExpressionBodies` for concise arrows.

`ignoreDelegates` excludes functions whose entire body forwards to one call, including awaited calls. Use it only when the called boundary owns the contract; it is off by default, and domain adapters with meaningful validation should remain checked.

## Production-derived example

This redacted backend payload compactor asserts both its input budget and the bound it promises callers:

```ts
function compactPayload(value: unknown, depth = 0, maxItems = 20): unknown {
  assert(depth >= 0, "compactPayload requires a non-negative depth");
  if (depth >= 8) return "[nested data omitted]";

  if (Array.isArray(value)) {
    const kept = value
      .slice(0, maxItems)
      .map((item) => compactPayload(item, depth + 1, maxItems));
    assert(kept.length <= maxItems, "result must stay within its item budget");
    return value.length > kept.length
      ? [...kept, `[${value.length - kept.length} more items omitted]`]
      : kept;
  }

  return value;
}
```

Tests can now exercise explicit preconditions and postconditions, including malformed inputs and persistence mistakes. Coding agents see the invariants next to the code they change, which reduces slow repository-wide inference and makes a safe modification easier to scope. The default rule minimum is configurable; use `minimum: 2` or the `tigerstyle`/`strict` preset to require the density illustrated here.

The `tigerstyle` and `strict` presets set `ignoreDirectCallbacks: true`, `ignoreJSXCallbacks: true`, `ignoreJSXComponents: true`, `ignoreReactHooks: true`, `creditWrapperClosures: true`, `ignoreNoInputClosures: true`, `ignoreTrivialConstructors: true`, and `countGuardedThrows: true`. This excludes React render callbacks declared directly in JSX attributes and zero-input function expressions assigned to variables for orchestration:

```tsx
<List renderItem={({ item }) => <Row item={item} />} />;

const startApplication = () => {
  startServices();
  connectObservers();
};
```

`ignoreDirectCallbacks` excludes a function only when all of the following hold: it is an arrow or function expression, never a declaration; and either (a) its parent is a `CallExpression` or `NewExpression` and the function is one of that call's `arguments`, never the callee, so IIFEs stay checked, or (b) it is the value of a `Property` whose enclosing `ObjectExpression` is itself, one level up, a direct argument of a `CallExpression`/`NewExpression` — an options-object callback; and its body is an expression body or a block of at most `directCallbackMaxStatements` statements (default 3).

```ts
schedule(() => flush());

register((value) => {
  consume(value);
  record(value);
});

streamScreen(buildMessages(screen), {
  onDone: (content, info) => {
    if (stale()) return;
    handleStreamDone(content, info);
  },
  onError: (err, trace) => {
    if (stale()) return;
    handleStreamError(err, trace);
  },
});
```

The object-nesting exemption goes exactly one level deep, and only through a `Property`: it does not recurse into a nested object (`configure({ handlers: { onSave: () => {...} } })` stays strict, because the inner object is not itself a call argument), and it does not reach into an `ArrayExpression` member (XState-style `actions: [() => {...}]` stays strict). Above all, the `ObjectExpression` must be the call's own argument — a handler map assigned to a variable or exported as a config object is unaffected and stays strict:

```ts
const handlers = {
  onSave: (v) => {
    persist(v);
    notify(v);
  },
};
```

Everything else stays strict: object-property handlers not nested directly in a call argument, functions in an `ArrayExpression` such as XState transition actions, functions bound to a variable and passed by name, function declarations, class and object methods, callbacks longer than `directCallbackMaxStatements`, and IIFEs.

`ignoreNoInputClosures` excludes a zero-parameter function expression bound to a variable, and a zero-parameter `function f() {...}` declaration whose body is a single `return` — a factory. Declaration syntax alone no longer decides it:

```ts
function buildDefaults() {
  return { retries: 3, timeout: 1000 };
}
```

A `FunctionDeclaration` (or arrow) that takes parameters is unaffected and stays strict, and so is a zero-parameter declaration that *does* something rather than only returning a value — `function initialize() { startServices(); connectObservers(); }` still owes the postcondition that its work landed.

`ignoreJSXComponents` excludes a function that returns JSX. A component's preconditions are its typed props contract, and its body renders rather than computes, so an assertion there restates the type system — the same reasoning that gives `max-function-lines` its `ignoreJSX` option:

```tsx
function TonalIcon({ name }: Props) {
  const theme = useTheme();
  return <Squircle style={theme.chip}><Icon name={name} /></Squircle>;
}
```

A function is judged by its **own** return, never by a callback's, so a data function that maps over a renderer stays strict.

`ignoreReactHooks` excludes function declarations and variable-bound function expressions whose names follow React's `use` + capital-letter-or-digit convention, such as `useAuthScreenFields`. A hook coordinates React state and other hooks, so requiring assertion density in the hook itself usually creates noise. The exemption applies only to the hook function: nested helpers and callbacks are still checked independently under the rule's other options.

```ts
function useAuthScreenFields(session: Session) {
  function normalizeEmail(email: string) {
    assert(email.length > 0);
    assert(email === email.trim());
    return email.toLowerCase();
  }

  return { email: normalizeEmail(session.email) };
}
```

Names such as `usefulValue` do not qualify, and direct rule configurations remain exhaustive unless they enable `ignoreReactHooks`.

`creditWrapperClosures` counts a callback's assertions toward the function that wraps it. A wrapper's own body is one call, so the assertions belong in the callback, where the work happens - and counting strictly per scope would leave the wrapper at zero however well that callback asserts:

```ts
const recordAssetPart = (householdId: string, assetId: string) =>
  withAdmin(async (db) => {
    assert(householdId.length > 0, "recordAssetPart requires a household");
    assert(assetId.length > 0, "recordAssetPart requires an asset");
    return db.query(/* … */);
  });
```

It reaches exactly one call deep, and only when that call is the function's whole remaining body - an expression body, or the final `return`/expression statement of a block. A function that computes something itself and then happens to call a callback is not a wrapper and still owes its own assertions.


`ignoreTrivialConstructors` excludes a class constructor whose body contains only a `super(...)` call and/or assignments of the form `this.<field> = ...` — nothing else. This targets Error-subclass boilerplate with a fixed message, where there is no invariant to assert:

```ts
class AssetNotFoundError extends Error {
  constructor() {
    super("asset not found");
    this.name = "AssetNotFoundError";
  }
}
```

A constructor that branches, loops, or calls anything other than `super` — including one that validates or derives a field from its arguments — stays strict.

`countGuardedThrows` counts a **guarded throw** toward a function's assertion density. A validator of untrusted input that already fails loudly with a descriptive error carries the same intent as an assertion — demanding a parallel `assert()` next to it would duplicate the check. A `ThrowStatement` counts as one assertion when it is conditional: it has an `IfStatement` among its ancestors within the same function, or it is the consequent/alternate of a `ConditionalExpression`:

```ts
function parseAge(input: unknown): number {
  if (typeof input !== "string") throw new Error("age must be a string");
  if (Number.isNaN(Number(input))) throw new Error("age must be numeric");
  return Number(input);
}
```

It does **not** count:

- an **unconditional** `throw` at the top of a function body — a stub or a "not implemented" — because it is not a guard, it is the function's whole behaviour;
- a `throw` inside a `catch` block — a rethrow is error propagation, not a precondition check, and stays uncounted even when an `if` also happens to wrap it;
- a `throw` inside a nested function — the existing per-function scoping attributes it to the nearest enclosing function, never an outer one, the same way a nested `assert()` call already does.

Detection stops its ancestor walk at the nearest enclosing function, the same shape `ignoreJSXCallbacks` uses to find its `JSXAttribute`. This option is opt-in and off by default outside the presets, so direct rule configurations keep treating every `throw` as inert unless they enable it.

Detection is purely structural and stops at the nearest enclosing function. XState transition actions remain checked regardless of their parameters, alongside named boundary and domain functions, object methods, class methods, and declarations nested inside callbacks. Direct rule configurations retain exhaustive function checking unless they enable one of these options.

## Shape assertions

The cheapest honest assertion is usually about **shape**: the property of a value that must hold for the next line to make sense, checkable without knowing the value itself. Reach for these before concluding a function has nothing to assert:

- an id or token whose emptiness would make the call downstream meaningless - `assert(token.length > 2, "...")`;
- a state field used arithmetically or as a flag - `assert(Number.isFinite(state.consecutiveFailures) && state.consecutiveFailures >= 0, "...")`, `assert(typeof state.started === "boolean", "...")`;
- callbacks a context object promises - `assert(typeof ctx.setError === "function" && typeof ctx.setIntent === "function", "...")`.
- relationships the algorithm depends on - `assert(start <= end, "range bounds must be ordered")`, `assert(record.ownerId === requestedOwnerId, "records must remain owner-scoped")`.

A thin delegate whose parameter has a checkable shape asserts that shape even when the named callee owns the deeper invariants - the delegate is the last place the value is seen before it crosses into code that trusts it.

## Expected failures and internal invariants

Preserve intentional error behavior. Invalid user input, missing resources, and malformed external data are expected operational failures and may legitimately return `null`, a result value, or a typed error. Do not replace those contracts with assertions merely to satisfy density. Assertions belong on violated internal invariants: states the implementation believes cannot occur if the program is correct.

A tolerant parser may keep `null` as part of its public contract:

```ts
function parseOptionalAge(input: unknown): number | null {
  if (typeof input !== "string") return null;
  const age = Number(input);
  if (!Number.isInteger(age) || age < 0) return null;
  return age;
}
```

A boundary may make expected failure explicit as data:

```ts
type ParseResult =
  | { readonly ok: true; readonly value: number }
  | { readonly ok: false; readonly reason: "invalid-age" };

function parseAge(input: unknown): ParseResult {
  if (typeof input !== "string") return { ok: false, reason: "invalid-age" };
  const value = Number(input);
  if (!Number.isInteger(value)) return { ok: false, reason: "invalid-age" };
  return { ok: true, value };
}
```

An internal range constructor, by contrast, should fail fast when its own ordering invariant is violated:

```ts
function createRange(start: number, end: number): Range {
  assert(start <= end, "range bounds must be ordered");
  const range = { start, end };
  assert(range.end - range.start >= 0, "range width must be non-negative");
  return range;
}
```

If a tolerant function is eligible for a project-wide minimum but has no honest internal invariant, use a narrow, reasoned suppression or refine the configured scope. Do not change its failure semantics or add ceremonial checks.

Assertions inside a nested function count only toward that nested function, unless `creditWrapperClosures` applies to the wrapper around it. Assert inputs, return values, invariants, and both positive and negative space; do not add meaningless assertions to satisfy the count.

Reference: TigerBeetle, [TigerStyle](https://github.com/tigerbeetle/tigerbeetle/blob/main/docs/TIGER_STYLE.md), including assertion density, paired assertions, and positive/negative space.
