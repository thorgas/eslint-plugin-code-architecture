# prefer-design-system-components

Requires configured consumer paths to use design-system components instead of selected platform primitives. Configure imports for React or React Native, intrinsic elements for the web, or both.

```js
"code-architecture/prefer-design-system-components": ["error", {
  consumers: ["src/features/**/ui/**", "src/app/**"],
  allowInside: ["src/components/ui/**"],
  replacements: [
    {
      from: "react-native",
      imported: ["Pressable", "TouchableOpacity", "Button"],
      replacement: "@/components/ui/button",
    },
    {
      from: "react-native",
      imported: ["Text"],
      replacement: "@/components/ui/text",
    },
    {
      elements: ["button", "dialog"],
      replacement: "@/components/ui",
    },
  ],
}]
```

The rule reports matching static imports, including aliases, and configured intrinsic JSX elements. It does not resolve re-exports, `require`, dynamic imports, or component implementations.

This rule is excluded from every preset. Enable each replacement only after its design-system primitive exists and the configured consumers have migrated.

## Production-derived example

This redacted feature action comes from a private React Native app. The direct
primitive left every caller responsible for loading, disabled, accessibility,
and feedback behavior:

```tsx
// Before: a feature owns a one-off button contract.
<Pressable
  accessibilityRole="button"
  accessibilityState={{ disabled: saving }}
  disabled={saving}
  onPress={saveArchive}
  style={[styles.action, saving && styles.actionDisabled]}
>
  {saving ? <ActivityIndicator /> : <Text>Save archive</Text>}
</Pressable>
```

The migrated production shape keeps that contract in the design system:

```tsx
// After: the feature supplies intent and content only.
<Button.Root
  disabled={saving}
  label="Save archive"
  loading={saving}
  onPress={saveArchive}
  testID="save-archive"
>
  <Button.Text>Save archive</Button.Text>
</Button.Root>
```

Tests can target one stable `Button.Root` contract instead of every feature's
hand-built pressable. Agents also have fewer accessibility and state details to
rediscover, which makes changes faster and less likely to drift.
