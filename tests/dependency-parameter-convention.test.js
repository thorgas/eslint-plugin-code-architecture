import { expect, test } from "bun:test";
import rule from "../rules/dependency-parameter-convention.js";
import { lintRule } from "./rule-tester.js";

const lint = (code) =>
  lintRule({
    code,
    rule,
    ruleName: "dependency-parameter-convention",
  });

test("dependency-parameter-convention accepts a single deps argument and currying", () => {
  expect(
    lint(`
      const timeUntilEvent =
        (deps: LoggerDep & TimeDep) =>
        (eventTimestamp: number) => eventTimestamp - deps.time.now();
    `),
  ).toHaveLength(0);
});

test("dependency-parameter-convention rejects renamed and mixed dependency arguments", () => {
  const messages = lint(`
    const renamed = (dependencies: TimeDep) => dependencies.time.now();
    const mixed = (deps: TimeDep, eventTimestamp: number) => eventTimestamp;
  `);

  expect(messages.map(({ messageId }) => messageId)).toEqual([
    "nameDeps",
    "singleDepsArgument",
  ]);
});
