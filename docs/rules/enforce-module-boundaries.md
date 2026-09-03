# enforce-module-boundaries

Enforces vertical dependency direction and target public surfaces for relative or aliased imports.

Each module has a unique `name`, a project-relative `pattern`, an optional `allow` list, and optional `public` patterns relative to the module root. Omitting `allow` leaves dependency direction unconstrained; an empty list allows no cross-module dependencies. Omitting `public` makes all files public.

Use `aliases` to resolve imports such as `@/billing/...`, `root` to override the working directory, and `allowPrivateImportsFrom` for explicit composition roots. The rule checks imports and re-exports.

Invalid: a `billing` file importing a private `notifications` implementation when the dependency or public path is not configured. Valid: importing a declared service/API file along an allowed edge.

## Production-derived example

This redacted UI architecture prevents shared components from depending on feature-owned code:

```ts
// Valid: a feature imports shared UI.
// src/features/check-in/ui/check-in-card.tsx
import { Card } from "../../../components/ui/card.js";

export function CheckInCard() {
  return <Card>How are you feeling?</Card>;
}

// Invalid: shared UI reaches back into a feature.
// src/components/ui/card.tsx
// import { checkInPalette } from "../../features/check-in/ui/theme.js";
```

```js
{
  modules: [
    { name: "shared-ui", pattern: "src/components/**", allow: [] },
    { name: "features", pattern: "src/features/**" },
  ],
}
```

Shared-component tests no longer need feature fixtures just because a primitive imported a feature theme. Coding agents get a machine-checked map of legal dependencies, so they do not have to infer architecture from directory names or accidentally introduce a dependency cycle. The rule requires project-specific module patterns; omitted `allow` and `public` retain the permissive behavior described above.

Reference: TkDodo, [The Vertical Codebase](https://tkdodo.eu/blog/the-vertical-codebase).
