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

An object is identified by a configured boundary member whose value actually resolves to a component — a function (directly, through a local variable, or through a configured wrapper such as `forwardRef`/`memo`) that renders JSX — or by `compoundNamePattern`. A boundary-named key whose value is not a component (`{ Root: computeRoot, Square: computeSquare }`) is not treated as a compound API and is left alone entirely, since the object is not a public component surface in the first place. `boundaryMembers` supports conventions such as `Container`; `minimumParts` changes the default of two. `ignoredNamePattern` defaults to `Context$` so underlying context objects are not mistaken for public compounds.

`Object.assign(Root, { Item, Trigger })` is also recognized as a compound definition: the first argument is the boundary itself and the object literal's own keys are the remaining public parts, in both `const Menu = Object.assign(Root, {...})` and `export default Object.assign(Root, {...})` forms.

The rule validates same-file declarations, imports, aliases, and supported wrapper calls. `wrapperNames` defaults to `memo` and `forwardRef` and can include application wrappers. It does not resolve a binding through another file or prove shared-state behavior. Direct module object APIs work and barrel files are not required.

Known limits: member validity is judged by whether the referenced function's own source contains JSX, so a component that only returns JSX through another indirection (e.g. a factory that builds the element without a literal `<Tag>` in that function's body) will not be recognized as a valid member. For `Object.assign(Root, {...})`, if the boundary argument's name is not itself one of `boundaryMembers`, it is checked under the first configured boundary name (`Provider` by default).

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
