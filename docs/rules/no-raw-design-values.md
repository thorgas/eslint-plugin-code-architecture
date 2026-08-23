# no-raw-design-values

Requires configured design values to use semantic tokens when they appear in configured object properties.

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

```js
const card = { backgroundColor: "#edf0eb", padding: 16 };
```

Valid:

```js
const card = {
  backgroundColor: tokens.color.surface,
  padding: tokens.space.md,
};
```

The rule checks object properties by syntax and is independent of React, React Native, CSS-in-JS, and any particular token API. It recognizes static computed property keys, literals inside common expression wrappers, and immutable local aliases while respecting lexical shadowing. Token references and values on unrelated properties remain valid.

`allowedFiles` exempts complete token-definition files. `exceptions` can exempt a configured value only for selected files and, optionally, selected properties or values. Paths are minimatch patterns relative to the lint working directory.

The rule cannot discover repeated values across files, inspect CSS or generated assets, resolve imports or re-exports, follow mutable values, or prove that two visual treatments share semantics. It intentionally reports only values and property contexts named by the consumer. Keep cross-file inventories in audit tooling and rendered consistency in visual or interaction tests.
