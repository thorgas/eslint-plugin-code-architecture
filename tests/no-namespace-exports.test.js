import { expect, test } from "bun:test";
import rule from "../rules/no-namespace-exports.js";
import { lintRule } from "./rule-tester.js";

const lint = (code) =>
  lintRule({ code, rule, ruleName: "no-namespace-exports" });

test("no-namespace-exports accepts individually exported members", () => {
  expect(
    lint("export const ok = () => true; export const trySync = () => {};"),
  ).toHaveLength(0);
});

test("no-namespace-exports rejects exported object namespaces", () => {
  const messages = lint(`
    const ok = () => true;
    const trySync = () => {};
    export const Utils = { ok, trySync };
    const Result = { ok };
    export { Result };
  `);

  expect(messages).toHaveLength(2);
  expect(messages.every(({ messageId }) => messageId === "exportMembers")).toBe(
    true,
  );
});
