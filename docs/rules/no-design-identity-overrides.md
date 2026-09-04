# no-design-identity-overrides

Prevents consumers from changing configured visual identity properties on design-system components while leaving layout overrides available.

```js
"code-architecture/no-design-identity-overrides": ["error", {
  allowedFiles: ["src/components/ui/**"],
  components: [
    {
      names: ["Button", "Dialog.Button"],
      identityProperties: ["color", "backgroundColor", "borderRadius"],
      styleAttributes: ["style"],
    },
  ],
}]
```

Direct JSX attributes and identity keys in inline style objects or arrays are reported. Unconfigured keys such as `margin`, `width`, and `flex` remain available for layout. A `style={identifier}` attribute is resolved back to its object-literal initializer when `identifier` is a `const` bound directly to an object expression (e.g. `const overrideStyle = { backgroundColor: 'red' }; <Button style={overrideStyle} />`); other referenced style variables and component implementations are not evaluated.

This rule is excluded from every preset. Enable it only after component variants cover the supported product identities.

## Production-derived example

This redacted settings action keeps product identity inside the design-system button while allowing the screen to own layout:

```tsx
// Before: a consumer silently invents another primary-button identity.
<Button.Root
  label="Save"
  onPress={saveSettings}
  style={{ backgroundColor: "#ffffff", borderRadius: 3, marginTop: 16 }}
>
  <Button.Text style={{ fontSize: 18 }}>Save</Button.Text>
</Button.Root>

// After: identity comes from a tested variant; layout remains composable.
<Button.Root label="Save" onPress={saveSettings} style={{ marginTop: 16 }}>
  <Button.Text>Save</Button.Text>
</Button.Root>
```

Component tests and visual tests now cover the primary identity once instead of reproducing consumer-specific colors and radii. Coding agents can select a named variant and immediately know which styling decisions are owned by the component. The consumer must configure component names, identity properties, and style attributes; referenced style objects are intentionally outside this syntax-only rule.
