import { expect, test } from "bun:test";
import rule from "../rules/no-raw-design-properties.js";
import { lintRule } from "./rule-tester.js";

const options = [
  {
    allowedFiles: ["src/components/ui/tokens/**"],
    properties: [
      {
        names: ["color", "backgroundColor"],
        replacement: "theme.colors",
      },
      {
        allowedValues: [0],
        names: ["padding", "fontSize", "borderRadius"],
        replacement: "theme spacing or typography tokens",
      },
    ],
  },
];

const lint = (code, filename = "src/features/profile/ui/screen.tsx") =>
  lintRule({
    code,
    filename,
    options,
    rule,
    ruleName: "no-raw-design-properties",
  });

test("no-raw-design-properties reports arbitrary object design literals", () => {
  const messages = lint(`const styles = {
    card: { backgroundColor: "#8A3D35", padding: 12, borderRadius: 8 },
  };`);

  expect(messages).toHaveLength(3);
  expect(messages[0]?.message).toContain("theme.colors");
});

test("no-raw-design-properties reports JSX design literals", () => {
  const messages = lint(
    '<><Icon color="#8A3D35" /><Box padding={12} fontSize={14} /></>;',
  );

  expect(messages).toHaveLength(3);
});

test("no-raw-design-properties supports static templates and signed numbers", () => {
  const messages = lint(`const styles = {
    color: \`#8A3D35\`,
    ["padding"]: -12,
  };`);

  expect(messages).toHaveLength(2);
});

test("no-raw-design-properties permits tokens and configured values", () => {
  const messages = lint(`const styles = {
    color: theme.colors.danger,
    padding: theme.space.md,
    borderRadius: 0,
    width: 12,
  };`);

  expect(messages).toHaveLength(0);
});

test("no-raw-design-properties respects allowed files", () => {
  expect(
    lint(
      'export const danger = { color: "#8A3D35" };',
      "src/components/ui/tokens/colors.ts",
    ),
  ).toHaveLength(0);
});
