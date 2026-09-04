import { expect, test } from "bun:test";
import rule from "../rules/no-exported-dependency-instances.js";
import { lintRule } from "./rule-tester.js";

const lint = (code, options, filename = "src/example.ts") =>
  lintRule({
    code,
    filename,
    options: options ? [options] : [],
    rule,
    ruleName: "no-exported-dependency-instances",
  });

const messageIds = (messages) => messages.map(({ messageId }) => messageId);

test("no-exported-dependency-instances accepts factories, local instances, and pure results", () => {
  expect(
    lint(`
      export const createLogger = (): Logger => ({ log: console.log });
      const logger = createLogger();
      export const parsed = parseConfig();
      export const total = sum(1, 2);
      export const lazy = () => createDb();
      export const factory = createDb;
      export { createLogger as makeLogger };
      export { db } from "./database.js";
    `),
  ).toHaveLength(0);
});

test("no-exported-dependency-instances rejects direct exports created by any factory verb or constructor", () => {
  const messages = lint(`
    export const logger = createLogger();
    export const db = createDb("url");
    export const clock = new Time();
    export const appSettingsStore = createAppSettingsStore();
    export const client = makeClient();
    export const connection = openConnection();
    export let socket = new WebSocket("wss://example");
  `);

  expect(messages).toHaveLength(7);
  expect(messages.every(({ messageId }) => messageId === "exportedInstance")).toBe(
    true,
  );
  expect(messages[3]?.message).toContain("createAppSettingsStore()");
});

test("no-exported-dependency-instances follows aliases, default exports, member factories, and wrappers", () => {
  const messages = lint(`
    import { createStore } from "@xstate/store";
    const store = xstate.createStore({ context: {} });
    const frozen = Object.freeze(createRegistry());
    const awaited = await createConnection();
    const typed = createCache() as Cache;
    export { store as appStore, frozen, awaited, typed };
    export default createRouter();
  `);

  expect(messageIds(messages)).toEqual(Array(5).fill("exportedInstance"));
});

test("no-exported-dependency-instances reports default-exported identifiers created at module scope", () => {
  const messages = lint(`
    const queryClient = new QueryClient();
    export default queryClient;
  `);

  expect(messageIds(messages)).toEqual(["exportedInstance"]);
});

test("no-exported-dependency-instances ignores instances created inside functions", () => {
  expect(
    lint(`
      export const createDeps = () => {
        const logger = createLogger();
        return { logger };
      };
      let cached;
      export const getCache = () => {
        cached = createCache();
        return cached;
      };
    `),
  ).toHaveLength(0);
});

test("no-exported-dependency-instances ignores definition factories by default and by configuration", () => {
  const code = `
    export const ThemeContext = createContext(null);
    export const OtherContext = React.createContext(null);
    export const styles = StyleSheet.create({ root: { flex: 1 } });
    export const schema = buildSchema();
  `;

  expect(messageIds(lint(code))).toEqual(["exportedInstance"]);
  expect(lint(code, { ignoredFactories: ["buildSchema"] })).toHaveLength(0);
});

test("no-exported-dependency-instances supports a custom factory pattern", () => {
  const code = `
    export const db = createDb();
    export const service = provideService();
  `;

  expect(
    messageIds(lint(code, { factoryPattern: "^provide[A-Z]" })),
  ).toEqual(["exportedInstance"]);
});

test("no-exported-dependency-instances allows configured composition roots", () => {
  const code = "export const deps = createAppDeps();";
  const options = { compositionRoots: ["src/app/**"], root: "." };

  expect(lint(code, options, "src/app/deps.ts")).toHaveLength(0);
  expect(messageIds(lint(code, options, "src/features/deps.ts"))).toEqual([
    "exportedInstance",
  ]);
});
