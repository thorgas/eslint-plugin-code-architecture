import { expect, test } from "bun:test";
import rule from "../rules/no-raw-design-values.js";
import { lintRule } from "./rule-tester.js";

const options = [
  {
    allowedFiles: ["src/ui/tokens/**"],
    values: [
      {
        properties: ["color", "backgroundColor"],
        replacement: "tokens.color.surface",
        value: "#edf0eb",
      },
      {
        properties: ["gap", "padding"],
        replacement: "tokens.space.md",
        value: 16,
      },
    ],
  },
];

test("no-raw-design-values reports configured values on configured properties", () => {
  const messages = lintRule({
    code: `const styles = {
      card: { backgroundColor: "#edf0eb", padding: 16 },
      nested: { content: { gap: 16 } },
    };`,
    options,
    rule,
    ruleName: "no-raw-design-values",
  });

  expect(messages).toHaveLength(3);
  expect(messages.map(({ messageId }) => messageId)).toEqual([
    "rawDesignValue",
    "rawDesignValue",
    "rawDesignValue",
  ]);
  expect(messages[0]?.message).toContain("tokens.color.surface");
  expect(messages[1]?.message).toContain("tokens.space.md");
});

test("no-raw-design-values supports computed keys, wrappers, and const aliases", () => {
  const messages = lintRule({
    code: `const raw = "#edf0eb";
      const styles = {
        ["color"]: platformColor(raw),
        padding: (16 as const),
        ...sharedStyles,
      };`,
    options,
    rule,
    ruleName: "no-raw-design-values",
  });

  expect(messages).toHaveLength(2);
  expect(messages.map(({ message }) => message)).toEqual([
    expect.stringContaining("'color'"),
    expect.stringContaining("'padding'"),
  ]);
});

test("no-raw-design-values respects lexical shadowing when resolving aliases", () => {
  const messages = lintRule({
    code: `const raw = tokens.color.surface;
      function component() {
        const raw = "#edf0eb";
        return { color: raw };
      }
      const safe = { color: raw };`,
    options,
    rule,
    ruleName: "no-raw-design-values",
  });

  expect(messages).toHaveLength(1);
});

test("no-raw-design-values permits token references and unrelated literals", () => {
  const messages = lintRule({
    code: `const styles = {
      card: { color: tokens.color.surface, padding: tokens.space.md },
      chart: { color: "#ff0000", width: 16 },
      metadata: { label: "#edf0eb", count: 16 },
    };`,
    options,
    rule,
    ruleName: "no-raw-design-values",
  });

  expect(messages).toHaveLength(0);
});

test("no-raw-design-values permits approved files and narrow exceptions", () => {
  const exceptionOptions = [
    {
      ...options[0],
      exceptions: [
        {
          files: ["src/charts/**"],
          properties: ["color"],
          values: ["#edf0eb"],
        },
      ],
    },
  ];
  const code = `export const styles = {
    color: "#edf0eb",
    backgroundColor: "#edf0eb",
  };`;

  expect(
    lintRule({
      code,
      filename: "src/ui/tokens/colors.ts",
      options: exceptionOptions,
      rule,
      ruleName: "no-raw-design-values",
    }),
  ).toHaveLength(0);
  expect(
    lintRule({
      code,
      filename: "src/charts/palette.ts",
      options: exceptionOptions,
      rule,
      ruleName: "no-raw-design-values",
    }),
  ).toHaveLength(1);
});

test("no-raw-design-values rejects undeclared configuration fields", () => {
  expect(() =>
    lintRule({
      code: "const styles = { color: '#edf0eb' };",
      options: [
        {
          values: [
            {
              properties: ["color"],
              replacement: "tokens.color.surface",
              typo: true,
              value: "#edf0eb",
            },
          ],
        },
      ],
      rule,
      ruleName: "no-raw-design-values",
    }),
  ).toThrow('Unexpected property "typo"');
});
