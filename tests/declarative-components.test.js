import { expect, test } from "bun:test";
import rule from "../rules/declarative-components.js";
import { lintRule } from "./rule-tester.js";

test("declarative-components keeps React state logic out of components", () => {
  const messages = lintRule({
    code: "function CheckoutScreen() { const [open] = useState(false); return open; }",
    filename: "src/checkout/checkout-screen.tsx",
    rule,
    ruleName: "declarative-components",
  });

  expect(messages).toHaveLength(1);
  expect(messages[0]?.messageId).toBe("forbiddenHook");
});

test("declarative-components bounds actors, inline behavior, and error handling", () => {
  const messages = lintRule({
    code: `const CheckoutScreen = () => {
  React.useEffect();
  useMachine(firstMachine);
  useActor(secondMachine);
  const submit = () => true;
  try { submit(); } catch (error) { send({ type: "failed", error }); }
  return null;
};`,
    filename: "src/checkout/checkout-screen.tsx",
    rule,
    ruleName: "declarative-components",
  });

  expect(messages.map(({ messageId }) => messageId).sort()).toEqual([
    "errorHandling",
    "forbiddenHook",
    "inlineFunction",
    "multipleActors",
  ]);
});
