# sort-dependency-types

Requires direct dependency wrapper types in an intersection to be sorted alphabetically.

Invalid:

```ts
type AppDeps = TimeDep & LoggerDep;
```

Valid:

```ts
type AppDeps = LoggerDep & TimeDep;
```

`Partial<SomeDep>` is supported. Intersections used to refine an existing aggregate, such as `Omit<AppDeps, ...> & SqliteDep`, are left alone because not every member is a direct dependency wrapper.

Reference: Evolu, [Dependency Injection guidelines](https://www.evolu.dev/docs/dependency-injection), “Sort dependencies alphabetically in ascending order when combining them.”

## Production-derived example

This redacted private-backend command contract keeps its dependency wrappers alphabetized, so additions produce predictable diffs.

```ts
export type PlanCommandDeps =
  ClockDep & ConsoleDep & FileSystemDep & RecipeStoreDep;
```
