# effect-error-handling

> Optional Effect integration. Enable the `effect` preset only when the project installs and uses Effect.

Enforces an explicit Effect error channel. It reports:

- `Effect.ignore`;
- `Effect.catchAll(() => Effect.void)` and undefined success fallbacks;
- `Effect.catchAllCause`, which can erase defects;
- `Effect.tapError` manual logging in business logic;
- `Effect.fail(new Error(...))` instead of a tagged domain error.

Each category has an `allow*` option for a deliberate boundary-level exception. Prefer `Schema.TaggedError`, `Effect.catchTag`, `Effect.mapError`, propagation, or a documented domain fallback.

References: [Effect LLM standards](https://effect.website/llms-full.txt), [Effect Patterns](https://github.com/PaulJPhilp/EffectPatterns/tree/main/rules), [Effect by Example](https://effectbyexample.com/), [Effect guide](https://github.com/mikearnaldi/accountability/blob/main/specs/guides/effect-guide.md), and the [accountability error-tracker specification](https://github.com/mikearnaldi/accountability/blob/main/specs/completed/error-tracker.md).
