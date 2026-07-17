import { expect, test } from "bun:test";
import rule from "../rules/require-composable-root-children.js";
import { lintRule } from "./rule-tester.js";

const lint = (code, options = []) =>
  lintRule({
    code,
    filename: "src/accordion.tsx",
    options,
    rule,
    ruleName: "require-composable-root-children",
  });

test("requires roots to accept children", () => {
  const messages = lint(
    "function AccordionRoot({ open }) { return <section />; }",
  );

  expect(messages).toHaveLength(1);
  expect(messages[0]?.messageId).toBe("missingChildren");
});

test("requires providers to return accepted children", () => {
  const messages = lint(
    "const SettingsProvider = ({ children }) => <Context.Provider value={{}}><FixedLayout /></Context.Provider>;",
  );

  expect(messages).toHaveLength(1);
  expect(messages[0]?.messageId).toBe("unrenderedChildren");
});

test("allows destructured and props member children", () => {
  const messages = lint(`function AccordionRoot({ children }) {
  return <Context.Provider value={{}}><div>{children}</div></Context.Provider>;
}
const SettingsProvider = (props) => <Context.Provider value={{}}>{props.children}</Context.Provider>;`);

  expect(messages).toHaveLength(0);
});

test("does not mistake a nested callback return for root rendering", () => {
  const messages = lint(`function AccordionRoot({ children }) {
  const render = () => children;
  return <section>{render()}</section>;
}
const MenuRoot = ({ children }) => <Slot>{() => children}</Slot>;`);

  expect(messages).toHaveLength(2);
  expect(
    messages.every(({ messageId }) => messageId === "unrenderedChildren"),
  ).toBe(true);
});

test("supports custom root component naming", () => {
  const messages = lint(
    "const CompositionBoundary = () => <div />;",
    [{ componentNamePattern: "Boundary$" }],
  );

  expect(messages).toHaveLength(1);
  expect(messages[0]?.messageId).toBe("missingChildren");
});
