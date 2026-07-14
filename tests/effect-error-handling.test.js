import { expect, test } from "bun:test";
import rule from "../rules/effect-error-handling.js";
import { lintRule } from "./rule-tester.js";

test("effect-error-handling rejects catchAll handlers that erase failures with Effect.void", () => {
  const messages = lintRule({
    code: "const safe = task.pipe(Effect.catchAll(() => Effect.void));",
    rule,
    ruleName: "effect-error-handling",
  });

  expect(messages).toHaveLength(1);
  expect(messages[0]?.messageId).toBe("silentCatchAll");
});

test("effect-error-handling reports every forbidden error-erasure pattern", () => {
  const messages = lintRule({
    code: `Effect.ignore(task);
Effect.catchAllCause(task, recover);
Effect.tapError(logError);
Effect.fail(new Error("generic"));`,
    rule,
    ruleName: "effect-error-handling",
  });

  expect(messages.map(({ messageId }) => messageId).sort()).toEqual([
    "catchAllCause",
    "genericError",
    "ignoredError",
    "manualErrorTap",
  ]);
});

test("effect-error-handling detects block undefined fallbacks and honors exceptions", () => {
  const silent = lintRule({
    code: "Effect.catchAll(task, function () { return Effect.succeed(undefined); });",
    rule,
    ruleName: "effect-error-handling",
  });
  const allowed = lintRule({
    code: "Effect.catchAllCause(task, recover); Effect.tapError(log); Effect.ignore(task); Effect.fail(new Error());",
    options: [
      {
        allowCatchAllCause: true,
        allowGenericError: true,
        allowIgnore: true,
        allowTapError: true,
      },
    ],
    rule,
    ruleName: "effect-error-handling",
  });

  expect(silent[0]?.messageId).toBe("silentCatchAll");
  expect(allowed).toHaveLength(0);
});
