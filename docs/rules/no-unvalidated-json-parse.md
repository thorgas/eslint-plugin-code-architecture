# no-unvalidated-json-parse

Requires every `JSON.parse` result to flow directly into an approved runtime schema decoder. Default decoder names cover Effect Schema's decode functions, `Schema.parseJson`, and schema transforms.

Invalid: `const config = JSON.parse(content)`. Valid: `Schema.decodeUnknownSync(Config)(JSON.parse(content))`.

The rule also accepts two conservative parse-then-validate forms:

- A local parsed value with exactly one reference, when that reference is the argument of an approved decoder.
- An `Effect.try` result validated by `Schema` in an `Effect.flatMap` pipeline or immediately after binding.

A parsed value used before validation, used more than once, or hidden inside a parser function is still rejected. This keeps the rule local and deterministic without treating arbitrary later validation as proof that earlier uses were safe.

Configure `validationCalls` for Zod, Valibot, ArkType, or an application decoder. `maximumAncestorDepth` bounds how far the rule searches for the enclosing validation call.

References: the [Effect LLM standards](https://effect.website/llms-full.txt), [Effect by Example](https://effectbyexample.com/), and the [Effect guide](https://github.com/mikearnaldi/accountability/blob/main/specs/guides/effect-guide.md).
