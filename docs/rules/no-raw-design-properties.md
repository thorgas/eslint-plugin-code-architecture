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

This rule is excluded from every preset. Configure only properties whose token migration is complete.
