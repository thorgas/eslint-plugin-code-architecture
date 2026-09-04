import { expect, test } from "bun:test";
import rule from "../rules/prefer-arrow-functions.js";
import { lintRule } from "./rule-tester.js";

const lint = (code, options = [], filename = "src/example.ts") =>
  lintRule({ code, filename, options, rule, ruleName: "prefer-arrow-functions" });

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

test("prefer-arrow-functions supports framework and semantic exemptions", () => {
  expect(
    lint(
      `
        export default function Route() {}
        export function loader() {}
        function* identifiers() { yield 1; }
        function factorial(value) { return value <= 1 ? 1 : value * factorial(value - 1); }
      `,
      [{
        allowDefaultExports: true,
        allowGenerators: true,
        allowNamedExports: true,
        allowRecursive: true,
      }],
      "src/routes/profile.ts",
    ),
  ).toHaveLength(0);
});

test("prefer-arrow-functions supports hoisted, named, and file exemptions", () => {
  expect(
    lint(
      `
        run();
        function run() {}
        function frameworkEntry() {}
      `,
      [{ allowHoisted: true, allowedNames: ["framework*"] }],
    ),
  ).toHaveLength(0);
  expect(
    lint(`function route() {}`, [{ allowedFiles: ["**/routes/**"] }], "src/routes/a.ts"),
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

test("prefer-arrow-functions ignores class methods, object methods, and accessors", () => {
  expect(
    lint(`
      class Repo {
        constructor() {}
        getAll() { return []; }
        get size() { return 0; }
        set size(value) {}
      }
      const obj = {
        method() {},
        get value() { return 1; },
        set value(v) {},
      };
    `),
  ).toHaveLength(0);
});
