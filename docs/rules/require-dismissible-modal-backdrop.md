# require-dismissible-modal-backdrop

Requires configured transparent modal or dialog surfaces to expose both request-close behavior and an outside-press dismissal element.

```js
"code-architecture/require-dismissible-modal-backdrop": ["error", {
  surfaces: [
    {
      name: "Modal",
      transparentAttribute: "transparent",
      requestCloseAttributes: ["onRequestClose"],
      backdropElements: ["Pressable"],
      outsidePressAttributes: ["onPress"],
    },
    {
      name: "dialog",
      transparentAttribute: "data-transparent",
      requestCloseAttributes: ["onClose"],
      backdropElements: ["button"],
      outsidePressAttributes: ["onClick"],
    },
  ],
}]
```

Only surfaces with a bare or statically `true` transparent attribute are inspected. The rule requires the configured attributes and descendant backdrop element; it does not execute handlers or prove that two handlers are behaviorally identical.

This rule is excluded from every preset. Enable it after the matching dialog primitive and dismissal pattern exist.

## Production-derived example

This is a redacted version of a transparent picker used in a private React
Native app. The first version handled the Android close request but left no
obvious outside-press path:

```tsx
// Before: the dimmed area is visual only.
<Modal transparent visible={open} onRequestClose={closePicker}>
  <View style={styles.backdrop}>
    <PickerCard items={items} />
  </View>
</Modal>
```

The production pattern makes both dismissal paths explicit:

```tsx
// After: hardware close and backdrop press share one handler.
<Modal transparent visible={open} onRequestClose={closePicker}>
  <View style={styles.layer}>
    <Pressable
      accessibilityElementsHidden
      importantForAccessibility="no"
      onPress={closePicker}
      style={styles.backdrop}
      testID="picker-backdrop"
    />
    <View accessibilityViewIsModal>
      <PickerCard items={items} />
    </View>
  </View>
</Modal>
```

The explicit backdrop gives tests a deterministic dismissal target. Agents do
not need to infer whether a transparent modal is intentionally trapped or
simply missing behavior, so UI changes stay quick and reviewable.
