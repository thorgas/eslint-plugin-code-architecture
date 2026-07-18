# prefer-composition-over-configuration

> Optional compound-component architecture. Enable the `composition` preset only where consumers should own UI structure.

Reports component implementations that assemble their child hierarchy from:

- two or more structural toggle props such as `showHeader` and `hideFooter`;
- structural enum or variant props such as `layout` or `mode`;
- configured collection props such as `items`, `data`, or `sections` mapped into JSX, including optional, chained, and statically traceable aliases;
- renderer and component props such as `renderItem`, `FooterComponent`, or `slots.Footer`.

Invalid:

```tsx
function Accordion({ items, showHeader, hideFooter }) {
  return (
    <section>
      {showHeader && <Header />}
      {items.map((item) => <Item item={item} />)}
      {!hideFooter && <Footer />}
    </section>
  );
}
```

Valid:

```tsx
<Accordion.Root>
  {items.map((item) => (
    <Accordion.Item key={item.id}>{item.label}</Accordion.Item>
  ))}
</Accordion.Root>
```

The rule recognizes `.map()` and conditional JSX beneath a `Root` or `Provider` as consumer-owned assembly. A single structural toggle is allowed by default to avoid treating every small optional decoration as a compound-component problem.

Options:

- `minimumConditionalProps` changes the default threshold of `2`.
- `configurationPropPattern` changes the structural prop-name pattern.
- `collectionProps` replaces the known collection prop names.
- `rendererPropPattern` changes renderer prop detection.
- `variantPropPattern` changes structural variant detection.
- `componentNamePattern` changes which functions are treated as components.
- `allowedComponents` exempts intentional data-driven primitives such as a virtualized list.

References: Fernando Rojo, [Composition Pattern Guide](https://github.com/francostan/composition-pattern-starter/blob/main/docs/Pattern.md), and Vercel, [Composition](https://www.components.build/composition).

The rule follows local aliases and helpers owned by the component. It does not perform type-aware or cross-file data-flow analysis. Optional decoration remains allowed until it reaches `minimumConditionalProps`, unless that threshold is configured more strictly.
