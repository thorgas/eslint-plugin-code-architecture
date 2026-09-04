# no-exported-dependency-instances

Disallows exporting a module-level instance that is created at import time by a constructor or a factory. Such an export is a global singleton: every importer shares it, tests cannot substitute it, and its construction runs as a side effect of `import`. Export the factory instead and create the instance in the composition root that assembles dependencies.

Invalid:

```ts
export const logger = createLogger();
export const db = createDb("url");
export const queryClient = new QueryClient();
export const appSettingsStore = createAppSettingsStore();
export default createRouter();

const store = xstate.createStore({ context: {} });
export { store as appStore };
```

Valid:

```ts
export const createLogger = (): Logger => ({
  log: console.log,
});

export const createAppDeps = () => {
  const logger = createLogger();
  return { logger };
};

export const parsed = parseConfig();
export const lazyDb = () => createDb("url");
```

## What counts as an instance

An initializer is an instance when, after unwrapping `await`, `as`, `satisfies`, `!`, `Object.freeze`, and `Object.seal`, it is:

- a `new` expression, or
- a call whose callee's last segment matches the factory pattern. The default pattern matches `create`, `make`, `build`, `init`, `initialize`, `open`, `connect`, `instantiate`, and `setup` followed by a capital letter or the end of the name, so `createDb()`, `ns.createStore()`, and `openConnection()` match while `parseConfig()` and `sum()` do not.

Direct exports, `export let`, same-file named re-exports and aliases, `export default <expression>`, and `export default <identifier>` are all checked. Instances created inside functions are never reported; that is where they belong.

Definition factories whose products are the documented export of their APIs are ignored by default: `createContext`, `React.createContext`, and `StyleSheet.create`.

## Configuration

```js
"code-architecture/no-exported-dependency-instances": [
  "error",
  {
    compositionRoots: ["src/app/**"],
    factoryPattern: "^(?:create|provide)(?:[A-Z]|$)",
    ignoredFactories: ["createSlice", "buildSchema"],
  },
]
```

- `compositionRoots` are glob patterns relative to the working directory, or to `root` when configured. Files matched may export assembled instances.
- `factoryPattern` replaces the default factory verb pattern.
- `ignoredFactories` extends the default list of definition factories by callee name, including member forms such as `Redux.createSlice`.

Reference: Evolu, [Dependency Injection guidelines](https://www.evolu.dev/docs/dependency-injection), “Never create a global instance.”

## Production-derived example

This redacted private-backend composition root creates concrete services locally and returns only the assembled dependency contract.

```ts
export const createAppDeps = (): AppDeps => {
  const logger = createNodeLogger();
  const clock = createNodeClock();
  const repository = createRepository({ logger });
  return { clock, logger, repository };
};
```
