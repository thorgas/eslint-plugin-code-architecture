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

The rule derives `Accordion` from names such as `AccordionRoot` and `AccordionProvider`. It also understands object namespaces such as `export const Accordion = { Root, Item }`. Infrastructure such as `AccordionContext.Provider`, React Native primitives, and foreign compound components are allowed.

Use `componentNamePattern` for another root naming convention. Use `allowedParts` for an intentional same-namespace infrastructure wrapper.

References: Fernando Rojo, [Composition Pattern Guide](https://github.com/francostan/composition-pattern-starter/blob/main/docs/Pattern.md), and Vercel, [Composition](https://www.components.build/composition).
