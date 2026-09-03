# require-composable-root-children

> Optional compound-component architecture. Enable the `composition` preset only where consumers should own UI structure.

Requires functions whose names end in `Root` or `Provider` to accept `children` and reference that value on every reachable top-level return path.

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

Concise arrows, multiple returns, top-level conditional and logical expressions, `props.children`, aliased destructuring, TypeScript expression wrappers, local expression aliases, `memo`, and `forwardRef` are supported. A conditional inside one stable returned JSX boundary may choose between decoration and children; a top-level branch that returns a different tree or `null` without children is rejected.

Use `componentNamePattern` to adopt another root naming convention.

References: Fernando Rojo, [Composition Pattern Guide](https://github.com/francostan/composition-pattern-starter/blob/main/docs/Pattern.md), and Vercel, [Composition](https://www.components.build/composition).

## Production-derived example

This individual rule participates in the optional `composition` preset. It is
not a separate "keep roots open" preset. This redacted root is based on a
private app's shared button:

```tsx
// Before: the root chooses its only possible child.
function ButtonRoot({ label, onPress }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Text>{label}</Text>
    </Pressable>
  );
}
```

The production shape accepts and renders consumer-owned content:

```tsx
// After: text, icons, and progress content can be supplied by the caller.
function ButtonRoot({ children, onPress }: ButtonRootProps) {
  return (
    <ButtonVariantContext.Provider value="primary">
      <Pressable accessibilityRole="button" onPress={onPress}>
        {children}
      </Pressable>
    </ButtonVariantContext.Provider>
  );
}
```

Tests can inject the smallest child needed to exercise the root, while feature
tests assert the exact composed content they own. Agents avoid modifying a
central root whenever a caller needs a new child arrangement.
