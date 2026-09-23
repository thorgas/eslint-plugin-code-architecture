import { expect, test } from "bun:test";
import rule from "../rules/prefer-readonly-types.js";
import { lintRule } from "./rule-tester.js";

const lint = (code, options = []) =>
  lintRule({ code, options, rule, ruleName: "prefer-readonly-types" });

test("prefer-readonly-types accepts readonly properties and collections", () => {
  expect(
    lint(`
      interface Example {
        readonly id: number;
        readonly items: ReadonlyArray<string>;
        readonly tags: ReadonlySet<string>;
      }
    `),
  ).toHaveLength(0);
});

test("prefer-readonly-types can scope collection checks to contracts", () => {
  const messages = lint(
    `
      interface CacheContract { entries: Record<string, Entry> }
      function buildCache(): void {
        const entries: Map<string, Entry> = new Map();
        const pending: Entry[] = [];
      }
    `,
    [{ collectionScope: "contracts" }],
  );
  expect(messages.map(({ messageId }) => messageId)).toEqual([
    "readonlyProperty",
    "readonlyCollection",
  ]);
  expect(messages[1]?.message).toContain("Readonly<Record<K, V>>");
});

test("prefer-readonly-types rejects mutable interface properties and collections", () => {
  const messages = lint(`
    interface Example {
      id: number;
      items: Array<string>;
      tags: Set<string>;
      names: string[];
    }
  `);

  expect(messages.map(({ messageId }) => messageId)).toEqual([
    "readonlyProperty",
    "readonlyProperty",
    "readonlyCollection",
    "readonlyProperty",
    "readonlyCollection",
    "readonlyProperty",
    "readonlyArray",
  ]);
});
