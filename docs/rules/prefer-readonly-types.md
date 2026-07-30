# prefer-readonly-types

Requires `readonly` interface properties and readonly collection types. It reports `Array`, `Set`, `Map`, `Record`, and `T[]`, recommending their readonly counterparts.

Invalid:

```ts
interface Example {
  items: Array<string>;
  tags: Set<string>;
}
```

Valid:

```ts
interface Example {
  readonly items: ReadonlyArray<string>;
  readonly tags: ReadonlySet<string>;
}
```

This is a syntax rule; it does not require Evolu's `readonly` runtime helper or inspect inferred types.

Reference: Evolu, [Conventions: Immutability](https://www.evolu.dev/docs/conventions).
