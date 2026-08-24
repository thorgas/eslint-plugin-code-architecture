import { expect, test } from "bun:test";
import plugin from "../plugin.js";

test("plugin exposes every rule through portable flat-config presets", () => {
  expect(plugin.meta).toEqual({
    name: "eslint-plugin-code-architecture",
    namespace: "code-architecture",
    version: "0.5.0-alpha.2",
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
    "no-design-identity-overrides",
    "no-raw-design-properties",
    "no-raw-design-values",
    "no-root-owned-compound-parts",
    "no-unsafe-type-assertions",
    "no-unvalidated-json-parse",
    "prefer-composition-over-configuration",
    "prefer-design-system-components",
    "require-assertions",
    "require-composable-root-children",
    "require-compound-component-api",
    "require-consumer-owned-compound-usage",
    "require-dismissible-modal-backdrop",
    "require-interactive-component-contract",
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
    {
      ignoreDirectCallbacks: true,
      ignoreJSXCallbacks: true,
      ignoreJSXComponents: true,
      ignoreNoInputClosures: true,
      ignoreTrivialConstructors: true,
      minimum: 2,
    },
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

test("line-limit presets exclude JSX UI functions", () => {
  expect(
    plugin.configs.recommended[0].rules[
      "code-architecture/max-function-lines"
    ],
  ).toEqual(["error", { ignoreJSX: true, max: 70 }]);
  expect(
    plugin.configs.tigerstyle[0].rules[
      "code-architecture/max-function-lines"
    ],
  ).toEqual(["error", { ignoreJSX: true, max: 70 }]);
});

test("composition preset exposes only the consumer-owned layout rules", () => {
  expect(plugin.configs.composition[0].rules).toEqual({
    "code-architecture/no-root-owned-compound-parts": "error",
    "code-architecture/prefer-composition-over-configuration": "error",
    "code-architecture/require-composable-root-children": "error",
  });
});

test("design-system adoption rules remain opt-in", () => {
  const designRules = [
    "no-design-identity-overrides",
    "no-raw-design-properties",
    "prefer-design-system-components",
    "require-dismissible-modal-backdrop",
    "require-interactive-component-contract",
  ];

  for (const config of Object.values(plugin.configs)) {
    for (const ruleName of designRules) {
      expect(
        config[0].rules[`code-architecture/${ruleName}`],
      ).toBeUndefined();
    }
  }
});
