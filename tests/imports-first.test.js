import { expect, test } from "bun:test";
import rule from "../rules/imports-first.js";
import { lintRule } from "./rule-tester.js";

test("imports-first rejects imports declared after executable code", () => {
  const messages = lintRule({
    code: 'const ready = true;\nimport { start } from "./start.js";',
    rule,
    ruleName: "imports-first",
  });

  expect(messages).toHaveLength(1);
  expect(messages[0]?.messageId).toBe("lateImport");
});
