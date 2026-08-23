import { expect, test } from "bun:test";
import plugin from "../plugin.js";

test("plugin exposes every rule through portable flat-config presets", () => {
  expect(plugin.meta).toEqual({
    name: "eslint-plugin-code-architecture",
    namespace: "code-architecture",
    version: "0.4.0-alpha.0",
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
    "no-raw-design-values",
    "no-root-owned-compound-parts",
    "no-unsafe-type-assertions",
    "no-unvalidated-json-parse",
    "prefer-composition-over-configuration",
    "require-assertions",
    "require-composable-root-children",
    "require-compound-component-api",
    "require-consumer-owned-compound-usage",
  ]);
  expect(plugin.configs.recommended).toBeArray();
  expect(plugin.configs.tigerstyle).toBeArray();
  expect(plugin.configs.effect).toBeArray();
  expect(plugin.configs.react).toBeArray();
  expect(plugin.configs.composition).toBeArray();
  expect(plugin.configs.lego).toBeArray();
  expect(Object.keys(plugin.configs)).toEqual([
    "recommended",
    "tigerstyle",
    "strict",
    "effect",
    "react",
    "composition",
    "lego",
  ]);
});

test("lego combines composition guardrails with strict API-shape rules", () => {
  expect(plugin.configs.lego[0].rules).toEqual({
    ...plugin.configs.composition[0].rules,
    "code-architecture/require-compound-component-api": "error",
    "code-architecture/require-consumer-owned-compound-usage": "error",
  });
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
  expect(
    strictRules["code-architecture/prefer-composition-over-configuration"],
  ).toBeUndefined();
  expect(
    strictRules["code-architecture/no-raw-design-values"],
  ).toBeUndefined();
});

test("composition preset exposes only the consumer-owned layout rules", () => {
  expect(plugin.configs.composition[0].rules).toEqual({
    "code-architecture/no-root-owned-compound-parts": "error",
    "code-architecture/prefer-composition-over-configuration": "error",
    "code-architecture/require-composable-root-children": "error",
  });
});
