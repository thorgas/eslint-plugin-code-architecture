import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { URL } from "node:url";
import plugin from "../plugin.js";

test("every exported rule documents a production-derived code example", async () => {
  for (const ruleName of Object.keys(plugin.rules)) {
    const rulePage = (await readFile(
      new URL(`../docs/rules/${ruleName}.md`, import.meta.url),
      "utf8",
    )).replaceAll("\r\n", "\n");
    const productionExample = rulePage.split(
      "## Production-derived example\n",
    )[1];

    expect(productionExample, ruleName).toBeDefined();
    expect(productionExample, ruleName).toMatch(/```(?:js|ts|tsx)\n[\s\S]+?```/);
  }
});

test("assertion policy documents complementary specialized scopes", async () => {
  const policy = (await readFile(
    new URL("../docs/assertion-scoping.md", import.meta.url),
    "utf8",
  )).replaceAll("\r\n", "\n");

  expect(policy).toContain("Use `require-assertions` broadly");
  expect(policy).toContain(
    "Do not enable `require-contract-assertions` and `no-unasserted-return` over the same function scope.",
  );
  expect(policy).toContain("...architecture.configs.strict");
  expect(policy).toContain("files: contractFiles");
  expect(policy).toContain("files: lighterReturnFiles");
  expect(policy).toContain("Do not start this production layout from `agentReadiness`");
});

test("assertion density policy preserves expected failure contracts", async () => {
  const policy = (await readFile(
    new URL("../docs/rules/require-assertions.md", import.meta.url),
    "utf8",
  )).replaceAll("\r\n", "\n");

  expect(policy).toContain("heuristic");
  expect(policy).toContain("average a minimum of two assertions per function");
  expect(policy).toContain("does not establish contract completeness");
  expect(policy).toContain("function parseOptionalAge(input: unknown): number | null");
  expect(policy).toContain("type ParseResult");
  expect(policy).toContain("assert(start <= end");
  expect(policy).not.toContain("Validators generally convert their `null`-returning paths into assertions");
});
