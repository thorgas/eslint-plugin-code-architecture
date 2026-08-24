# require-assertions

Requires a minimum number of runtime assertions per function. The TigerStyle preset uses two.

Default assertion names are `assert`, `assertDefined`, `nodeAssert`, and `nodeAssert.ok`. Configure `assertionNames` for application helpers, `minimum` for density, `minimumStatements` for trivial-function handling, and `checkExpressionBodies` for concise arrows.

The `tigerstyle` and `strict` presets set `ignoreDirectCallbacks: true`, `ignoreJSXCallbacks: true`, and `ignoreNoInputClosures: true`. This excludes React render callbacks declared directly in JSX attributes and zero-input function expressions assigned to variables for orchestration:

```tsx
<List renderItem={({ item }) => <Row item={item} />} />;

const startApplication = () => {
  startServices();
  connectObservers();
};
```

`ignoreDirectCallbacks` excludes a function only when all of the following hold: it is an arrow or function expression, never a declaration; its parent is a `CallExpression` or `NewExpression` and the function is one of that call's `arguments`, never the callee, so IIFEs stay checked; and its body is an expression body or a block of at most `directCallbackMaxStatements` statements (default 3).

```ts
schedule(() => flush());

register((value) => {
  consume(value);
  record(value);
});
```

Everything else stays strict: object-property handlers, functions in an `ArrayExpression` such as XState transition actions, functions bound to a variable and passed by name, function declarations, class and object methods, callbacks longer than `directCallbackMaxStatements`, and IIFEs.

Detection is purely structural and stops at the nearest enclosing function. XState transition actions remain checked regardless of their parameters, alongside named boundary and domain functions, object methods, class methods, and declarations nested inside callbacks. Direct rule configurations retain exhaustive function checking unless they enable one of these options.

## Tolerant readers

Do not reach for a config exemption to keep a function tolerant. Validators generally convert their `null`-returning paths into assertions, together with an audit of the callers that relied on the `null`. The exception is a reader of legacy on-device data, where the tolerant contract is the point: those keep it, one function at a time, with a `// eslint-disable-next-line code-architecture/require-assertions -- <reason naming the contract>` on that function, never a config exemption.

Assertions inside a nested function count only toward that nested function. Assert inputs, return values, invariants, and both positive and negative space; do not add meaningless assertions to satisfy the count.

Reference: TigerBeetle, [TigerStyle](https://github.com/tigerbeetle/tigerbeetle/blob/main/docs/TIGER_STYLE.md), including assertion density, paired assertions, and positive/negative space.
