# require-composable-root-children

> Optional compound-component architecture. Enable the `composition` preset only where consumers should own UI structure.

Requires functions whose names end in `Root` or `Provider` to accept `children` and return that value from the composition boundary.

Invalid:

```tsx
function AccordionRoot({ open }) {
  return <FixedAccordionLayout open={open} />;
}
```

Valid:

```tsx
function AccordionRoot({ children, open, setOpen }) {
  return (
    <AccordionContext.Provider value={{ open, setOpen }}>
      <div>{children}</div>
    </AccordionContext.Provider>
  );
}
```

The check intentionally requires a direct children reference in the root's returned expression. Returning children only from an unrelated nested callback does not prove the root exposes an open composition boundary.

Use `componentNamePattern` to adopt another root naming convention.

References: Fernando Rojo, [Composition Pattern Guide](https://github.com/francostan/composition-pattern-starter/blob/main/docs/Pattern.md), and Vercel, [Composition](https://www.components.build/composition).
