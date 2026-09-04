import { expect, test } from "bun:test";
import rule from "../rules/prefer-design-system-components.js";
import { lintRule } from "./rule-tester.js";

const options = [
  {
    allowInside: ["src/components/ui/**"],
    consumers: ["src/features/**/ui/**", "src/app/**"],
    replacements: [
      {
        from: "react-native",
        imported: ["Pressable", "Text"],
        replacement: "@/components/ui",
      },
      {
        elements: ["button", "dialog"],
        replacement: "@/components/ui",
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
    ruleName: "prefer-design-system-components",
  });

test("prefer-design-system-components reports configured primitive imports", () => {
  const messages = lint(
    'import { Pressable as NativePressable, View, Text } from "react-native";',
  );

  expect(messages).toHaveLength(2);
  expect(messages[0]?.message).toContain("@/components/ui");
});

test("prefer-design-system-components reports configured intrinsic elements", () => {
  const messages = lint("<><button>Save</button><dialog /></>;");

  expect(messages).toHaveLength(2);
});

test("prefer-design-system-components respects consumer and owner paths", () => {
  const code = 'import { Pressable } from "react-native";';

  expect(lint(code, "src/components/ui/button.tsx")).toHaveLength(0);
  expect(lint(code, "src/features/profile/domain/model.ts")).toHaveLength(0);
});

test("prefer-design-system-components resolves namespace-imported JSX elements", () => {
  const messages = lint(
    `import * as RN from "react-native";\nconst x = <RN.button />;`,
  );

  expect(messages).toHaveLength(1);
  expect(messages[0]?.message).toContain("@/components/ui");
});

test("prefer-design-system-components ignores namespace members without a matching element", () => {
  expect(
    lint(`import * as RN from "react-native";\nconst x = <RN.View />;`),
  ).toHaveLength(0);
});

test("prefer-design-system-components allows unconfigured primitives", () => {
  expect(
    lint('import { Switch, View } from "react-native";'),
  ).toHaveLength(0);
});
