import { expect, test } from "bun:test";
import rule from "../rules/require-consumer-owned-compound-usage.js";
import { lintRule } from "./rule-tester.js";

const lint = (code, options = []) =>
  lintRule({
    code,
    filename: "src/example.tsx",
    options,
    rule,
    ruleName: "require-consumer-owned-compound-usage",
  });

test("accepts consumer-selected same-namespace parts at any depth", () => {
  const messages = lint(`import { Counter } from "./counter";
import * as Dialog from "./dialog";
function Example({ showDisplay }) {
  return <Counter.Provider>
    {showDisplay && <Counter.Display />}
    <View><Counter.Increment /></View>
    <Dialog.Root><Dialog.Content /></Dialog.Root>
  </Counter.Provider>;
}`);

  expect(messages).toHaveLength(0);
});

test("rejects self-closing and fixed-layout-only boundaries", () => {
  const messages = lint(`import { Counter } from "./counter";
function Example() {
  return <><Counter.Provider /><Counter.Provider>
    <FixedCounterLayout />
  </Counter.Provider></>;
}`);

  expect(messages.map(({ messageId }) => messageId).sort()).toEqual([
    "missingParts",
    "selfClosingBoundary",
  ]);
});

test("allows configured headless providers", () => {
  const messages = lint(
    `import { Actor } from "./actor";
function Example() {
  return <Actor.Provider><App /></Actor.Provider>;
}`,
    [{ headlessCompounds: ["Actor"] }],
  );

  expect(messages).toHaveLength(0);
});

test("ignores underlying context providers", () => {
  const messages = lint(`const CounterContext = createContext(null);
function Example({ children }) {
  return <CounterContext.Provider value={null}>{children}</CounterContext.Provider>;
}`);

  expect(messages).toHaveLength(0);
});

test("supports aliases and configured boundary member names", () => {
  const messages = lint(
    `import { Counter as Count } from "./counter";
function Example() {
  return <Count.Container><Count.Display /></Count.Container>;
}`,
    [{ boundaryMembers: ["Container"] }],
  );

  expect(messages).toHaveLength(0);
});
