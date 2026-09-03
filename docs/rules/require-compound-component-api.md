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

## Production-derived example

This individual rule belongs to the stricter `lego` preset; `lego` is the
preset, while `require-compound-component-api` validates definition files. This
redacted API is based on a private app's shared dialog:

```tsx
// Before: useful parts exist, but consumers must discover private exports.
const DialogRoot = ({ children, onRequestClose }: DialogRootProps) => (
  <Modal transparent onRequestClose={onRequestClose}>{children}</Modal>
);
const DialogContent = ({ children }: PropsWithChildren) => (
  <View accessibilityViewIsModal>{children}</View>
);
const DialogTitle = ({ children }: PropsWithChildren) => <Text>{children}</Text>;
```

The production shape publishes one explicit, statically inspectable API:

```tsx
// After: the boundary and distinct public parts are grouped and exported.
export const Dialog = {
  Root: DialogRoot,
  Content: DialogContent,
  Title: DialogTitle,
};
```

API tests and lint can enumerate one object instead of relying on naming
conventions across exports. Agents immediately see the supported building
blocks, which cuts discovery time and discourages accidental private APIs.
