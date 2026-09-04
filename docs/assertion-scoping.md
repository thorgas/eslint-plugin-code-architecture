# Assertion rule scoping

The three assertion rules form layers, not a single progressively stricter stack:

1. Use `require-assertions` broadly for assertion density in substantial production functions.
2. Use `require-contract-assertions` only for domain and application functions that own complete input and output contracts.
3. Use `no-unasserted-return` as a lighter alternative in complementary scopes where complete parameter and return contracts are intentionally not required.

Do not enable `require-contract-assertions` and `no-unasserted-return` over the same function scope. Both rules can report a direct returned call, but they encode different policies: the contract rule requires evidence for every eligible parameter and computed return, while the lighter rule only requires direct call results to use assign-assert-return. Running both adds duplicate diagnostics without strengthening the contract.

`require-assertions` remains the broad baseline in either scope. The overlap to avoid is specifically between the full-contract and lighter return rules.

## Copyable flat configuration

ESLint configuration selects files, not semantic function categories. Keep the two specialized rule scopes visibly disjoint through module boundaries or explicit file globs:

```js
import architecture from "eslint-plugin-code-architecture";

const contractFiles = [
  "src/domain/**/*.{ts,tsx}",
  "src/application/**/*.{ts,tsx}",
];

const lighterReturnFiles = [
  "src/adapters/**/*.{ts,tsx}",
  "src/infrastructure/**/*.{ts,tsx}",
];

export default [
  // Broad density policy. The strict preset already enables require-assertions.
  ...architecture.configs.strict,
  {
    files: contractFiles,
    rules: {
      "code-architecture/require-contract-assertions": [
        "error",
        {
          minimumStatements: 3,
          ignoreAssertionHelpers: true,
          ignoreDelegates: true,
          ignoreDirectCallbacks: true,
          ignoreJSXCallbacks: true,
          ignoreJSXComponents: true,
          ignoreNoInputClosures: true,
          ignoreReactHooks: true,
          ignoreTrivialConstructors: true,
        },
      ],
    },
  },
  {
    files: lighterReturnFiles,
    rules: {
      "code-architecture/no-unasserted-return": [
        "error",
        {
          ignoreDelegates: true,
          ignoreDirectCallbacks: true,
          ignoreJSXCallbacks: true,
          ignoreJSXComponents: true,
          ignoreNoInputClosures: true,
          ignoreReactHooks: true,
          minimumStatements: 3,
        },
      ],
    },
  },
];
```

Do not start this production layout from `agentReadiness`: that preset intentionally enables exhaustive full contracts over every function. Start from `strict`, then add the two disjoint specialized scopes.

If one file mixes domain contract owners with framework glue or light adapters, ESLint file overrides cannot separate them. Prefer moving the contract-owning function behind a domain/application module boundary. When that is not practical, keep one specialized rule for the file and use a narrow, reasoned inline disable for the exceptional function rather than enabling both rules.
