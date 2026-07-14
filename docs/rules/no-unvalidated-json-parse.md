# no-unvalidated-json-parse

Requires `JSON.parse` to appear inside an approved runtime schema decoder. Default decoder names cover Effect Schema's decode functions, `Schema.parseJson`, and schema transforms.

Invalid: `const config = JSON.parse(content)`. Valid: `Schema.decodeUnknownSync(Config)(JSON.parse(content))`.

Configure `validationCalls` for Zod, Valibot, ArkType, or an application decoder. `maximumAncestorDepth` bounds how far the rule searches for the enclosing validation call.

References: the [Effect LLM standards](https://effect.website/llms-full.txt), [Effect by Example](https://effectbyexample.com/), and the [Effect guide](https://github.com/mikearnaldi/accountability/blob/main/specs/guides/effect-guide.md).
