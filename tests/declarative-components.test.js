import { expect, test } from "bun:test";
import rule from "../rules/declarative-components.js";
import { lintRule } from "./rule-tester.js";

test("declarative-components keeps React state logic out of components", () => {
  const messages = lintRule({
    code: "function CheckoutScreen() { const [open] = useState(false); return <div>{open}</div>; }",
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
  return <div />;
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

test("declarative-components allows inline JSX callback props, map callbacks, and useCallback bodies", () => {
  const messages = lintRule({
    code: `function Screen({ actor, items }) {
  const onPress = useCallback(() => { actor.send("x"); }, [actor]);
  return (
    <div>
      <Button onPress={() => actor.send("x")} />
      {items.map((item) => <Row key={item.id} item={item} />)}
      <button onClick={onPress} />
    </div>
  );
}`,
    filename: "src/screen.tsx",
    rule,
    ruleName: "declarative-components",
  });

  expect(messages).toHaveLength(0);
});

test("declarative-components ignores capitalized functions that never return JSX", () => {
  const messages = lintRule({
    code: `function ComputeTotal() {
  const [count] = useState(0);
  return count;
}`,
    filename: "src/util.ts",
    rule,
    ruleName: "declarative-components",
  });

  expect(messages).toHaveLength(0);
});
