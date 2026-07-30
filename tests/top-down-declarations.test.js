import { expect, test } from "bun:test";
import rule from "../rules/top-down-declarations.js";
import { lintRule } from "./rule-tester.js";

const lint = (code) =>
  lintRule({ code, rule, ruleName: "top-down-declarations" });

test("top-down-declarations accepts public contract, supporting types, implementation, details", () => {
  expect(
    lint(`
      export interface Foo { readonly bar: Bar }
      interface Bar { readonly value: string }
      export const foo = (): Foo => ({ bar: createBar() });
      const createBar = (): Bar => ({ value: "bar" });
    `),
  ).toHaveLength(0);
});

test("top-down-declarations rejects a public contract below implementation details", () => {
  const messages = lint(`
    const createBar = (): Bar => ({ value: "bar" });
    export interface Foo { readonly bar: Bar }
  `);

  expect(messages).toHaveLength(1);
  expect(messages[0]?.messageId).toBe("declarationOrder");
});
