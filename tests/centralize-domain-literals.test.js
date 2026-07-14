import { expect, test } from "bun:test";
import rule from "../rules/centralize-domain-literals.js";
import { lintRule } from "./rule-tester.js";

test("centralize-domain-literals rejects configured vocabulary outside constants files", () => {
  const messages = lintRule({
    code: 'const status = "completed";',
    options: [
      {
        constantsFiles: ["src/constants.ts"],
        literals: [{ value: "completed", replacement: "JOB_STATUS.COMPLETED" }],
      },
    ],
    rule,
    ruleName: "centralize-domain-literals",
  });

  expect(messages).toHaveLength(1);
  expect(messages[0]?.messageId).toBe("domainLiteral");
});

test("centralize-domain-literals permits definitions and structural literals", () => {
  const options = [
    {
      constantsFiles: ["src/constants.ts"],
      literals: [{ value: "completed", replacement: "JOB_STATUS.COMPLETED" }],
    },
  ];

  expect(
    lintRule({
      code: 'export const COMPLETED = "completed";',
      filename: "src/constants.ts",
      options,
      rule,
      ruleName: "centralize-domain-literals",
    }),
  ).toHaveLength(0);
  expect(
    lintRule({
      code: 'import value from "completed"; type Status = "completed";',
      options,
      rule,
      ruleName: "centralize-domain-literals",
    }),
  ).toHaveLength(0);
});
