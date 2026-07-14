import { expect, test } from "bun:test";
import rule from "../rules/no-unvalidated-json-parse.js";
import { lintRule } from "./rule-tester.js";

test("no-unvalidated-json-parse rejects raw JSON.parse at an external boundary", () => {
  const messages = lintRule({
    code: "const config = JSON.parse(content);",
    rule,
    ruleName: "no-unvalidated-json-parse",
  });

  expect(messages).toHaveLength(1);
  expect(messages[0]?.messageId).toBe("unvalidatedParse");
});

test("no-unvalidated-json-parse accepts configured curried schema decoders", () => {
  const messages = lintRule({
    code: "const config = Schema.decodeUnknownSync(Config)(JSON.parse(content));",
    rule,
    ruleName: "no-unvalidated-json-parse",
  });

  expect(messages).toHaveLength(0);
});

test("no-unvalidated-json-parse accepts Effect pipelines that validate parsed data", () => {
  const messages = lintRule({
    code: `
      const config = Effect.try({
        try: () => JSON.parse(content),
        catch: () => new Error("Invalid JSON"),
      }).pipe(
        Effect.flatMap((parsed) => Schema.decodeUnknown(Config)(parsed)),
      );
    `,
    rule,
    ruleName: "no-unvalidated-json-parse",
  });

  expect(messages).toHaveLength(0);
});

test("no-unvalidated-json-parse accepts a local parsed value used once by a decoder", () => {
  const messages = lintRule({
    code: `
      const parsed = JSON.parse(content);
      const config = Schema.decodeUnknownSync(Config)(parsed);
    `,
    rule,
    ruleName: "no-unvalidated-json-parse",
  });

  expect(messages).toHaveLength(0);
});

test("no-unvalidated-json-parse rejects passing a parser function to a decoder", () => {
  const messages = lintRule({
    code: `
      const parse = () => JSON.parse(content);
      const config = Schema.decodeUnknownSync(Config)(parse);
    `,
    rule,
    ruleName: "no-unvalidated-json-parse",
  });

  expect(messages).toHaveLength(1);
  expect(messages[0]?.messageId).toBe("unvalidatedParse");
});

test("no-unvalidated-json-parse accepts an Effect.try result validated once", () => {
  const messages = lintRule({
    code: `
      const parsed = yield* Effect.try({
        try: () => JSON.parse(content),
        catch: () => new Error("Invalid JSON"),
      });
      return yield* Schema.decodeUnknown(Config)(parsed);
    `,
    rule,
    ruleName: "no-unvalidated-json-parse",
  });

  expect(messages).toHaveLength(0);
});

test("no-unvalidated-json-parse rejects a parsed value used before validation", () => {
  const messages = lintRule({
    code: `
      const parsed = JSON.parse(content);
      inspect(parsed);
      const config = Schema.decodeUnknownSync(Config)(parsed);
    `,
    rule,
    ruleName: "no-unvalidated-json-parse",
  });

  expect(messages).toHaveLength(1);
  expect(messages[0]?.messageId).toBe("unvalidatedParse");
});

test("no-unvalidated-json-parse ignores validators before the parsing stage", () => {
  const messages = lintRule({
    code: `
      const config = Effect.succeed(content).pipe(
        Effect.flatMap((parsed) => Schema.decodeUnknown(Config)(parsed)),
        Effect.tap(() => JSON.parse(content)),
      );
    `,
    rule,
    ruleName: "no-unvalidated-json-parse",
  });

  expect(messages).toHaveLength(1);
  expect(messages[0]?.messageId).toBe("unvalidatedParse");
});

test("no-unvalidated-json-parse rejects deferred validation functions", () => {
  const messages = lintRule({
    code: `
      const config = Effect.try({
        try: () => JSON.parse(content),
        catch: () => new Error("Invalid JSON"),
      }).pipe(
        Effect.flatMap((parsed) => () =>
          Schema.decodeUnknown(Config)(parsed)),
      );
    `,
    rule,
    ruleName: "no-unvalidated-json-parse",
  });

  expect(messages).toHaveLength(1);
  expect(messages[0]?.messageId).toBe("unvalidatedParse");
});
