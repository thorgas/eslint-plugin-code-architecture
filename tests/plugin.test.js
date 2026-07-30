import { expect, test } from "bun:test";
import plugin from "../plugin.js";

test("plugin exposes every rule through portable flat-config presets", () => {
  expect(plugin.meta).toEqual({
    name: "eslint-plugin-code-architecture",
    namespace: "code-architecture",
    version: "0.3.0",
  });
  expect(Object.keys(plugin.rules).sort()).toEqual([
    "centralize-domain-literals",
    "declarative-components",
    "dependency-parameter-convention",
    "dependency-wrapper-shape",
    "effect-error-handling",
    "enforce-module-boundaries",
    "imports-first",
    "max-function-lines",
    "max-function-parameters",
    "named-imports",
    "no-barrel-files",
    "no-barrel-imports",
    "no-exported-dependency-instances",
    "no-implicit-external-dependencies",
    "no-namespace-exports",
    "no-over-depending",
    "no-root-owned-compound-parts",
    "no-unsafe-type-assertions",
    "no-unvalidated-json-parse",
    "prefer-arrow-functions",
    "prefer-composition-over-configuration",
    "prefer-interface-over-type",
    "prefer-readonly-types",
    "require-assertions",
    "require-composable-root-children",
    "require-compound-component-api",
    "require-consumer-owned-compound-usage",
    "require-contract-assertions",
    "sort-dependency-types",
    "top-down-declarations",
  ]);
  expect(plugin.configs.recommended).toBeArray();
  expect(plugin.configs.tigerstyle).toBeArray();
  expect(plugin.configs.agentReadiness).toBeArray();
  expect(plugin.configs.effect).toBeArray();
  expect(plugin.configs.react).toBeArray();
  expect(plugin.configs.composition).toBeArray();
  expect(plugin.configs.lego).toBeArray();
  expect(plugin.configs.evoluDependencyInjection).toBeArray();
  expect(plugin.configs.evoluConventions).toBeArray();
  expect(Object.keys(plugin.configs)).toEqual([
    "recommended",
    "tigerstyle",
    "strict",
    "agentReadiness",
    "effect",
    "react",
    "composition",
    "lego",
    "evoluDependencyInjection",
    "evoluConventions",
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
});

test("agent readiness strengthens strict with per-function contracts", () => {
  expect(plugin.configs.agentReadiness[0].rules).toEqual({
    ...plugin.configs.strict[0].rules,
    "code-architecture/require-assertions": [
      "error",
      {
        checkExpressionBodies: true,
        minimum: 2,
        minimumStatements: 0,
      },
    ],
    "code-architecture/require-contract-assertions": "error",
  });
});

test("composition preset exposes only the consumer-owned layout rules", () => {
  expect(plugin.configs.composition[0].rules).toEqual({
    "code-architecture/no-root-owned-compound-parts": "error",
    "code-architecture/prefer-composition-over-configuration": "error",
    "code-architecture/require-composable-root-children": "error",
  });
});

test("Evolu presets expose only rules derived from the linked Evolu guides", () => {
  expect(plugin.configs.evoluDependencyInjection[0].rules).toEqual({
    "code-architecture/dependency-parameter-convention": "error",
    "code-architecture/dependency-wrapper-shape": "error",
    "code-architecture/no-exported-dependency-instances": "error",
    "code-architecture/no-implicit-external-dependencies": "error",
    "code-architecture/no-over-depending": "error",
    "code-architecture/sort-dependency-types": "error",
  });
  expect(plugin.configs.evoluConventions[0].rules).toEqual({
    "code-architecture/named-imports": "error",
    "code-architecture/no-namespace-exports": "error",
    "code-architecture/prefer-arrow-functions": "error",
    "code-architecture/prefer-interface-over-type": "error",
    "code-architecture/prefer-readonly-types": "error",
    "code-architecture/top-down-declarations": "error",
  });
});

test("strict does not opt projects into Evolu-specific conventions", () => {
  const strictRules = plugin.configs.strict[0].rules;

  expect(
    strictRules["code-architecture/dependency-wrapper-shape"],
  ).toBeUndefined();
  expect(
    strictRules["code-architecture/no-implicit-external-dependencies"],
  ).toBeUndefined();
  expect(strictRules["code-architecture/named-imports"]).toBeUndefined();
});
