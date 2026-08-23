# require-assertions

Requires a minimum number of runtime assertions per function. The TigerStyle preset uses two.

Default assertion names are `assert`, `assertDefined`, `nodeAssert`, and `nodeAssert.ok`. Configure `assertionNames` for application helpers, `minimum` for density, `minimumStatements` for trivial-function handling, and `checkExpressionBodies` for concise arrows.

The `tigerstyle` and `strict` presets set `ignoreJSXCallbacks: true` and `ignoreNoInputClosures: true`. This excludes React render callbacks declared directly in JSX attributes and zero-input function expressions assigned to variables for orchestration:

```tsx
<List renderItem={({ item }) => <Row item={item} />} />;

const startApplication = () => {
  startServices();
  connectObservers();
};
```

Detection is purely structural and stops at the nearest enclosing function. XState transition actions remain checked regardless of their parameters, alongside other call callbacks, named boundary and domain functions, object methods, class methods, and declarations nested inside callbacks. Direct rule configurations retain exhaustive function checking unless they enable either option.

Assertions inside a nested function count only toward that nested function. Assert inputs, return values, invariants, and both positive and negative space; do not add meaningless assertions to satisfy the count.

Reference: TigerBeetle, [TigerStyle](https://github.com/tigerbeetle/tigerbeetle/blob/main/docs/TIGER_STYLE.md), including assertion density, paired assertions, and positive/negative space.
