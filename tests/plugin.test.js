import { expect, test } from "bun:test";
import plugin from "../plugin.js";

test("plugin exposes every rule through portable flat-config presets", () => {
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
});
