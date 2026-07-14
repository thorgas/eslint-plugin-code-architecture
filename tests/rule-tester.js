import { Linter } from "eslint";
import tseslint from "typescript-eslint";

export const lintRule = ({
  code,
  filename = "src/example.ts",
  languageOptions = {},
  options = [],
  rule,
  ruleName,
}) => {
  const linter = new Linter();

  return linter.verify(
    code,
    [
      {
        files: ["**/*.{js,jsx,ts,tsx}"],
        languageOptions: {
          parser: tseslint.parser,
          parserOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
          },
          ...languageOptions,
        },
        plugins: {
          architecture: {
            rules: { [ruleName]: rule },
          },
        },
        rules: {
          [`architecture/${ruleName}`]: ["error", ...options],
        },
      },
    ],
    { filename },
  );
};
