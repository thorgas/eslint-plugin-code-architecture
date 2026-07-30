# no-exported-dependency-instances

Disallows an exported instance when its binding clearly matches its factory or constructor. This catches Evolu's `export const db = createDb()` service-locator example without treating every exported call result as a dependency.

Invalid:

```ts
export const logger = createLogger();
export const time = new Time();
```

Valid:

```ts
export const createLogger = (): Logger => ({
  log: console.log,
});

const logger = createLogger();
```

Direct exports and same-file named re-exports are checked. Matching is deliberately narrow: `logger` matches `createLogger()` and `time` matches `new Time()`.

Reference: Evolu, [Dependency Injection guidelines](https://www.evolu.dev/docs/dependency-injection), “Never create a global instance.”
