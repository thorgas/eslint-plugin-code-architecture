import { expect, test } from "bun:test";
import rule from "../rules/prefer-arrow-functions.js";
import { lintRule } from "./rule-tester.js";

const lint = (code) =>
  lintRule({ code, rule, ruleName: "prefer-arrow-functions" });

test("prefer-arrow-functions accepts arrows and TypeScript overloads", () => {
  expect(
    lint(`
      export const createUser = (data: UserData): User => ({ data });
      export function mapArray<T, U>(values: ReadonlyArray<T>, map: (value: T) => U): ReadonlyArray<U>;
      export function mapArray<T, U>(values: ReadonlyArray<T>, map: (value: T) => U): ReadonlyArray<U> {
        return values.map(map);
      }
    `),
  ).toHaveLength(0);
});

test("prefer-arrow-functions rejects ordinary function declarations and expressions", () => {
  const messages = lint(`
    export function createUser() {}
    const run = function () {};
    if (true) {
      function nested() {}
      nested();
    }
  `);

  expect(messages).toHaveLength(3);
  expect(messages.every(({ messageId }) => messageId === "useArrow")).toBe(true);
});
