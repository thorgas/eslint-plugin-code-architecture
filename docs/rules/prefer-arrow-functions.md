# prefer-arrow-functions

Requires arrow functions instead of the `function` keyword. TypeScript overload sets are preserved because TypeScript requires function declarations for overload signatures.

The rule remains exhaustive by default. Production consumers can preserve declarations that carry real semantics or framework requirements:

- `allowDefaultExports` for route/framework default exports.
- `allowNamedExports` for exported framework entry points.
- `allowGenerators`, `allowRecursive`, and `allowHoisted` when declaration syntax is behaviorally meaningful.
- `allowedNames` and `allowedFiles` for narrow minimatch-based exceptions.

Invalid:

```ts
export function createUser(data: UserData): User {
  return { data };
}
```

Valid:

```ts
export const createUser = (data: UserData): User => ({ data });
```

Reference: Evolu, [Conventions: Arrow functions](https://www.evolu.dev/docs/conventions).

## Production-derived example

This redacted production parser uses an arrow export so function declarations have one consistent, searchable shape.

```ts
export const parseQuantity = (input: string): Decimal | null => {
  const normalized = input.trim();
  return normalized.length === 0 ? null : Decimal.parse(normalized);
};
```
