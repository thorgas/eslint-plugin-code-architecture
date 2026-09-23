# no-implicit-external-dependencies

Requires code that interacts with the outside world to receive that capability through dependency injection. A function that reads the clock, random numbers, environment, network, storage, or locale through an ambient global has a hidden input that tests cannot control and callers cannot see. This closes the gap between validating an existing `deps` signature and detecting code that bypasses DI entirely.

Invalid:

```ts
const timeUntilEvent = (eventTimestamp: number) =>
  eventTimestamp - Date.now();
const newId = () => crypto.randomUUID();
const load = (url: string) => fetch(url);
```

Valid:

```ts
const timeUntilEvent =
  (deps: TimeDep) =>
  (eventTimestamp: number) =>
    eventTimestamp - deps.time.now();

const createTime = (): Time => ({
  now: () => Date.now(),
});
```

## Built-in capability groups

Every group is enabled by default. Each maps ambient global access to the dependency contract that should replace it.

| Group | Detected access | Suggested dependency |
| --- | --- | --- |
| `time` | `Date.now`, zero-argument `new Date()`, `performance.now` | `TimeDep`, `deps.time.now()` |
| `randomness` | `Math.random`, `crypto.randomUUID`, `crypto.getRandomValues` | `RandomDep`, `deps.random` |
| `logging` | `console.*` | `LoggerDep`, `deps.logger` |
| `environment` | `process.env` | `ConfigDep`, `deps.config` |
| `network` | `fetch`, `navigator.onLine`, `navigator.sendBeacon`, `new WebSocket`, `new XMLHttpRequest` | `FetchDep`, `deps.fetch` |
| `storage` | `localStorage.*`, `sessionStorage.*`, `indexedDB.*`, `document.cookie` | `StorageDep`, `deps.storage` |
| `locale` | `Intl.*`, `navigator.language`, `navigator.languages` | `LocaleDep`, `deps.locale` |

`new Date(value)` with an argument is pure parsing and is not reported. Type-only references (`typeof Date.now`, `client: WebSocket`) and locally shadowed bindings are ignored; the rule uses ESLint scope analysis, so globals declared through `languageOptions.globals` are recognized as globals.

## Allowed access

Ambient access is allowed inside:

- a function named `create<Dependency>` or `createTest<Dependency>` for the capability's dependency, so `createTime`, `createTestTime`, `createRandom`, `createLogger`, and so on need no configuration;
- any function listed in `dependencyFactories` or in a capability's `factories`;
- files matched by `compositionRoots`.

Factory allowances extend into nested callbacks, which permits the `log` implementation inside `createLogger`.

## Configuration

```js
"code-architecture/no-implicit-external-dependencies": [
  "error",
  {
    // Narrow the built-in groups. Omit to enable all of them.
    groups: ["time", "randomness", "logging"],
    // Extend the built-ins with project-specific globals.
    capabilities: [
      {
        selector: "Platform.now",
        dependency: "PlatformTimeDep",
        replacement: "deps.platformTime.now()",
      },
    ],
    compositionRoots: ["src/main.ts", "src/**/infrastructure/**"],
    dependencyFactories: ["createDatabase"],
    serviceLocators: [
      {
        module: "@/database.js",
        imports: ["db"],
        dependency: "DatabaseDep",
        replacement: "deps.database",
      },
    ],
  },
]
```

- `groups` selects which built-in groups apply. `groups: []` disables all built-ins so `capabilities` fully defines the policy.
- `capabilities` is additive. Selectors accept `Object.member`, `Object.*`, a bare global such as `fetch`, `new Identifier()` for zero-argument construction, or `new Identifier` for any construction.
- `compositionRoots` are glob patterns relative to the working directory, or to `root` when configured.
- `serviceLocators` names imported module-level instances that act as hidden dependencies. The rule deliberately does not guess whether arbitrary calls such as `repository.save()` are external; declare the locator instead.

## Detection boundary

This is a syntax rule. It enforces the configured capability groups and declared service locators, not every conceivable external effect. Third-party SDKs, platform modules, and project singletons are only reported when declared through `capabilities` or `serviceLocators`, or when the file scope in `eslint.config` limits the rule to layers that should be pure.

Reference: Evolu, [Dependency Injection](https://www.evolu.dev/docs/dependency-injection), especially its distinction between local arguments and external interactions such as time, logging, and databases.

## Production-derived example

This redacted private-backend workflow routes logging and model access through dependencies, making both replaceable in tests.

```ts
export const generateDocument = async (deps: ModelDeps, prompt: Prompt) => {
  const result = await deps.modelGateway.generate(prompt.text);
  deps.logger.warn(`Model returned ${result.tag}`);
  return result;
};
```
