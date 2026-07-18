import { expect, test } from "bun:test";
import rule from "../rules/require-compound-component-api.js";
import { lintRule } from "./rule-tester.js";

const lint = (code, options = []) =>
  lintRule({
    code,
    filename: "src/counter.tsx",
    options,
    rule,
    ruleName: "require-compound-component-api",
  });

test("accepts an exported object API with a boundary and public parts", () => {
  const messages = lint(`const CounterProvider = ({ children }) => <div>{children}</div>;
const CounterDisplay = () => <output />;
const CounterIncrement = () => <button />;
export const Counter = {
  Provider: CounterProvider,
  Display: CounterDisplay,
  Increment: CounterIncrement,
};`);

  expect(messages).toHaveLength(0);
});

test("rejects private and boundary-only compound APIs", () => {
  const messages = lint(`const CounterProvider = ({ children }) => <div>{children}</div>;
const CounterDisplay = () => <output />;
const Counter = {
  Provider: CounterProvider,
  Display: CounterDisplay,
  Increment: () => <button />,
};
export const Menu = { Provider: CounterProvider };`);

  expect(messages.map(({ messageId }) => messageId).sort()).toEqual([
    "insufficientParts",
    "privateApi",
  ]);
});

test("requires component bindings and unique role bindings", () => {
  const messages = lint(`const CounterProvider = ({ children }) => <div>{children}</div>;
const CounterDisplay = () => <output />;
export const Counter = {
  Provider: CounterProvider,
  Display: CounterDisplay,
  Value: CounterDisplay,
  Increment: "button",
};`);

  expect(messages.map(({ messageId }) => messageId).sort()).toEqual([
    "duplicateBinding",
    "invalidMember",
  ]);
});

test("supports configured boundary names and minimum part count", () => {
  const messages = lint(
    `const Shell = ({ children }) => <div>{children}</div>;
const Item = () => <span />;
export const Menu = { Container: Shell, Item };`,
    [{ boundaryMembers: ["Container"], minimumParts: 1 }],
  );

  expect(messages).toHaveLength(0);
});

test("supports aliases and configured component wrappers", () => {
  const messages = lint(
    `const ProviderImpl = ({ children }) => <div>{children}</div>;
const WrappedProvider = observe(ProviderImpl);
const Part = () => <span />;
const PartAlias = Part;
export const Menu = {
  Container: WrappedProvider,
  Item: PartAlias,
};`,
    [{
      boundaryMembers: ["Container"],
      minimumParts: 1,
      wrapperNames: ["observe"],
    }],
  );

  expect(messages).toHaveLength(0);
});

test("does not force ordinary objects or components into compound APIs", () => {
  const messages = lint(`const CounterContext = { Provider: ContextProvider };
export const theme = { mode: "dark" };
export function Screen() { return <main />; }`);

  expect(messages).toHaveLength(0);
});
