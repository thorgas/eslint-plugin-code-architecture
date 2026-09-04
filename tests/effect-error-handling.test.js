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

test("effect-error-handling resolves a namespace import to the Effect namespace", () => {
  const messages = lintRule({
    code: `import * as Eff from "effect/Effect";\nconst safe = task.pipe(Eff.catchAll(() => Eff.void));`,
    rule,
    ruleName: "effect-error-handling",
  });

  expect(messages).toHaveLength(1);
  expect(messages[0]?.messageId).toBe("silentCatchAll");
});

test("effect-error-handling resolves a named import to its Effect member", () => {
  const messages = lintRule({
    code: `import { catchAll } from "effect/Effect";\nconst safe = task.pipe(catchAll(() => Effect.void));`,
    rule,
    ruleName: "effect-error-handling",
  });

  expect(messages).toHaveLength(1);
  expect(messages[0]?.messageId).toBe("silentCatchAll");
});

test("effect-error-handling does not treat an unrelated import of the same name as Effect", () => {
  const messages = lintRule({
    code: `import { catchAll } from "not-effect";\nconst safe = task.pipe(catchAll(() => Effect.void));`,
    rule,
    ruleName: "effect-error-handling",
  });

  expect(messages).toHaveLength(0);
});

test("effect-error-handling flags catchTag handlers that erase the failure", () => {
  const messages = lintRule({
    code: 'Effect.catchTag("Foo", () => Effect.void);',
    rule,
    ruleName: "effect-error-handling",
  });

  expect(messages).toHaveLength(1);
  expect(messages[0]?.messageId).toBe("silentCatchAll");
});

test("effect-error-handling flags catchTags handlers that erase the failure", () => {
  const messages = lintRule({
    code: `Effect.catchTags({
      Foo: () => Effect.succeed(null),
      Bar: () => Effect.fail(new NotFoundError()),
    });`,
    rule,
    ruleName: "effect-error-handling",
  });

  expect(messages).toHaveLength(1);
  expect(messages[0]?.messageId).toBe("silentCatchAll");
});

test("effect-error-handling allows catchTag handlers with a real domain fallback", () => {
  const messages = lintRule({
    code: 'Effect.catchTag("Foo", () => Effect.succeed({ kind: "unavailable" }));',
    rule,
    ruleName: "effect-error-handling",
  });

  expect(messages).toHaveLength(0);
});

test("effect-error-handling resolves the named Effect namespace import and its aliases", () => {
  for (const code of [
    'import { Effect } from "effect"; export const r = Effect.catchAll(() => Effect.void);',
    'import { Effect as E } from "effect"; export const r = E.catchAll(() => E.succeed(null));',
  ]) {
    expect(
      lintRule({ code, rule, ruleName: "effect-error-handling" }).map(
        ({ messageId }) => messageId,
      ),
    ).toEqual(["silentCatchAll"]);
  }
});
