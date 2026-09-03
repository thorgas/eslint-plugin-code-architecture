# no-unvalidated-json-parse

Requires every `JSON.parse` result to flow directly into an approved runtime schema decoder. Default decoder names cover Effect Schema's decode functions, `Schema.parseJson`, and schema transforms.

Invalid: `const config = JSON.parse(content)`. Valid: `Schema.decodeUnknownSync(Config)(JSON.parse(content))`.

The rule also accepts two conservative parse-then-validate forms:

- A local parsed value with exactly one reference, when that reference is the argument of an approved decoder.
- An `Effect.try` result validated by `Schema` in an `Effect.flatMap` pipeline or immediately after binding.

A parsed value used before validation, used more than once, or hidden inside a parser function is still rejected. This keeps the rule local and deterministic without treating arbitrary later validation as proof that earlier uses were safe.

Configure `validationCalls` for Zod, Valibot, ArkType, or an application decoder. `maximumAncestorDepth` bounds how far the rule searches for the enclosing validation call.

## Production-derived example

A redacted command-line service parsed a persisted checkpoint and immediately
treated its properties as application state:

```ts
export function readCheckpoint(contents: string): Checkpoint {
  const checkpoint = JSON.parse(contents);
  logger.debug("resuming", { cursor: checkpoint.cursor });
  return checkpoint;
}
```

The production-shaped replacement validates the parse result before any use:

```ts
import * as Schema from "effect/Schema";

const Checkpoint = Schema.Struct({
  cursor: Schema.String,
  completedAt: Schema.NullOr(Schema.String),
});
type Checkpoint = typeof Checkpoint.Type;

export function readCheckpoint(contents: string): Checkpoint {
  return Schema.decodeUnknownSync(Checkpoint)(JSON.parse(contents));
}
```

Corrupt or outdated persisted data now has a deterministic boundary failure.
Fixture tests can cover each invalid shape, while people and agents do not need
to trace whether the untyped parsed value was validated later.

References: the [Effect LLM standards](https://effect.website/llms-full.txt), [Effect by Example](https://effectbyexample.com/), and the [Effect guide](https://github.com/mikearnaldi/accountability/blob/main/specs/guides/effect-guide.md).
