import { expect, test } from "bun:test";
import rule from "../rules/no-barrel-imports.js";
import { lintRule } from "./rule-tester.js";

test("no-barrel-imports rejects configured package barrels", () => {
  const messages = lintRule({
    code: 'import { Effect } from "effect";',
    options: [{ packages: ["effect", "@effect/platform"] }],
    rule,
    ruleName: "no-barrel-imports",
  });

  expect(messages).toHaveLength(1);
  expect(messages[0]?.messageId).toBe("packageBarrel");
});

test("no-barrel-imports rejects local index imports and re-exports", () => {
  const messages = lintRule({
    code: 'import value from "./feature/index.js"; export * from "./other/index";',
    rule,
    ruleName: "no-barrel-imports",
  });

  expect(messages).toHaveLength(2);
  expect(messages.every(({ messageId }) => messageId === "localBarrel")).toBe(
    true,
  );
});

test("no-barrel-imports exempts imports resolving to an allowed barrel", () => {
  const messages = lintRule({
    code: 'import a from "./legacy/index.js"; import b from "./feature/index.js";',
    filename: "src/example.ts",
    options: [{ allowedBarrels: ["src/legacy/**"] }],
    rule,
    ruleName: "no-barrel-imports",
  });

  expect(messages).toHaveLength(1);
  expect(messages[0]?.messageId).toBe("localBarrel");
});

test("no-barrel-imports exempts an allowed package barrel by specifier", () => {
  const messages = lintRule({
    code: 'import { plan } from "@scope/core"; import { other } from "@scope/legacy";',
    options: [
      {
        allowedBarrels: ["@scope/core"],
        packages: ["@scope/core", "@scope/legacy"],
      },
    ],
    rule,
    ruleName: "no-barrel-imports",
  });

  expect(messages).toHaveLength(1);
  expect(messages[0]?.messageId).toBe("packageBarrel");
});

test("no-barrel-imports detects directory imports that resolve to an index file", () => {
  const messages = lintRule({
    code: 'import x from "./feature";',
    filename: "tests/fixtures/no-barrel-imports/consumer.ts",
    rule,
    ruleName: "no-barrel-imports",
  });

  expect(messages).toHaveLength(1);
  expect(messages[0]?.messageId).toBe("localBarrel");
});

test("no-barrel-imports detects '.' resolving to the containing directory's index file", () => {
  const messages = lintRule({
    code: 'import x from ".";',
    filename: "tests/fixtures/no-barrel-imports/feature/consumer.ts",
    rule,
    ruleName: "no-barrel-imports",
  });

  expect(messages).toHaveLength(1);
  expect(messages[0]?.messageId).toBe("localBarrel");
});

test("no-barrel-imports does not flag a directory import with no index file", () => {
  const messages = lintRule({
    code: 'import x from "./not-a-barrel";',
    filename: "tests/fixtures/no-barrel-imports/consumer.ts",
    rule,
    ruleName: "no-barrel-imports",
  });

  expect(messages).toHaveLength(0);
});

test("no-barrel-imports matches allowed barrels with globstar patterns", () => {
  const messages = lintRule({
    code: 'import a from "./index.js"; import b from "./nested/deep/index.js";',
    filename: "packages/core/src/example.ts",
    options: [{ allowedBarrels: ["**/index.js"] }],
    rule,
    ruleName: "no-barrel-imports",
  });

  expect(messages).toHaveLength(0);
});
