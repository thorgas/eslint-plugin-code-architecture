import { expect, test } from "bun:test";
import rule from "../rules/named-imports.js";
import { lintRule } from "./rule-tester.js";

const lint = (code) => lintRule({ code, rule, ruleName: "named-imports" });

test("named-imports accepts named and side-effect imports", () => {
  expect(
    lint('import { bar, baz as qux } from "./foo.js"; import "./setup.js";'),
  ).toHaveLength(0);
});

test("named-imports rejects default and namespace imports", () => {
  const messages = lint(`
    import Foo from "./foo.js";
    import * as Utils from "./utils.js";
  `);

  expect(messages.map(({ messageId }) => messageId)).toEqual([
    "useNamedImports",
    "useNamedImports",
  ]);
});
