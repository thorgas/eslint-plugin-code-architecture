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

A local namespace is also registered from `Object.assign(Root, { Item, Trigger })`, so `const Menu = Object.assign(Root, { Item });` is recognized the same way a `{ Root, Item }` object literal is.

Use `boundaryMembers` for another boundary convention and `headlessCompounds` for intentional actor/store-backed Providers that do not require same-namespace descendants. `ignoredNamespacePattern` excludes infrastructure namespaces and defaults to `Context$`.

The rule uses same-file syntax and imported binding names. It does not prove that a descendant reads shared state or resolve a compound namespace through re-export graphs.

Reference: Fernando Rojo, [Composition Pattern Guide](https://github.com/francostan/composition-pattern-starter/blob/main/docs/Pattern.md).

## Production-derived example

This individual rule belongs to the stricter `lego` preset and validates usage
sites; it does not define the compound API. This redacted example is based on a
private app's restore confirmation:

```tsx
// Before: the boundary is open, but a fixed layout still owns all parts.
<Dialog.Root onRequestClose={cancel} visible={open}>
  <RestoreConfirmationLayout />
</Dialog.Root>
```

The production-shaped consumer selects and arranges the compound parts:

```tsx
// After: the usage site makes its exact dialog structure visible.
<Dialog.Root onRequestClose={cancel} visible={open}>
  <Dialog.Content>
    <Dialog.Title>Replace this device's data?</Dialog.Title>
    <ArchiveSummary value={summary} />
    <Dialog.Actions>
      <Button.Root onPress={cancel} label="Cancel" testID="cancel">
        <Button.Text>Cancel</Button.Text>
      </Button.Root>
      <Button.Root onPress={confirm} label="Replace data" testID="confirm">
        <Button.Text>Replace data</Button.Text>
      </Button.Root>
    </Dialog.Actions>
  </Dialog.Content>
</Dialog.Root>
```

The feature test can assert the exact selected parts and order without mocking
a hidden layout component. Agents can understand the screen from the call site
and make a local change instead of tracing configuration through another file.
