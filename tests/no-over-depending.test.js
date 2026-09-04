import { expect, test } from "bun:test";
import rule from "../rules/no-over-depending.js";
import { lintRule } from "./rule-tester.js";

const lint = (code) =>
  lintRule({ code, rule, ruleName: "no-over-depending" });

test("no-over-depending accepts every declared dependency being used", () => {
  expect(
    lint(`
      const run = (deps: LoggerDep & TimeDep) => {
        deps.logger.log(String(deps.time.now()));
      };
    `),
  ).toHaveLength(0);
});

test("no-over-depending rejects unused required dependencies", () => {
  const messages = lint(`
    const run = (deps: LoggerDep & TimeDep) => {
      deps.logger.log("running");
    };
  `);

  expect(messages).toHaveLength(1);
  expect(messages[0]?.messageId).toBe("unusedDependency");
  expect(messages[0]?.message).toContain("TimeDep");
  expect(messages[0]?.message).toContain("deps.time");
});

test("no-over-depending counts use from nested callbacks", () => {
  expect(
    lint(`
      const run = (deps: TimeDep) => {
        return () => deps.time.now();
      };
    `),
  ).toHaveLength(0);
});

test("no-over-depending permits over-providing the whole deps object", () => {
  expect(
    lint(`
      const app = (deps: LoggerDep & TimeDep) => {
        doSomethingWithLogger(deps);
        doSomethingWithTime(deps);
      };
    `),
  ).toHaveLength(0);
});

test("no-over-depending counts destructured properties as used", () => {
  expect(
    lint(`
      const run = (deps: LoggerDep & TimeDep) => {
        const { logger, time } = deps;
        logger.log(String(time.now()));
      };
    `),
  ).toHaveLength(0);
});

test("no-over-depending rejects unused destructured properties", () => {
  const messages = lint(`
    const run = (deps: LoggerDep & TimeDep) => {
      const { logger } = deps;
      logger.log("running");
    };
  `);

  expect(messages).toHaveLength(1);
  expect(messages[0]?.message).toContain("TimeDep");
});

test("no-over-depending treats rest destructuring as using everything", () => {
  expect(
    lint(`
      const run = (deps: LoggerDep & TimeDep) => {
        const { logger, ...rest } = deps;
        logger.log("running");
        void rest;
      };
    `),
  ).toHaveLength(0);
});

test("no-over-depending treats aliasing deps to another variable as using everything", () => {
  expect(
    lint(`
      const run = (deps: LoggerDep & TimeDep) => {
        const d = deps;
        d.logger.log("running");
      };
    `),
  ).toHaveLength(0);
});

test("no-over-depending treats forwarding deps to another function as using everything", () => {
  expect(
    lint(`
      const run = (deps: LoggerDep & TimeDep) => {
        helper(deps);
      };
    `),
  ).toHaveLength(0);
});

test("no-over-depending does not cross-contaminate nested functions with their own deps parameter", () => {
  const messages = lint(`
    const outer = (deps: LoggerDep & TimeDep) => {
      deps.logger.log("running");
      const inner = (deps: TimeDep) => {
        deps.time.now();
      };
      inner;
    };
  `);

  expect(messages).toHaveLength(1);
  expect(messages[0]?.message).toContain("TimeDep");
});
