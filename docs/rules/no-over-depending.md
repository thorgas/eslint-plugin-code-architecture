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

Passing or spreading the whole `deps` object counts as use of every declared dependency. That preserves Evolu's explicit allowance for over-providing dependencies to narrower downstream functions.

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
