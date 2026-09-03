# no-unsafe-type-assertions

Disallows TypeScript `as Type`, angle-bracket assertions, and non-null assertions because they bypass runtime safety.

Invalid: `const user = input as User` and `client!.send()`. Valid: decode unknown data with a runtime schema, narrow through a type guard, or use `satisfies` when checking a constructed value.

`as const` is allowed by default. Configure `allowConst` or `checkNonNull` for stricter or narrower policies.

## Production-derived example

A redacted API adapter once told TypeScript to trust an external response:

```ts
interface SessionPayload {
  readonly userId: string;
  readonly expiresAt: string;
}

export async function loadSession(token: string): Promise<SessionPayload> {
  const response = await fetch("/api/session", {
    headers: { authorization: `Bearer ${token}` },
  });
  return (await response.json()) as SessionPayload;
}
```

The assertion made malformed production data look safe and left tests with no
explicit failure contract. The replacement decodes `unknown` at the boundary:

```ts
import * as Schema from "effect/Schema";

const SessionPayload = Schema.Struct({
  userId: Schema.String,
  expiresAt: Schema.String,
});
type SessionPayload = typeof SessionPayload.Type;

export async function loadSession(token: string): Promise<SessionPayload> {
  const response = await fetch("/api/session", {
    headers: { authorization: `Bearer ${token}` },
  });
  const input: unknown = await response.json();
  return Schema.decodeUnknownSync(SessionPayload)(input);
}
```

Now malformed payloads are directly testable and fail where they enter the
system. This also avoids agent slowdown: a coding agent can rely on the decoded
type after one visible boundary instead of repeatedly tracing whether an `as`
cast hid an unchecked assumption elsewhere.

References: the [Effect LLM standards](https://effect.website/llms-full.txt) and the [Effect guide](https://github.com/mikearnaldi/accountability/blob/main/specs/guides/effect-guide.md) for parse-at-the-boundary and typed-domain patterns.
