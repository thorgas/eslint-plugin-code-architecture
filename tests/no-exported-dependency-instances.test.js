import { expect, test } from "bun:test";
import rule from "../rules/no-exported-dependency-instances.js";
import { lintRule } from "./rule-tester.js";

const lint = (code) =>
  lintRule({
    code,
    rule,
    ruleName: "no-exported-dependency-instances",
  });

test("no-exported-dependency-instances accepts factories and local composition roots", () => {
  expect(
    lint(`
      export const createLogger = (): Logger => ({ log: console.log });
      const logger = createLogger();
      export const parsed = parseConfig();
    `),
  ).toHaveLength(0);
});

test("no-exported-dependency-instances rejects matching exported factory instances", () => {
  const messages = lint(`
    export const logger = createLogger();
    export const db = createDb("url");
    export const time = new Time();
    const config = createConfig();
    export { config };
  `);

  expect(messages).toHaveLength(4);
  expect(messages.every(({ messageId }) => messageId === "exportedInstance")).toBe(
    true,
  );
});
