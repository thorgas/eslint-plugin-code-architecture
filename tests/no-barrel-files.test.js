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

test("no-barrel-files rejects re-exporting an imported binding without a source", () => {
  const messages = lintRule({
    code: 'import { x } from "./x.js";\nexport { x };',
    filename: "src/x.ts",
    rule,
    ruleName: "no-barrel-files",
  });

  expect(messages).toHaveLength(1);
  expect(messages[0]?.messageId).toBe("barrelReExport");
});

test("no-barrel-files allows re-exporting a locally declared value", () => {
  const messages = lintRule({
    code: "const x = 1;\nexport { x };",
    filename: "src/x.ts",
    rule,
    ruleName: "no-barrel-files",
  });

  expect(messages).toHaveLength(0);
});

test("no-barrel-files ignores type-only re-exports when allowTypeExports is set", () => {
  const messages = lintRule({
    code: 'export type { Foo } from "./foo.js";\nexport { type Bar } from "./bar.js";',
    filename: "src/x.ts",
    options: [{ allowTypeExports: true }],
    rule,
    ruleName: "no-barrel-files",
  });

  expect(messages).toHaveLength(0);
});

test("no-barrel-files still rejects type-only re-exports by default", () => {
  const messages = lintRule({
    code: 'export type { Foo } from "./foo.js";',
    filename: "src/x.ts",
    rule,
    ruleName: "no-barrel-files",
  });

  expect(messages).toHaveLength(1);
});
