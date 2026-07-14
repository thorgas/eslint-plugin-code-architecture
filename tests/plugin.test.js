import { expect, test } from "bun:test";
import plugin from "../plugin.js";

test("plugin exposes every rule through portable flat-config presets", () => {
  expect(plugin.meta).toEqual({
    name: "eslint-plugin-code-architecture",
    namespace: "code-architecture",
    version: "0.1.1",
  });
  expect(Object.keys(plugin.rules).sort()).toEqual([
    "centralize-domain-literals",
    "declarative-components",
    "effect-error-handling",
    "enforce-module-boundaries",
    "imports-first",
    "max-function-lines",
    "max-function-parameters",
    "no-barrel-files",
    "no-barrel-imports",
    "no-unsafe-type-assertions",
    "no-unvalidated-json-parse",
    "require-assertions",
  ]);
  expect(plugin.configs.recommended).toBeArray();
  expect(plugin.configs.tigerstyle).toBeArray();
  expect(plugin.configs.effect).toBeArray();
  expect(plugin.configs.react).toBeArray();
  expect(Object.keys(plugin.configs)).toEqual([
    "recommended",
    "tigerstyle",
    "strict",
    "effect",
    "react",
  ]);
});

test("strict remains library agnostic", () => {
  const strictRules = plugin.configs.strict[0].rules;

  expect(strictRules["code-architecture/require-assertions"]).toEqual([
    "error",
    { minimum: 2 },
  ]);
  expect(
    strictRules["code-architecture/effect-error-handling"],
  ).toBeUndefined();
  expect(
    strictRules["code-architecture/declarative-components"],
  ).toBeUndefined();
});
