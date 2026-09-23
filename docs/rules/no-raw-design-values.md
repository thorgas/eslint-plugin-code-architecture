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

Each `values` entry may match a `value` (exact literal equality) or a `pattern` (a regex source string tested against string literals via `new RegExp(pattern).test(value)`) — pick one per entry. Independently of any configured `values`, the rule also applies a built-in default detection for raw colors — hex codes (`^#[0-9a-fA-F]{3,8}$`) and `rgb()`/`rgba()`/`hsl()`/`hsla()` strings — on color-like properties (`color`, `backgroundColor`, `borderColor`, `tintColor`, `shadowColor`, `fill`, `stroke`, or any property name ending in `Color`), even when `values` is omitted entirely or that property has no configured entries. Identifiers bound with `let` and never reassigned are resolved to their initializer for detection purposes, the same as `const` aliases.

`allowedFiles` exempts complete token-definition files. `exceptions` can exempt a configured value only for selected files and, optionally, selected properties or values. Paths are minimatch patterns relative to the lint working directory.

`replacement` is optional. When omitted, the diagnostic directs the consumer to use an approved design token without naming a specific expression.

The rule cannot discover repeated values across files, inspect CSS or generated assets, resolve imports or re-exports, follow mutable values, or prove that two visual treatments share semantics. It intentionally reports only values and property or attribute contexts named by the consumer. Keep cross-file inventories in audit tooling and rendered consistency in visual or interaction tests.

## Production-derived example

This redacted loading card replaces known raw values with the semantic tokens declared by the product's design system:

```tsx
// Before: tests and reviewers cannot tell what these values mean.
export function LoadingCard() {
  return (
    <View style={{ backgroundColor: "#edf0eb", padding: 16 }}>
      <ActivityIndicator color="#edf0eb" />
    </View>
  );
}

// After: the contract survives a palette or spacing change.
export function LoadingCard() {
  return (
    <View style={{ backgroundColor: tokens.color.surface, padding: tokens.space.md }}>
      <ActivityIndicator color={tokens.color.selectionWash} />
    </View>
  );
}
```

Token tests can verify the semantic values once, while component tests focus on the status being rendered. Coding agents see the intended role of each value without searching screenshots or nearby styles, which makes changes faster and less error-prone. The consumer must explicitly configure each value/property pairing and any replacement; unlike `no-raw-design-properties`, an unlisted raw value is not reported.
