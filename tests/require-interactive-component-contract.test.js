import { expect, test } from "bun:test";
import rule from "../rules/require-interactive-component-contract.js";
import { lintRule } from "./rule-tester.js";

const options = [{ componentNames: ["Button", "IconButton"] }];

const lint = (code) =>
  lintRule({
    code,
    filename: "src/components/ui/button.tsx",
    options,
    rule,
    ruleName: "require-interactive-component-contract",
  });

test("require-interactive-component-contract accepts a complete contract", () => {
  const messages = lint(`function Button({ children, disabled }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        style={({ pressed }) => [styles.root, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }`);

  expect(messages).toHaveLength(0);
});

test("require-interactive-component-contract reports missing contract parts", () => {
  const messages = lint(`function Button({ label }) {
    return <Pressable onPress={save}>{label}</Pressable>;
  }`);

  expect(messages).toHaveLength(1);
  expect(messages[0]?.message).toContain("accessibility role");
  expect(messages[0]?.message).toContain("disabled behavior");
  expect(messages[0]?.message).toContain("press feedback");
  expect(messages[0]?.message).toContain("configurable content");
});

test("require-interactive-component-contract requires disabled wiring", () => {
  const messages = lint(`function Button({ children, disabled }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: false }}
        android_ripple={{ color: theme.ripple }}
      >
        {children}
      </Pressable>
    );
  }`);

  expect(messages).toHaveLength(1);
  expect(messages[0]?.message).toContain("disabled behavior");
});

test("require-interactive-component-contract ignores other components", () => {
  expect(lint("function Card() { return <View />; }")).toHaveLength(0);
});
