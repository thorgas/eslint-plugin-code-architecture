# effect-error-handling

> Optional Effect integration. Enable the `effect` preset only when the project installs and uses Effect.

Enforces an explicit Effect error channel. It reports:

- `Effect.ignore`;
- `Effect.catchAll(() => Effect.void)` and undefined success fallbacks;
- `Effect.catchAllCause`, which can erase defects;
- `Effect.tapError` manual logging in business logic;
- `Effect.fail(new Error(...))` instead of a tagged domain error.

Each category has an `allow*` option for a deliberate boundary-level exception. Prefer `Schema.TaggedError`, `Effect.catchTag`, `Effect.mapError`, propagation, or a documented domain fallback.

## Production-derived example

This redacted service keeps a recoverable repository failure visible in the type and handles only that case at the boundary:

```ts
class PantryUnavailable extends Schema.TaggedError<PantryUnavailable>()(
  "PantryUnavailable",
  { householdId: Schema.String },
) {}

const loadPantry = (householdId: string) =>
  repository.findPantry(householdId).pipe(
    Effect.mapError(() => new PantryUnavailable({ householdId })),
  );

const renderPantry = (householdId: string) =>
  loadPantry(householdId).pipe(
    Effect.catchTag("PantryUnavailable", () =>
      Effect.succeed({ kind: "unavailable" as const, items: [] }),
    ),
  );
```

An erased error such as `Effect.catchAll(() => Effect.void)` makes success-path tests pass while hiding the reason no data arrived. The tagged version gives tests a stable failure constructor and gives coding agents an explicit list of recoverable cases, without requiring them to trace logs or guess whether a defect was intentionally swallowed. This rule is available only through explicit configuration or the `effect` preset in a project that uses Effect.

References: [Effect LLM standards](https://effect.website/llms-full.txt), [Effect Patterns](https://github.com/PaulJPhilp/EffectPatterns/tree/main/rules), [Effect by Example](https://effectbyexample.com/), [Effect guide](https://github.com/mikearnaldi/accountability/blob/main/specs/guides/effect-guide.md), and the [accountability error-tracker specification](https://github.com/mikearnaldi/accountability/blob/main/specs/completed/error-tracker.md).
