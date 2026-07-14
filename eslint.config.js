import eslint from "@eslint/js";
import plugin from "./plugin.js";

export default [
  {
    ignores: ["coverage/**"],
  },
  eslint.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      globals: {
        process: "readonly",
      },
      sourceType: "module",
    },
    plugins: {
      architecture: plugin,
    },
    rules: {
      "architecture/imports-first": "error",
      "architecture/max-function-lines": ["error", { max: 70 }],
      "architecture/max-function-parameters": ["error", { max: 5 }],
      "architecture/no-barrel-files": "error",
      "architecture/no-barrel-imports": "error",
      eqeqeq: ["error", "always"],
      "no-warning-comments": [
        "error",
        { terms: ["fixme"], location: "anywhere" },
      ],
    },
  },
];
