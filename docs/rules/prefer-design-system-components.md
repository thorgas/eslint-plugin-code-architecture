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
