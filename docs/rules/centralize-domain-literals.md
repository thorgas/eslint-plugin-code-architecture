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

The vocabulary does not have to be written by hand. The `domain-vocabulary` skill in [thorgas/skills](https://github.com/thorgas/skills) mines a codebase for repeated domain literals, groups them into `as const` constant objects in a constants module, and emits the `literals` and `constantsFiles` configuration for this rule together with a first `enforce-module-boundaries` module map. Re-run it when a feature adds new vocabulary.

## Production-derived example

This redacted navigation flow gives persisted routes one owner:

```ts
// src/constants.ts — listed in constantsFiles
export const APP_ROUTES = {
  today: "/today",
  reflect: "/reflect",
} as const;

// src/navigation/open-today.ts
import { APP_ROUTES } from "../constants.js";

export function openToday(router: Router, history: NavigationHistory) {
  history.remember(APP_ROUTES.today);
  router.push(APP_ROUTES.today);
}
```

Without the rule, one writer can quietly use `"/todays"` while readers expect `"/today"`. Centralization gives tests a single vocabulary to import and gives coding agents an immediately discoverable source of truth instead of making them search for near-matching strings. The consumer must list both the protected literals and `constantsFiles`; the rule does not discover domain vocabulary automatically.
