import { expect, test } from "bun:test";
import rule from "../rules/no-barrel-files.js";
import { lintRule } from "./rule-tester.js";

test("no-barrel-files rejects re-export-only modules regardless of filename", () => {
  const messages = lintRule({
    code: 'export { PaymentService } from "./payment.service.js";',
    filename: "src/billing/public.ts",
    rule,
    ruleName: "no-barrel-files",
  });

  expect(messages).toHaveLength(1);
  expect(messages[0]?.messageId).toBe("barrelReExport");
});

test("no-barrel-files honors explicit generated-file exceptions", () => {
  const messages = lintRule({
    code: 'export * from "./generated.js";',
    filename: "src/generated/public.ts",
    options: [{ allowFiles: ["src/generated/**"] }],
    rule,
    ruleName: "no-barrel-files",
  });

  expect(messages).toHaveLength(0);
});
