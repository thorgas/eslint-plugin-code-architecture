# no-raw-design-values

Requires configured design values to use semantic tokens when they appear in configured object properties or JSX attributes.

```js
[
  "error",
  {
    allowedFiles: ["src/ui/tokens/**"],
    values: [
      {
        properties: ["color", "backgroundColor"],
        replacement: "tokens.color.surface",
        value: "#edf0eb",
      },
      {
        properties: ["gap", "padding"],
        replacement: "tokens.space.md",
        value: 16,
      },
    ],
    exceptions: [
      {
        files: ["src/charts/**"],
        properties: ["color"],
        values: ["#edf0eb"],
      },
    ],
  },
]
```

Invalid:

```tsx
const card = { backgroundColor: "#edf0eb", padding: 16 };

<ActivityIndicator color="#edf0eb" />;
<Icon tintColor={"#edf0eb"} />;
```

Valid:

```tsx
const card = {
  backgroundColor: tokens.color.surface,
  padding: tokens.space.md,
};

<ActivityIndicator color={tokens.color.surface} />;
<Text testID="#edf0eb" />;
```

The rule checks object properties and JSX attributes by syntax and is independent of React, React Native, CSS-in-JS, and any particular token API. It recognizes static computed object keys, literals inside common object-value expression wrappers, and immutable local aliases while respecting lexical shadowing. Token references and values on unrelated properties or attributes remain valid.

For JSX, only statically known strings are inspected: direct string attributes, string literals in expression containers, and template literals without substitutions. The rule does not evaluate variables, template expressions with substitutions, component implementations, imports, or runtime values.

`allowedFiles` exempts complete token-definition files. `exceptions` can exempt a configured value only for selected files and, optionally, selected properties or values. Paths are minimatch patterns relative to the lint working directory.

`replacement` is optional. When omitted, the diagnostic directs the consumer to use an approved design token without naming a specific expression.

The rule cannot discover repeated values across files, inspect CSS or generated assets, resolve imports or re-exports, follow mutable values, or prove that two visual treatments share semantics. It intentionally reports only values and property or attribute contexts named by the consumer. Keep cross-file inventories in audit tooling and rendered consistency in visual or interaction tests.
