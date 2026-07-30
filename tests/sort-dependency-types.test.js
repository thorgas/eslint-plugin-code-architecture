import { expect, test } from "bun:test";
import rule from "../rules/sort-dependency-types.js";
import { lintRule } from "./rule-tester.js";

const lint = (code) =>
  lintRule({ code, rule, ruleName: "sort-dependency-types" });

test("sort-dependency-types accepts alphabetically sorted dependency intersections", () => {
  expect(
    lint("type AppDeps = LoggerDep & Partial<TimeDep>;"),
  ).toHaveLength(0);
});

test("sort-dependency-types rejects unsorted dependency intersections", () => {
  const messages = lint(
    "type AppDeps = TimeDep & Partial<LoggerDep> & ConfigDep;",
  );

  expect(messages).toHaveLength(1);
  expect(messages[0]?.messageId).toBe("sortDependencies");
});

test("sort-dependency-types ignores intersections that refine an existing deps type", () => {
  expect(
    lint(
      "type AppInstanceDeps = Omit<AppDeps, keyof CreateDriverDep> & SqliteDep;",
    ),
  ).toHaveLength(0);
});
