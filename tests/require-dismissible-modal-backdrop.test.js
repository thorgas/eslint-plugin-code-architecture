import { expect, test } from "bun:test";
import rule from "../rules/require-dismissible-modal-backdrop.js";
import { lintRule } from "./rule-tester.js";

const options = [
  {
    surfaces: [
      {
        backdropElements: ["Pressable"],
        name: "Modal",
        outsidePressAttributes: ["onPress"],
        requestCloseAttributes: ["onRequestClose"],
        transparentAttribute: "transparent",
      },
      {
        backdropElements: ["button"],
        name: "dialog",
        outsidePressAttributes: ["onClick"],
        requestCloseAttributes: ["onClose"],
        transparentAttribute: "data-transparent",
      },
    ],
  },
];

const lint = (code) =>
  lintRule({
    code,
    filename: "src/components/ui/dialog.tsx",
    options,
    rule,
    ruleName: "require-dismissible-modal-backdrop",
  });

test("require-dismissible-modal-backdrop accepts close and backdrop paths", () => {
  const messages = lint(`<Modal transparent onRequestClose={close}>
    <Pressable onPress={close}><DialogContent /></Pressable>
  </Modal>;`);

  expect(messages).toHaveLength(0);
});

test("require-dismissible-modal-backdrop reports each missing path", () => {
  const messages = lint(`<>
    <Modal transparent><View /></Modal>
    <dialog data-transparent onClose={close}><View /></dialog>
  </>;`);

  expect(messages).toHaveLength(2);
  expect(messages[0]?.message).toContain("request-close behavior");
  expect(messages[0]?.message).toContain("outside-press dismissal");
  expect(messages[1]?.message).toContain("outside-press dismissal");
});

test("require-dismissible-modal-backdrop ignores opaque surfaces", () => {
  expect(lint("<Modal><View /></Modal>;")).toHaveLength(0);
});

test("require-dismissible-modal-backdrop ignores unconfigured surfaces", () => {
  expect(lint("<Sheet transparent><View /></Sheet>;")).toHaveLength(0);
});
