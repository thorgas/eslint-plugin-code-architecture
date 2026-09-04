# prefer-readonly-types

Requires `readonly` interface properties and readonly collection types. It reports `Array`, `Set`, `Map`, `Record`, and `T[]`, recommending `ReadonlyArray`, `ReadonlySet`, `ReadonlyMap`, and `Readonly<Record<K, V>>` respectively.

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

Use `collectionScope: "contracts"` to check collection types only inside interfaces and type aliases while allowing intentionally mutable local implementation state such as a `Map` cache or work queue. Interface properties remain checked in both modes.

Reference: Evolu, [Conventions: Immutability](https://www.evolu.dev/docs/conventions).

## Production-derived example

This redacted production document makes both the property and its collection immutable at the contract boundary.

```ts
export interface ProfilesDocument {
  readonly schemaVersion: 1;
  readonly profiles: ReadonlyArray<Profile>;
}
```
