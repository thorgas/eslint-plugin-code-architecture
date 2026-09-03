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

The rule derives `Accordion` from names such as `AccordionRoot` and `AccordionProvider`. It also understands object namespaces, namespace imports, direct part names, aliases, common wrappers, local JSX variables, and locally owned helpers. Infrastructure such as `AccordionContext.Provider`, React Native primitives, and foreign compound components are allowed.

Use `componentNamePattern` for another root naming convention. Use `allowedParts` for an intentional same-namespace infrastructure wrapper.

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
