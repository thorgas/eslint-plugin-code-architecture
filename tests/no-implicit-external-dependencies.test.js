import { expect, test } from "bun:test";
import rule from "../rules/no-implicit-external-dependencies.js";
import { lintRule } from "./rule-tester.js";

const lint = (code, options, filename = "src/example.ts") =>
  lintRule({
    code,
    filename,
    options: options ? [options] : [],
    rule,
    ruleName: "no-implicit-external-dependencies",
  });

test("no-implicit-external-dependencies rejects Evolu's implicit time and logging dependencies", () => {
  const messages = lint(`
    const timeUntilEvent = (eventTimestamp: number) =>
      eventTimestamp - Date.now();
    const announce = () => console.log("ready");
  `);

  expect(messages).toHaveLength(2);
  expect(messages.every(({ messageId }) => messageId === "implicitGlobal")).toBe(
    true,
  );
  expect(messages[0]?.message).toContain("TimeDep");
  expect(messages[1]?.message).toContain("LoggerDep");
});

test("no-implicit-external-dependencies accepts injected capabilities and shadowed names", () => {
  expect(
    lint(`
      const timeUntilEvent =
        (deps: TimeDep) =>
        (eventTimestamp: number) =>
          eventTimestamp - deps.time.now();
      const Date = { now: () => 123 };
      const console = { log: (message: string) => message };
      Date.now();
      console.log("local");
    `),
  ).toHaveLength(0);
});

test("no-implicit-external-dependencies rejects captured and destructured global capabilities", () => {
  const messages = lint(`
    const now = Date.now;
    const { log } = console;
  `);

  expect(messages.map(({ messageId }) => messageId)).toEqual([
    "implicitGlobal",
    "implicitGlobal",
  ]);
});

test("no-implicit-external-dependencies allows source-backed dependency factories", () => {
  expect(
    lint(`
      const createTime = (): Time => ({ now: () => Date.now() });
      const createTestTime = (): Time => ({ now: () => Date.now() });
      const createLogger = (): Logger => ({
        log: (...args) => console.log(...args),
      });
    `),
  ).toHaveLength(0);
});

test("no-implicit-external-dependencies supports configured globals and factories", () => {
  const options = {
    capabilities: [
      {
        dependency: "PlatformTimeDep",
        factories: ["createPlatformTime"],
        replacement: "deps.platformTime.now()",
        selector: "Platform.now",
      },
    ],
  };

  expect(
    lint(
      `
        const read = () => Platform.now();
        const createPlatformTime = () => ({
          now: () => Platform.now(),
        });
      `,
      options,
    ).map(({ messageId }) => messageId),
  ).toEqual(["implicitGlobal"]);
});

test("no-implicit-external-dependencies rejects configured imported service locators", () => {
  const messages = lint(
    `
      import { createDb, db as database } from "@/database.js";
      const findUser = () => database.findUser();
      const create = () => createDb();
      const metadata = { database: "primary" };
    `,
    {
      serviceLocators: [
        {
          dependency: "DatabaseDep",
          imports: ["db"],
          module: "@/database.js",
          replacement: "deps.database",
        },
      ],
    },
  );

  expect(messages).toHaveLength(1);
  expect(messages[0]?.messageId).toBe("importedServiceLocator");
  expect(messages[0]?.message).toContain("DatabaseDep");
});

test("no-implicit-external-dependencies allows configured factories and composition roots", () => {
  const options = {
    compositionRoots: ["src/main.ts"],
    dependencyFactories: ["createDatabase"],
    serviceLocators: [
      {
        dependency: "DatabaseDep",
        imports: ["db"],
        module: "@/database.js",
        replacement: "deps.database",
      },
    ],
  };
  const code = `
    import { db } from "@/database.js";
    const createDatabase = () => ({ query: () => db.query() });
  `;

  expect(lint(code, options)).toHaveLength(0);
  expect(
    lint(
      'import { db } from "@/database.js"; db.connect();',
      options,
      "src/main.ts",
    ),
  ).toHaveLength(0);
});

test("no-implicit-external-dependencies keeps built-in groups when custom capabilities are added", () => {
  const messages = lint(
    `
      const stamp = () => Date.now();
      const say = () => console.log("hi");
      const read = () => Platform.now();
    `,
    {
      capabilities: [
        {
          dependency: "PlatformTimeDep",
          replacement: "deps.platformTime.now()",
          selector: "Platform.now",
        },
      ],
    },
  );

  expect(messages.map(({ message }) => message.split(" ")[0])).toEqual([
    "Date.now",
    "console.*",
    "Platform.now",
  ]);
});

test("no-implicit-external-dependencies narrows enforcement to the configured groups", () => {
  const code = `
    const stamp = () => Date.now();
    const say = () => console.log("hi");
    const roll = () => Math.random();
  `;

  expect(
    lint(code, { groups: ["time"] }).map(({ message }) => message.split(" ")[0]),
  ).toEqual(["Date.now"]);
  expect(lint(code, { groups: [] })).toHaveLength(0);
});

test("no-implicit-external-dependencies detects every built-in capability group", () => {
  const messages = lint(`
    const a = () => new Date();
    const b = () => performance.now();
    const c = () => Math.random();
    const d = () => crypto.randomUUID();
    const e = () => process.env.API_URL;
    const f = () => fetch("/api");
    const g = () => new WebSocket("wss://x");
    const h = () => localStorage.getItem("k");
    const i = () => document.cookie;
    const j = () => new Intl.DateTimeFormat().format(0);
    const k = () => navigator.language;
  `);

  expect(
    messages.map(({ message }) => /Inject (\w+)/u.exec(message)?.[1]),
  ).toEqual([
    "TimeDep",
    "TimeDep",
    "RandomDep",
    "RandomDep",
    "ConfigDep",
    "FetchDep",
    "FetchDep",
    "StorageDep",
    "StorageDep",
    "LocaleDep",
    "LocaleDep",
  ]);
});

test("no-implicit-external-dependencies ignores pure constructor calls, type references, and local shadows", () => {
  expect(
    lint(`
      const parse = (value: string) => new Date(value);
      const at = (ms: number) => new Date(ms);
      type Clock = { readonly now: typeof Date.now };
      const typed = (client: WebSocket, formatter: Intl.DateTimeFormat) => [client, formatter];
      const fetch = (url: string) => url;
      const call = () => fetch("/local");
      const withEnv = (process: { env: Record<string, string> }) => process.env.X;
    `),
  ).toHaveLength(0);
});

test("no-implicit-external-dependencies recognizes declared globals from languageOptions", () => {
  const messages = lintRule({
    code: "const roll = () => Math.random(); const send = () => fetch('/x');",
    languageOptions: {
      globals: { Math: "readonly", fetch: "readonly" },
    },
    rule,
    ruleName: "no-implicit-external-dependencies",
  });

  expect(messages.map(({ messageId }) => messageId)).toEqual([
    "implicitGlobal",
    "implicitGlobal",
  ]);
});

test("no-implicit-external-dependencies derives allowed factories from each dependency name", () => {
  expect(
    lint(`
      const createRandom = (): Random => ({ next: () => Math.random() });
      const createTestFetch = () => ({ fetch: (url: string) => fetch(url) });
      const createStorage = () => ({
        read: (key: string) => localStorage.getItem(key),
      });
      class Config {
        static createConfig() {
          return process.env;
        }
      }
    `),
  ).toHaveLength(0);
});
