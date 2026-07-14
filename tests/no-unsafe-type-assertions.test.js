import { expect, test } from "bun:test";
import rule from "../rules/no-unsafe-type-assertions.js";
import { lintRule } from "./rule-tester.js";

test("no-unsafe-type-assertions rejects TypeScript as-casts", () => {
  const messages = lintRule({
    code: "const user = input as User;",
    rule,
    ruleName: "no-unsafe-type-assertions",
  });

  expect(messages).toHaveLength(1);
  expect(messages[0]?.messageId).toBe("typeAssertion");
});

test("no-unsafe-type-assertions permits const but rejects non-null and angle casts", () => {
  const messages = lintRule({
    code: "const values = [1] as const; const item = values[0]!; const user = <User>input;",
    rule,
    ruleName: "no-unsafe-type-assertions",
  });

  expect(messages.map(({ messageId }) => messageId).sort()).toEqual([
    "nonNullAssertion",
    "typeAssertion",
  ]);
});
