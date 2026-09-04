# no-root-owned-compound-parts

> Optional compound-component architecture. Enable the `composition` preset only where consumers should own UI structure.

Prevents a root or provider from rendering parts that belong to its own compound namespace.

Invalid:

```tsx
function AccordionRoot({ children }) {
  return (
    <AccordionContext.Provider value={{}}>
      <Accordion.Trigger />
      <AccordionContent />
      {children}
    </AccordionContext.Provider>
  );
}
```

Valid:

```tsx
function AccordionRoot({ children }) {
  return (
    <AccordionContext.Provider value={{}}>
      <View>{children}</View>
    </AccordionContext.Provider>
  );
}
```

When the file defines the root's compound object — an object literal (`{ Root, Item }`) or an `Object.assign(Root, { Item, Trigger })` call — that object's member names are the namespace ground truth: a directly referenced JSX identifier (`<AccordionShadowOverlay />`) is only flagged when it resolves to one of the object's declared members. An unrelated component that merely shares the `Accordion` name prefix (`AccordionShadowOverlay` when the compound object only declares `Root` and `Item`) is not reported.

The rule falls back to deriving `Accordion` from names such as `AccordionRoot` and `AccordionProvider`, and to prefix matching for direct JSX identifiers, only when no compound object for that root exists anywhere in the file. It also understands object namespaces, namespace imports, direct part names, aliases, common wrappers, local JSX variables, and locally owned helpers. Infrastructure such as `AccordionContext.Provider`, React Native primitives, and foreign compound components are allowed.

Use `componentNamePattern` for another root naming convention. Use `allowedParts` for an intentional same-namespace infrastructure wrapper.

Known limits: namespaced JSX usage (`<Accordion.Item />`) is still matched by namespace alone, not by checking that `Item` is a declared member of the compound object — only the direct-identifier prefix-matching case is disambiguated by the compound object's member list.

References: Fernando Rojo, [Composition Pattern Guide](https://github.com/francostan/composition-pattern-starter/blob/main/docs/Pattern.md), and Vercel, [Composition](https://www.components.build/composition).

## Production-derived example

This is an individual rule in the optional `composition` preset. The redacted
example follows a private app's compound button boundary:

```tsx
// Before: Button.Root silently owns another Button part.
function ButtonRoot({ children, onPress }: ButtonRootProps) {
  return (
    <ButtonContext.Provider value={{ tone: "primary" }}>
      <Pressable onPress={onPress}>
        <Button.Icon name="check" />
        {children}
      </Pressable>
    </ButtonContext.Provider>
  );
}
```

The root now owns only shared state and infrastructure:

```tsx
// After: the consumer decides whether the icon exists and where it appears.
function ButtonRoot({ children, onPress }: ButtonRootProps) {
  return (
    <ButtonContext.Provider value={{ tone: "primary" }}>
      <Pressable onPress={onPress}>{children}</Pressable>
    </ButtonContext.Provider>
  );
}

<Button.Root onPress={save}>
  <Button.Icon name="check" />
  <Button.Text>Save</Button.Text>
</Button.Root>
```

Root tests stay limited to context and interaction; feature tests own the parts
they render. Agents can change one composition without creating conditional
root behavior that slows unrelated tests and reviews.
