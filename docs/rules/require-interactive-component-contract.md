# require-interactive-component-contract

Requires configured functional interactive components to expose statically visible accessibility, disabled, press-feedback, and content signals.

The minimal recommended config is just:

```js
"code-architecture/require-interactive-component-contract": "error"
```

With no options object, the rule has no `componentNames` allow-list, so it
detects interactive primitives structurally: a function component whose
rendered root is a known interactive element or carries an
`onPress`/`onClick`/`onPressIn` attribute, or whose root is a single wrapper
around exactly one such element. Screens and
sections that merely contain buttons are not primitives and are not checked;
the primitives they compose are. All attribute-name options below are optional
overrides — pass them only to customize the defaults, which already cover
common React Native and DOM conventions:

```js
"code-architecture/require-interactive-component-contract": ["error", {
  componentNames: ["Button", "IconButton"], // optional allow-list; omit to auto-detect interactive components
  contractComponents: ["Button.Root", "SettingsActionRow"], // imported primitives that already own role/state/feedback
  roleAttributes: ["accessibilityRole", "role"],
  stateAttributes: ["accessibilityState", "aria-disabled", "aria-pressed", "aria-checked", "aria-selected"],
  disabledProps: ["disabled", "isDisabled"],
  disabledAttributes: ["disabled", "isDisabled"],
  feedbackAttributes: ["style", "rippleColor", "android_ripple", "activeOpacity", "underlayColor"],
  feedbackComponents: ["PressableScale"], // primitives whose implementation already owns feedback
  feedbackStateNames: ["pressed", "hovered", "focused", "active"],
  interactiveElementNames: ["Pressable", "PressableScale", "TouchableOpacity", "button"],
  contentProps: ["children", "label", "title", "text"],
}]
```

A complete component must render a role attribute and state attribute on its
interactive element, wire every accepted configured unavailable prop into an
actual disabled attribute, expose interaction-dependent feedback, and render
configured content. A static `style` attribute is not interaction feedback.
Every return path is checked independently, so unrelated descendants or an
alternate complete branch cannot supply missing evidence. For automatically
detected components, noninteractive return paths remain valid; an explicit
`componentNames` owner list makes every returned JSX path contractual.

Use `feedbackComponents` for primitives whose implementation already provides
press feedback. This delegates feedback only; role, state, disabled wiring, and
content must remain visible on the returned element.

When `componentNames` explicitly identifies an owner, the rule follows a
single-child wrapper chain to its interactive element. This supports provider
nesting without recursively treating arbitrary screen descendants as one
component contract.

### Contract component delegation

Use `contractComponents` when a feature wrapper renders an imported primitive
that already owns the role, accessibility state, and press feedback. The rule
then inherits only those three signals from the named JSX root. The wrapper
must still accept and forward its own configured content and disabled props;
declaring a trusted primitive does not make a fixed label or missing disabled
API pass.

```tsx
function ActionButton({ children, disabled = false, label, onPress }) {
  return (
    <Button.Root disabled={disabled} label={label} onPress={onPress}>
      {children}
    </Button.Root>
  );
}
```

### Prop forwarding

A `JSXSpreadAttribute` forwarding onto the interactive element (e.g.
`<TouchableOpacity {...rest} />`, `<button {...props} />`) satisfies role,
state, and disabled forwarding simultaneously. This is recognized when the
spread argument is the props identifier itself, a rest element pulled from
destructured props, or an identifier that can be traced back to one of those
through one level of local aliasing (e.g. `const forwarded = rest;`).

A `style` attribute given a function value whose parameter destructures one of
the configured `feedbackStateNames` (e.g. `style={({ pressed }) => [...]}`,
the common Pressable pattern) counts as press feedback.

The rule also follows one level of local `const` aliasing when checking
whether an actual disabled attribute traces back to a disabled prop, e.g.
`const isDisabled = disabled; ... disabled={isDisabled}`.

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
