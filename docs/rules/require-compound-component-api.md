# require-compound-component-api

> Strict LEGO convention. Enable through `lego` only in files that define compound API objects.

Requires an identified compound object to be exported and to expose:

- a `Provider` or `Root` boundary;
- at least two additional public parts by default;
- component-valued member bindings;
- a distinct binding for each role.

```tsx
export const Counter = {
  Provider: CounterProvider,
  Display: CounterDisplay,
  Increment: CounterIncrement,
};
```

An object is identified by a configured boundary member, or by `compoundNamePattern`. Ordinary objects and components are ignored. `boundaryMembers` supports conventions such as `Container`; `minimumParts` changes the default of two. `ignoredNamePattern` defaults to `Context$` so underlying context objects are not mistaken for public compounds.

The rule validates same-file declarations, imports, aliases, and supported wrapper calls. `wrapperNames` defaults to `memo` and `forwardRef` and can include application wrappers. It does not resolve a binding through another file or prove shared-state behavior. Direct module object APIs work and barrel files are not required.

Reference: Fernando Rojo, [Composition Pattern Guide](https://github.com/francostan/composition-pattern-starter/blob/main/docs/Pattern.md).
