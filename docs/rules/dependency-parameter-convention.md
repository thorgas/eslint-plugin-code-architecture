# dependency-parameter-convention

Requires a function whose signature directly names one or more `*Dep` wrapper types to accept them through one argument named `deps`. Regular arguments belong in a curried function.

Invalid:

```ts
const timeUntilEvent = (time: TimeDep, eventTimestamp: number) => {
  return eventTimestamp - time.time.now();
};
```

Valid:

```ts
const timeUntilEvent =
  (deps: TimeDep) =>
  (eventTimestamp: number) =>
    eventTimestamp - deps.time.now();
```

The rule recognizes direct dependency references and `Partial<SomeDep>` inside intersections. It does not resolve aliases such as `AppDeps` to declarations in another file.

Reference: Evolu, [Dependency Injection guidelines](https://www.evolu.dev/docs/dependency-injection), which prescribe one argument named `deps` for functions that accept dependencies.

## Production-derived example

This redacted private-backend adapter accepts its capabilities through one explicit dependency object.

```ts
export const createNutritionGateway = (deps: NutritionDeps): NutritionGateway => {
  assert(deps.databasePath.length > 0, "databasePath must not be empty");
  return { estimate: (items) => estimateFromFile(deps.fileSystem, items) };
};
```
