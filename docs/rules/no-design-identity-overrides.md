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

Direct JSX attributes and identity keys in inline style objects or arrays are reported. Unconfigured keys such as `margin`, `width`, and `flex` remain available for layout. Referenced style variables and component implementations are not evaluated.

This rule is excluded from every preset. Enable it only after component variants cover the supported product identities.
