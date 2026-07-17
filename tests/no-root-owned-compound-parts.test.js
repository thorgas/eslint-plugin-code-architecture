import { expect, test } from "bun:test";
import rule from "../rules/no-root-owned-compound-parts.js";
import { lintRule } from "./rule-tester.js";

const lint = (code, options = []) =>
  lintRule({
    code,
    filename: "src/accordion.tsx",
    options,
    rule,
    ruleName: "no-root-owned-compound-parts",
  });

test("reports namespaced and direct compound parts owned by a root", () => {
  const messages = lint(`function AccordionRoot({ children }) {
  return <AccordionContext.Provider value={{}}>
    <Accordion.Item />
    <AccordionTrigger />
    {children}
  </AccordionContext.Provider>;
}`);

  expect(messages).toHaveLength(2);
  expect(messages.every(({ messageId }) => messageId === "ownedPart")).toBe(
    true,
  );
});

test("infers the namespace from a compound object export", () => {
  const messages = lint(`const Root = ({ children }) => <div><Menu.Item />{children}</div>;
const Item = (props) => <div {...props} />;
export const Menu = { Root, Item };
export const Tabs = {
  Root: ({ children }) => <div><Tabs.Trigger />{children}</div>,
  Trigger: (props) => <button {...props} />,
};`);

  expect(messages).toHaveLength(2);
  expect(messages.every(({ messageId }) => messageId === "ownedPart")).toBe(
    true,
  );
});

test("allows infrastructure, platform primitives, and foreign compounds", () => {
  const messages = lint(`function AccordionRoot({ children }) {
  return <AccordionContext.Provider value={{}}>
    <View><Dialog.Root>{children}</Dialog.Root></View>
  </AccordionContext.Provider>;
}`);

  expect(messages).toHaveLength(0);
});

test("checks assembly inside anonymous render callbacks", () => {
  const messages = lint(`function AccordionRoot({ children, items }) {
  return <div>{items.map(() => <Accordion.Item />)}{children}</div>;
}`);

  expect(messages).toHaveLength(1);
  expect(messages[0]?.messageId).toBe("ownedPart");
});

test("supports explicit infrastructure exceptions", () => {
  const messages = lint(
    `function AccordionRoot({ children }) {
  return <Accordion.Container>{children}</Accordion.Container>;
}`,
    [{ allowedParts: ["Container"] }],
  );

  expect(messages).toHaveLength(0);
});
