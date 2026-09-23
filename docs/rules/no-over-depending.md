# no-over-depending

Rejects required `*Dep` wrapper types whose corresponding `deps` property is never read by the function.

Invalid:

```ts
const log = (deps: LoggerDep & TimeDep) => {
  deps.logger.log("ready");
};
```

Valid:

```ts
const log = (deps: LoggerDep) => {
  deps.logger.log("ready");
};
```

Uses inside nested callbacks count. Optional wrappers written as `Partial<SomeDep>` are not reported when unused. The property name is derived from the wrapper (`TimeDep` becomes `deps.time`), so this rule pairs with `dependency-wrapper-shape`.

Destructuring individual properties out of `deps` counts as using just those properties: `const { time } = deps` only marks `time` as used. Rest destructuring (`const { logger, ...rest } = deps`), aliasing `deps` to another variable (`const d = deps`), and passing or spreading the whole `deps` object all count as use of every declared dependency. That preserves Evolu's explicit allowance for over-providing dependencies to narrower downstream functions.

Tracking is scope-aware: a nested function that declares its own `deps` parameter is tracked independently and never contaminates its enclosing function's usage.

Reference: Evolu, [Dependency Injection](https://www.evolu.dev/docs/dependency-injection), “Over-providing is OK” but “Over-depending is not.”

## Production-derived example

This redacted private-backend service declares exactly the logger capability it reads.

```ts
type ShoppingListDeps = LoggerDep;

export const mergeItems = (deps: ShoppingListDeps, items: ReadonlyArray<Item>) => {
  deps.logger.log(`Merging ${items.length} items`);
  return groupItems(items);
};
```
