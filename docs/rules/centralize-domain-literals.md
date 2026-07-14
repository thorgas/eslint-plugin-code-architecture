# centralize-domain-literals

Requires configured fixed vocabulary and configuration values to be referenced through constants modules.

```js
[
  "error",
  {
    constantsFiles: ["src/constants.ts"],
    literals: [{ value: "completed", replacement: "JOB_STATUS.COMPLETED" }],
  },
]
```

Invalid: `const status = "completed"`. Valid: `const status = JOB_STATUS.COMPLETED` or defining the literal in a configured constants file. Import sources, property keys, and TypeScript literal types are ignored.

ESLint cannot reliably count a literal across independently linted files, so consumers declare domain vocabulary explicitly. That enforces centralization from first use instead of waiting for duplication.
