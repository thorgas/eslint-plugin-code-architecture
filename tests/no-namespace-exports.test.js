import { expect, test } from "bun:test";
import rule from "../rules/no-namespace-exports.js";
import { lintRule } from "./rule-tester.js";

const lint = (code, options) =>
  lintRule({
    code,
    options: options ? [options] : [],
    rule,
    ruleName: "no-namespace-exports",
  });

const messageIds = (messages) => messages.map(({ messageId }) => messageId);

test("no-namespace-exports accepts individually exported members", () => {
  expect(
    lint("export const ok = () => true; export const trySync = () => {};"),
  ).toHaveLength(0);
});

test("no-namespace-exports rejects exported objects that bundle behavior", () => {
  const messages = lint(`
    const ok = () => true;
    function trySync() {}
    export const Utils = { ok, trySync };
    const Result = { ok };
    export { Result };
    export const api = {
      load: async () => null,
      save() {},
    };
    export const wrapped = Object.freeze({ run: () => 1 } as const);
    export default { parse: () => 1 };
  `);

  expect(messageIds(messages)).toEqual(Array(5).fill("exportMembers"));
});

test("no-namespace-exports accepts exported data objects", () => {
  expect(
    lint(`
      export const tabScreenContentStyle = { paddingHorizontal: 16, gap: 8 };
      export const ReduceMotion = { Always: "always", Never: "never" };
      export const migration = {
        id: "occurrence-time",
        statements: ["DEFINE FIELD occurredAt ON TABLE checkIn TYPE datetime"],
      };
      export const onboardingExampleSelection = {
        emotion: EMOTIONS.calm,
        beliefs: [beliefA, beliefB],
        nested: { limit: 3 },
      };
      export const config = Object.freeze({ retries: 3 });
      export const Empty = {};
      const label = "x";
      export const labels = { label };
    `),
  ).toHaveLength(0);
});

test("no-namespace-exports accepts compound-component objects unless configured otherwise", () => {
  const code = `
    const Root = () => null;
    const Title = () => null;
    export const Card = { Root, Title };
  `;

  expect(lint(code)).toHaveLength(0);
  expect(messageIds(lint(code, { allowCompoundComponents: false }))).toEqual([
    "exportMembers",
  ]);
});

test("no-namespace-exports rejects exported TypeScript namespaces but not ambient ones", () => {
  const messages = lint(`
    export namespace Utils {
      export const ok = () => true;
    }
    export declare namespace Ambient {
      const version: string;
    }
  `);

  expect(messageIds(messages)).toEqual(["exportNamespace"]);
});
