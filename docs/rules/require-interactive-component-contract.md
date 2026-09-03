# require-interactive-component-contract

Requires configured functional interactive components to expose statically visible accessibility, disabled, press-feedback, and content signals.

```js
"code-architecture/require-interactive-component-contract": ["error", {
  componentNames: ["Button", "IconButton"],
  roleAttributes: ["accessibilityRole", "role"],
  stateAttributes: ["accessibilityState", "aria-disabled"],
  disabledProps: ["disabled"],
  disabledAttributes: ["disabled", "aria-disabled"],
  feedbackAttributes: ["android_ripple", "data-pressed"],
  feedbackStateNames: ["pressed", "active"],
  contentProps: ["children"],
}]
```

The defaults are the values shown above. A complete component must render a role attribute, a state attribute, wire a configured disabled prop into a disabled/state attribute, expose configured press feedback, and render configured content.

The rule checks syntax, not runtime behavior. It cannot prove visual contrast, event semantics, or that a handler changes state. It supports functional components with statically identifiable names and does not inspect imported implementations.

This rule is excluded from every preset. Enable it only for shared primitives whose contract has been adopted.

## Production-derived example

This redacted shared button is based on a private React Native design system.
An earlier wrapper forwarded props but did not make its behavior inspectable:

```tsx
// Before: callers cannot rely on one accessibility or feedback contract.
function Button({ children, disabled, onPress }) {
  return <Pressable disabled={disabled} onPress={onPress}>{children}</Pressable>;
}
```

The production-shaped primitive exposes the full contract in one place:

```tsx
// After: role, state, disabled wiring, feedback, and content are visible.
function Button({ children, disabled = false, loading = false, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: disabled || loading }}
      android_ripple={{ color: tokens.actionRipple }}
      disabled={disabled || loading}
      onPress={onPress}
    >
      {loading ? <ActivityIndicator /> : children}
    </Pressable>
  );
}
```

One focused component test can now prove disabled wiring, accessible state, and
feedback for every caller. Agents can safely reuse the primitive without
reconstructing those requirements on each feature screen.
