# require-consumer-owned-compound-usage

> Strict LEGO convention. Enable through `lego` only in files that consume compound APIs.

Requires an imported or same-file compound boundary to be open and to contain at least one consumer-selected part from the same namespace.

```tsx
<Counter.Provider>
  {showDisplay && <Counter.Display />}
  <View><Counter.Increment /></View>
</Counter.Provider>
```

Self-closing boundaries and boundaries containing only a fixed layout component are rejected. Nested, repeated, conditional, and reordered same-namespace parts are accepted. Foreign compound components may appear beneath the boundary.

Use `boundaryMembers` for another boundary convention and `headlessCompounds` for intentional actor/store-backed Providers that do not require same-namespace descendants. `ignoredNamespacePattern` excludes infrastructure namespaces and defaults to `Context$`.

The rule uses same-file syntax and imported binding names. It does not prove that a descendant reads shared state or resolve a compound namespace through re-export graphs.

Reference: Fernando Rojo, [Composition Pattern Guide](https://github.com/francostan/composition-pattern-starter/blob/main/docs/Pattern.md).
