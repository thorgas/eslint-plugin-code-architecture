import { expect, test } from "bun:test";
import rule from "../rules/dependency-wrapper-shape.js";
import { lintRule } from "./rule-tester.js";

const lint = (code) =>
  lintRule({
    code,
    rule,
    ruleName: "dependency-wrapper-shape",
  });

test("dependency-wrapper-shape accepts one readonly, distinctly named dependency", () => {
  expect(
    lint(`
      interface Time { readonly now: () => number }
      interface TimeDep { readonly time: Time }
      type CreateLogger = () => Logger;
      interface CreateLoggerDep { readonly createLogger: CreateLogger }
    `),
  ).toHaveLength(0);
});

test("dependency-wrapper-shape rejects mutable, mismatched, and generic wrappers", () => {
  const messages = lint(`
    interface TimeDep<T> { time: T; readonly logger: Logger }
    type LoggerDep = { readonly value: Logger };
    interface ConfigDep { readonly config: RuntimeConfig }
  `);

  expect(messages.map(({ messageId }) => messageId)).toEqual([
    "singleProperty",
    "noGenericWrapper",
    "propertyName",
    "propertyType",
  ]);
});
