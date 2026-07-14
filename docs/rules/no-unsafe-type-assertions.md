# no-unsafe-type-assertions

Disallows TypeScript `as Type`, angle-bracket assertions, and non-null assertions because they bypass runtime safety.

Invalid: `const user = input as User` and `client!.send()`. Valid: decode unknown data with a runtime schema, narrow through a type guard, or use `satisfies` when checking a constructed value.

`as const` is allowed by default. Configure `allowConst` or `checkNonNull` for stricter or narrower policies.

References: the [Effect LLM standards](https://effect.website/llms-full.txt) and the [Effect guide](https://github.com/mikearnaldi/accountability/blob/main/specs/guides/effect-guide.md) for parse-at-the-boundary and typed-domain patterns.
