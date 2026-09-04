# no-raw-design-properties

Rejects any direct static string or number literal assigned to configured design properties. Unlike [`no-raw-design-values`](no-raw-design-values.md), it does not need an inventory of forbidden values, so a newly introduced color such as `#8A3D35` is still reported.

```js
"code-architecture/no-raw-design-properties": ["error", {
  allowedFiles: ["src/components/ui/tokens/**"],
  properties: [
    {
      names: ["color", "backgroundColor", "shadowColor"],
      replacement: "theme.colors",
    },
    {
      names: ["padding", "gap", "fontSize", "lineHeight", "borderRadius"],
      allowedValues: [0],
      replacement: "theme spacing or typography tokens",
    },
  ],
}]
```

Object properties and JSX attributes are inspected. Token references and other runtime expressions are left alone. The rule does not evaluate variables, function calls, arithmetic, or template expressions with substitutions.

A ternary or `||`/`??` expression assigned to a configured property is also checked: `backgroundColor: isDark ? '#000' : '#fff'` is reported once (on the whole expression) when the relevant branches — both branches of a conditional, or the right-hand side of a logical expression — are static literals not covered by `allowedValues`.

This rule is excluded from every preset. Configure only properties whose token migration is complete.

## Production-derived example

This redacted empty state uses semantic tokens for every migrated design property, including a new color that an inventory-based rule could not know in advance:

```tsx
// Reported after color, gap, and fontSize are configured properties.
const styles = {
  panel: { backgroundColor: "#8A3D35", gap: 14 },
  title: { fontSize: 19 },
};

// Valid: intent is named and the values remain centrally testable.
const styles = {
  panel: { backgroundColor: theme.colors.criticalSurface, gap: theme.space.md },
  title: { fontSize: theme.typography.title.fontSize },
};
```

Token and screenshot tests can change or verify the visual contract at its owner rather than chasing raw values through consumers. Coding agents see semantic intent such as `criticalSurface` immediately and avoid spending time reverse-engineering whether an arbitrary number is spacing, typography, or a special case. This rule must be explicitly configured, and only static literals assigned to configured properties are checked.
