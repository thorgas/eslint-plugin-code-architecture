# top-down-declarations

Orders top-level declarations for Evolu's top-down readability:

1. Exported interfaces and types.
2. Supporting interfaces and types.
3. Exported implementations.
4. Private implementation details.

Invalid:

```ts
const createBar = (): Bar => ({ value: "bar" });

export interface Foo {
  readonly bar: Bar;
}
```

Valid:

```ts
export interface Foo {
  readonly bar: Bar;
}

interface Bar {
  readonly value: string;
}

export const foo = (): Foo => ({ bar: createBar() });
const createBar = (): Bar => ({ value: "bar" });
```

Imports and executable statements are outside this rule's declaration ordering. Use `imports-first` separately when needed.

`preserveRuntimeDependencies` defaults to `true`. When moving a declaration upward would place it before an earlier runtime value it references, the rule does not report the order: readability must not introduce temporal-dead-zone or initialization changes. Set it to `false` only when another tool validates module initialization. `allowedFiles` accepts minimatch patterns for generated or framework-owned module layouts.

Reference: Evolu, [Conventions: Order (top-down readability)](https://www.evolu.dev/docs/conventions).

## Production-derived example

This redacted production module presents its public vocabulary and contracts before private validation details.

```ts
export type ProfileKind = "adult" | "child";

export interface Profile {
  readonly id: string;
  readonly kind: ProfileKind;
}

const isProfileKind = (value: string): value is ProfileKind =>
  value === "adult" || value === "child";
```
