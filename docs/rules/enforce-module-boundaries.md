# enforce-module-boundaries

Enforces vertical dependency direction and target public surfaces for relative or aliased imports.

Each module has a unique `name`, a project-relative `pattern`, an optional `allow` list, and optional `public` patterns relative to the module root. Omitting `allow` leaves dependency direction unconstrained; an empty list allows no cross-module dependencies. Omitting `public` makes all files public.

Use `aliases` to resolve imports such as `@/billing/...`, `root` to override the working directory, and `allowPrivateImportsFrom` for explicit composition roots. The rule checks imports and re-exports.

Invalid: a `billing` file importing a private `notifications` implementation when the dependency or public path is not configured. Valid: importing a declared service/API file along an allowed edge.

Reference: TkDodo, [The Vertical Codebase](https://tkdodo.eu/blog/the-vertical-codebase).
