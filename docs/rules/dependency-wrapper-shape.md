# dependency-wrapper-shape

Requires dependency wrapper declarations to follow Evolu's distinct wrapper convention: `TimeDep` contains exactly one `readonly time: Time` property. The property name and wrapped type are derived from the wrapper name, and generic wrappers are rejected.

Invalid:

```ts
interface TimeDep<T> {
  time: T;
}
```

Valid:

```ts
interface Time {
  readonly now: () => number;
}

interface TimeDep {
  readonly time: Time;
}
```

This syntax-only rule recognizes interface declarations and object type aliases whose names end in `Dep`.

Reference: Evolu, [Dependency Injection](https://www.evolu.dev/docs/dependency-injection), especially “To avoid clashes, wrap dependencies (`TimeDep`, `LoggerDep`).”

## Production-derived example

This redacted excerpt comes from a private production backend. The wrapper prevents its `clock` property from colliding when dependency contracts are combined.

```ts
export interface Clock {
  readonly now: () => Date;
}

export interface ClockDep {
  readonly clock: Clock;
}
```
