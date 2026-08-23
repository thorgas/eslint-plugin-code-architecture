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

const jsxOptions = [
  {
    allowedFiles: ["src/ui/tokens/**"],
    values: [
      {
        properties: ["color", "tintColor"],
        replacement: "palette.selectionWash",
        value: "#EDF0EB",
      },
    ],
  },
];

const lintJsx = ({
  code,
  filename = "src/components/example.tsx",
  options = jsxOptions,
}) =>
  lintRule({
    code,
    filename,
    options,
    rule,
    ruleName: "no-raw-design-values",
  });

test("no-raw-design-values reports a direct JSX string exactly once", () => {
  const messages = lintJsx({
    code: '<ActivityIndicator color="#EDF0EB" />;',
  });

  expect(messages).toHaveLength(1);
  expect(messages[0]?.messageId).toBe("rawDesignValue");
  expect(messages[0]?.message).toContain("palette.selectionWash");
});

test("no-raw-design-values reports JSX expression string literals", () => {
  const messages = lintJsx({
    code: '<ActivityIndicator color={"#EDF0EB"} />;',
  });

  expect(messages).toHaveLength(1);
});

test("no-raw-design-values checks every configured JSX attribute", () => {
  const messages = lintJsx({
    code: `<>
      <ActivityIndicator color="#EDF0EB" />
      <Icon tintColor="#EDF0EB" />
    </>;`,
  });

  expect(messages).toHaveLength(2);
  expect(messages.map(({ message }) => message)).toEqual([
    expect.stringContaining("'color'"),
    expect.stringContaining("'tintColor'"),
  ]);
});

test("no-raw-design-values ignores unconfigured JSX attributes and expressions", () => {
  const messages = lintJsx({
    code: [
      'const raw = "#EDF0EB";',
      "<>",
      '  <Text testID="#EDF0EB" />',
      "  <ActivityIndicator color={palette.selectionWash} />",
      "  <ActivityIndicator color={dynamicColor} />",
      "  <ActivityIndicator color={raw} />",
      "  <ActivityIndicator color={`#${themeValue}`} />",
      "</>;",
    ].join("\n"),
  });

  expect(messages).toHaveLength(0);
});

test("no-raw-design-values permits JSX values in allowed files", () => {
  const messages = lintJsx({
    code: '<ActivityIndicator color="#EDF0EB" />;',
    filename: "src/ui/tokens/colors.tsx",
  });

  expect(messages).toHaveLength(0);
});

test("no-raw-design-values applies configured exceptions to JSX attributes", () => {
  const messages = lintJsx({
    code: '<ActivityIndicator color="#EDF0EB" />;',
    filename: "src/charts/legend.tsx",
    options: [
      {
        ...jsxOptions[0],
        exceptions: [
          {
            files: ["src/charts/**"],
            properties: ["color"],
            values: ["#EDF0EB"],
          },
        ],
      },
    ],
  });

  expect(messages).toHaveLength(0);
});

test("no-raw-design-values guides JSX values without configured replacements", () => {
  const messages = lintJsx({
    code: '<ActivityIndicator color="#EDF0EB" />;',
    options: [
      {
        values: [{ properties: ["color"], value: "#EDF0EB" }],
      },
    ],
  });

  expect(messages).toHaveLength(1);
  expect(messages[0]?.message).toContain("an approved design token");
});

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
