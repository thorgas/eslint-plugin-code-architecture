import { expect, test } from "bun:test";
import rule from "../rules/max-function-lines.js";
import { lintRule } from "./rule-tester.js";

test("max-function-lines enforces the configured physical line limit", () => {
  const messages = lintRule({
    code: `function oversized() {
  const first = 1;
  const second = 2;
  return first + second;
}`,
    options: [{ max: 4 }],
    rule,
    ruleName: "max-function-lines",
  });

  expect(messages).toHaveLength(1);
  expect(messages[0]?.messageId).toBe("tooManyLines");
});

test("max-function-lines can exclude blank physical lines", () => {
  const messages = lintRule({
    code: "function compact() {\n\n  return true;\n}",
    options: [{ max: 3, skipBlankLines: true }],
    rule,
    ruleName: "max-function-lines",
  });

  expect(messages).toHaveLength(0);
});

test("max-function-lines can exclude JSX UI functions", () => {
  const messages = lintRule({
    code: `function Screen() {
  const title = "Settings";
  const description = "Manage preferences";
  return <ScreenLayout title={title}>{description}</ScreenLayout>;
}

const Icon = () => (
  <svg>
    <path />
  </svg>
);`,
    filename: "src/screen.tsx",
    options: [{ ignoreJSX: true, max: 3 }],
    rule,
    ruleName: "max-function-lines",
  });

  expect(messages).toHaveLength(0);
});

test("max-function-lines still checks logic functions in UI files", () => {
  const messages = lintRule({
    code: `function calculateLayout() {
  const first = 1;
  const second = 2;
  return first + second;
}`,
    filename: "src/screen.tsx",
    options: [{ ignoreJSX: true, max: 4 }],
    rule,
    ruleName: "max-function-lines",
  });

  expect(messages).toHaveLength(1);
});

test("max-function-lines assigns JSX to the nearest function", () => {
  const messages = lintRule({
    code: `function buildModel() {
  const renderIcon = () => <Icon />;
  const first = 1;
  const second = 2;
  return { first, renderIcon, second };
}`,
    filename: "src/screen.tsx",
    options: [{ ignoreJSX: true, max: 4 }],
    rule,
    ruleName: "max-function-lines",
  });

  expect(messages).toHaveLength(1);
  expect(messages[0]?.line).toBe(1);
});

test("max-function-lines preserves the default limit for JSX functions", () => {
  const messages = lintRule({
    code: `function Screen() {
  const title = "Settings";
  const description = "Manage preferences";
  return <ScreenLayout title={title}>{description}</ScreenLayout>;
}`,
    filename: "src/screen.tsx",
    options: [{ max: 4 }],
    rule,
    ruleName: "max-function-lines",
  });

  expect(messages).toHaveLength(1);
});
