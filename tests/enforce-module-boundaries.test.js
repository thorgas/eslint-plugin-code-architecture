import { expect, test } from "bun:test";
import { Linter } from "eslint";
import rule from "../rules/enforce-module-boundaries.js";

const lint = (filename, code, options) => {
  const linter = new Linter();

  return linter.verify(
    code,
    [
      {
        files: ["**/*.js"],
        plugins: {
          architecture: {
            rules: {
              "enforce-module-boundaries": rule,
            },
          },
        },
        rules: {
          "architecture/enforce-module-boundaries": ["error", options],
        },
      },
    ],
    { filename },
  );
};

test("rejects a dependency that is not in the source module allowlist", () => {
  const messages = lint(
    "src/billing/create.js",
    'import { sendEmail } from "../notifications/send.js";',
    {
      root: process.cwd(),
      modules: [
        { name: "billing", pattern: "src/billing/**", allow: [] },
        { name: "notifications", pattern: "src/notifications/**" },
      ],
    },
  );

  expect(messages).toHaveLength(1);
  expect(messages[0]?.messageId).toBe("forbiddenDependency");
});

test("allows configured composition roots to import private implementations", () => {
  const messages = lint(
    "src/runtime/compose.js",
    'import { live } from "../billing/payment.implementation.js";',
    {
      root: process.cwd(),
      allowPrivateImportsFrom: ["src/runtime/**"],
      modules: [
        {
          name: "runtime",
          pattern: "src/runtime/**",
          allow: ["billing"],
        },
        {
          name: "billing",
          pattern: "src/billing/**",
          public: ["**/*.service.*"],
        },
      ],
    },
  );

  expect(messages).toHaveLength(0);
});

test("rejects private aliased imports across an allowed dependency", () => {
  const messages = lint(
    "src/checkout/create.js",
    'export { charge } from "@/billing/payment.implementation.js";',
    {
      root: process.cwd(),
      aliases: [{ prefix: "@/", target: "src" }],
      modules: [
        {
          name: "checkout",
          pattern: "src/checkout/**",
          allow: ["billing"],
        },
        {
          name: "billing",
          pattern: "src/billing/**",
          public: ["**/*.service.*"],
        },
      ],
    },
  );

  expect(messages).toHaveLength(1);
  expect(messages[0]?.messageId).toBe("privateImport");
});

test("ignores external, same-module, and files outside configured modules", () => {
  const options = {
    root: process.cwd(),
    modules: [{ name: "billing", pattern: "src/billing/**", allow: [] }],
  };

  expect(
    lint(
      "src/billing/create.js",
      'import path from "node:path"; import { local } from "./local.js";',
      options,
    ),
  ).toHaveLength(0);
  expect(
    lint("src/runtime/create.js", 'import "../billing/create.js";', options),
  ).toHaveLength(0);
});
