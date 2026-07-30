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
