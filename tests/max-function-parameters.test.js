import { expect, test } from "bun:test";
import rule from "../rules/max-function-parameters.js";
import { lintRule } from "./rule-tester.js";

test("max-function-parameters rejects excess positional inputs", () => {
  const messages = lintRule({
    code: "function transfer(source, target, amount) { return amount; }",
    options: [{ max: 2 }],
    rule,
    ruleName: "max-function-parameters",
  });

  expect(messages).toHaveLength(1);
  expect(messages[0]?.messageId).toBe("tooManyParameters");
});
