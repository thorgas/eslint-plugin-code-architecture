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

test("reports component-valued props rendered as JSX or called directly", () => {
  const messages = lint(`function Panel({ FooterComponent, renderHeader }) {
  return <section><FooterComponent />{renderHeader()}</section>;
}
function SlotsPanel({ slots }) {
  return <slots.Footer />;
}`);

  expect(messages.map(({ messageId }) => messageId)).toEqual([
    "rendererProp",
    "rendererProp",
    "rendererProp",
  ]);
});

test("reports chained, optional, and aliased collection mapping", () => {
  const messages = lint(`function List({ items }) {
  const visibleItems = items.filter(isVisible);
  const rows = visibleItems;
  return <section>
    {items.filter(isVisible).map((item) => <Row item={item} />)}
    {items?.map((item) => <Row item={item} />)}
    {rows.map((item) => <Row item={item} />)}
  </section>;
}`);

  expect(messages).toHaveLength(3);
  expect(
    messages.every(({ messageId }) => messageId === "collectionProp"),
  ).toBe(true);
});

test("reports structural variants and JSX assembled by a local helper", () => {
  const messages = lint(`function Settings({ layout, showHeader, showFooter }) {
  function content() {
    if (layout === "compact") return <Compact><Field /></Compact>;
    if (layout === "full") return <Full><Field /><Actions /></Full>;
    return null;
  }
  return <section>
    {showHeader && <Header />}
    {content()}
    {showFooter && <Footer />}
  </section>;
}`);

  expect(messages.map(({ messageId }) => messageId).sort()).toEqual([
    "conditionalProps",
    "variantProp",
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

test("allows visual props and collection mapping owned by the consumer", () => {
  const messages = lint(`function Button({ color, size, disabled, children }) {
  return <button className={color + size} disabled={disabled}>{children}</button>;
}
function Example({ items }) {
  return <List.Root>
    {items.filter(isVisible).map((item) => <List.Row key={item.id} />)}
  </List.Root>;
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
