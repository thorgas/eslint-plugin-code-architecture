import { expect, test } from "bun:test";
import rule from "../rules/prefer-composition-over-configuration.js";
import { lintRule } from "./rule-tester.js";

const lint = (code, options = []) =>
  lintRule({
    code,
    filename: "src/accordion.tsx",
    options,
    rule,
    ruleName: "prefer-composition-over-configuration",
  });

test("reports multiple props that conditionally assemble JSX", () => {
  const messages = lint(`function Settings({ showHeader, hideFooter }) {
  return <section>
    {showHeader && <Header />}
    {hideFooter ? null : <Footer />}
  </section>;
}`);

  expect(messages).toHaveLength(1);
  expect(messages[0]?.messageId).toBe("conditionalProps");
  expect(messages[0]?.message).toContain("hideFooter, showHeader");
});

test("reports collection and renderer props that own child assembly", () => {
  const messages = lint(`const Accordion = ({ items, renderFooter }) => (
  <section>
    {items.map((item) => <AccordionItem key={item.id} />)}
    {renderFooter()}
  </section>
);`);

  expect(messages.map(({ messageId }) => messageId).sort()).toEqual([
    "collectionProp",
    "rendererProp",
  ]);
});

test("supports props member access and configurable collection names", () => {
  const messages = lint(
    `function Table(props) {
  return <div>{props.records.map((record) => <Row key={record.id} />)}</div>;
}`,
    [{ collectionProps: ["records"] }],
  );

  expect(messages).toHaveLength(1);
  expect(messages[0]?.messageId).toBe("collectionProp");
});

test("allows behavior props, one structural toggle, and consumer composition", () => {
  const messages = lint(`function AccordionRoot({ children, open, setOpen, showBorder }) {
  return <AccordionContext.Provider value={{ open, setOpen }}>
    <div className={showBorder ? "border" : undefined}>{children}</div>
  </AccordionContext.Provider>;
}

function Example({ items }) {
  return <AccordionRoot>{items.map((item) => <AccordionItem key={item.id} />)}</AccordionRoot>;
}`);

  expect(messages).toHaveLength(0);
});

test("supports an allowlist for intentional data-driven primitives", () => {
  const messages = lint(
    `function VirtualizedList({ items }) {
  return <div>{items.map((item) => <Row key={item.id} />)}</div>;
}`,
    [{ allowedComponents: ["VirtualizedList"] }],
  );

  expect(messages).toHaveLength(0);
});
