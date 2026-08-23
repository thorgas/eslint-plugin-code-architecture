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
