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
