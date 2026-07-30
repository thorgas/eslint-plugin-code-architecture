# prefer-interface-over-type

Requires an interface when a type alias contains a plain object type literal. Type aliases remain valid for unions, mapped types, tuples, utilities, and other forms an interface cannot directly express.

Invalid:

```ts
type User = {
  readonly id: string;
};
```

Valid:

```ts
interface User {
  readonly id: string;
}

type Status = "pending" | "done";
```

Reference: Evolu, [Conventions: Interface over type](https://www.evolu.dev/docs/conventions).
