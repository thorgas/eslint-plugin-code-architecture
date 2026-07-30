import { expect, test } from "bun:test";
import rule from "../rules/prefer-interface-over-type.js";
import { lintRule } from "./rule-tester.js";

const lint = (code) =>
  lintRule({ code, rule, ruleName: "prefer-interface-over-type" });

test("prefer-interface-over-type accepts interfaces and types that need aliases", () => {
  expect(
    lint(`
      interface User { readonly id: string }
      type Status = "pending" | "done";
      type Pair = readonly [string, number];
      type Keys<T> = { readonly [K in keyof T]: K };
    `),
  ).toHaveLength(0);
});

test("prefer-interface-over-type rejects object type aliases", () => {
  const messages = lint("type User = { readonly id: string };");

  expect(messages).toHaveLength(1);
  expect(messages[0]?.messageId).toBe("useInterface");
});
