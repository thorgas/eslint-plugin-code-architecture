import { expect, test } from "bun:test";
import rule from "../rules/no-design-identity-overrides.js";
import { lintRule } from "./rule-tester.js";

const options = [
  {
    allowedFiles: ["src/components/ui/**"],
    components: [
      {
        identityProperties: ["color", "backgroundColor", "borderRadius"],
        names: ["Button", "Dialog.Button"],
        styleAttributes: ["style"],
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
    ruleName: "no-design-identity-overrides",
  });

test("no-design-identity-overrides reports direct identity props", () => {
  const messages = lint(
    '<><Button color={theme.danger} /><Dialog.Button borderRadius={4} /></>;',
  );

  expect(messages).toHaveLength(2);
});

test("no-design-identity-overrides reports inline style identity keys", () => {
  const messages = lint(
    "<Button style={[styles.layout, { backgroundColor: theme.danger, borderRadius: 4 }]} />;",
  );

  expect(messages).toHaveLength(2);
});

test("no-design-identity-overrides permits layout overrides", () => {
  const messages = lint(
    '<Button style={{ marginTop: 12, width: "100%", flex: 1 }} />;',
  );

  expect(messages).toHaveLength(0);
});

test("no-design-identity-overrides respects component and owner scope", () => {
  const code = '<Button color="red" />;';

  expect(lint(code, "src/components/ui/button.tsx")).toHaveLength(0);
  expect(lint('<View color="red" />;')).toHaveLength(0);
});
