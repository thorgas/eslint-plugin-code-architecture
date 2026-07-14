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
