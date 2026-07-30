# no-implicit-external-dependencies

Requires code that interacts with the outside world to receive that capability through dependency injection. This closes the gap between validating an existing `deps` signature and detecting code that bypasses DI entirely.

Invalid:

```ts
const timeUntilEvent = (eventTimestamp: number) =>
  eventTimestamp - Date.now();
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

The default capabilities come directly from Evolu's examples:

- `Date.now` requires `TimeDep` and recommends `deps.time.now()`.
- `console.*` requires `LoggerDep` and recommends `deps.logger`.
- `createTime`, `createTestTime`, `createLogger`, and `createTestLogger` are the corresponding allowed dependency factories.

Locally shadowed `Date` or `console` bindings are not globals and are ignored. Factory allowances extend into nested callbacks, which permits the `log` implementation inside `createLogger`.

## Configuration

Database instances and other project-specific service locators must be declared explicitly:

```js
"code-architecture/no-implicit-external-dependencies": [
  "error",
  {
    compositionRoots: ["src/main.ts"],
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

`compositionRoots` are glob patterns relative to the working directory, or to `root` when configured. Direct external access is allowed throughout those explicitly listed files.

Use `capabilities` to replace the default global capability list:

```js
{
  capabilities: [
    {
      selector: "Platform.now",
      dependency: "PlatformTimeDep",
      replacement: "deps.platformTime.now()",
      factories: ["createPlatformTime"],
    },
  ],
}
```

Selectors support one global object and either an exact member or `*`. The rule uses ESLint scope information to distinguish globals from local bindings. It deliberately does not guess whether arbitrary calls such as `repository.save()` are external; configure the imported service locator instead.

Reference: Evolu, [Dependency Injection](https://www.evolu.dev/docs/dependency-injection), especially its distinction between local arguments and external interactions such as time, logging, and databases.
