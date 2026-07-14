import { expect, test } from "bun:test";
import rule from "../rules/require-assertions.js";
import { lintRule } from "./rule-tester.js";

test("require-assertions reports a function below the configured assertion density", () => {
  const messages = lintRule({
    code: "function transfer(source, target) { return source - target; }",
    options: [{ minimum: 2 }],
    rule,
    ruleName: "require-assertions",
  });

  expect(messages).toHaveLength(1);
  expect(messages[0]?.messageId).toBe("insufficientAssertions");
});

test("require-assertions counts direct and qualified assertions per function", () => {
  const messages = lintRule({
    code: `function transfer(source, target) {
  assertDefined(source);
  nodeAssert.ok(target);
  return source - target;
}
const identity = (value) => value;`,
    rule,
    ruleName: "require-assertions",
  });

  expect(messages).toHaveLength(0);
});
