import { expect, test } from "bun:test";
import rule from "../rules/require-contract-assertions.js";
import { lintRule } from "./rule-tester.js";

const lint = (code, options = []) =>
  lintRule({
    code,
    options,
    rule,
    ruleName: "require-contract-assertions",
  });

test("require-contract-assertions reports every unchecked parameter and return", () => {
  const messages = lint(`
    function transfer(source: string, target: string): number {
      return source.length + target.length;
    }
  `);

  expect(messages.map(({ messageId }) => messageId)).toEqual([
    "unassertedParameter",
    "unassertedParameter",
    "unassertedReturn",
  ]);
  expect(messages[0]?.message).toContain("source");
  expect(messages[1]?.message).toContain("target");
});

test("require-contract-assertions accepts semantic preconditions and postconditions", () => {
  expect(
    lint(`
      function transfer(source: string, target: string): number {
        assert(source.length > 0);
        assert(target.length > 0);
        const result = source.length + target.length;
        assert(Number.isSafeInteger(result));
        return result;
      }
    `),
  ).toHaveLength(0);
});

test("require-contract-assertions does not count checks already expressed by TypeScript", () => {
  const messages = lint(`
    function normalize(value: string): string {
      assert(typeof value === "string");
      const result = value.trim();
      assert(typeof result === "string");
      return result;
    }
  `);

  expect(messages.map(({ messageId }) => messageId)).toEqual([
    "unassertedParameter",
    "unassertedReturn",
  ]);
});

test("require-contract-assertions rejects other obvious type-only checks", () => {
  const messages = lint(`
    function validate(
      date: Date,
      values: ReadonlyArray<string>,
      label: string
    ): Date {
      assert(date instanceof Date);
      assert(Array.isArray(values));
      assert(label !== undefined);
      const result = date;
      assert(result instanceof Date);
      return result;
    }
  `);

  expect(messages.map(({ messageId }) => messageId)).toEqual([
    "unassertedParameter",
    "unassertedParameter",
    "unassertedParameter",
    "unassertedReturn",
  ]);
});

test("require-contract-assertions treats optional-value checks as runtime preconditions", () => {
  expect(
    lint(`
      function normalize(value?: string): string {
        assert(value !== undefined);
        const result = value.trim();
        assert(result.length > 0);
        return result;
      }
    `),
  ).toHaveLength(0);
});

test("require-contract-assertions ignores references in assertion messages", () => {
  const messages = lint(`
    function normalize(value: string): string {
      assert(true, value);
      const result = value.trim();
      assert(true, result);
      return result;
    }
  `);

  expect(messages.map(({ messageId }) => messageId)).toEqual([
    "unassertedParameter",
    "unassertedReturn",
  ]);
});

test("require-contract-assertions checks destructured, default, and rest bindings", () => {
  expect(
    lint(`
      function collect(
        { id }: { id: string },
        limit = 10,
        ...values: ReadonlyArray<string>
      ): ReadonlyArray<string> {
        assert(id.length > 0);
        assert(limit > 0);
        assert(values.length <= limit);
        const result = values.slice(0, limit);
        assert(result.length <= limit);
        return result;
      }
    `),
  ).toHaveLength(0);
});

test("require-contract-assertions requires a postcondition to dominate each return", () => {
  const messages = lint(`
    function choose(value: number, check: boolean): number {
      assert(Number.isFinite(value));
      assert(typeof check === "boolean" && check === true);
      const result = value + 1;
      if (check) assert(result > 0);
      return result;
    }
  `);

  expect(messages.map(({ messageId }) => messageId)).toEqual([
    "unassertedReturn",
  ]);
});

test("require-contract-assertions accepts postconditions local to every return path", () => {
  expect(
    lint(`
      function clamp(value: number): number {
        assert(Number.isFinite(value));
        if (value < 0) {
          const result = 0;
          assert(result === 0);
          return result;
        }
        const result = value;
        assert(Number.isFinite(result));
        return result;
      }
    `),
  ).toHaveLength(0);
});

test("require-contract-assertions does not borrow assertions from nested functions", () => {
  const messages = lint(`
    function outer(value: number): number {
      const nested = () => {
        assert(Number.isFinite(value));
        assert(value > 0);
      };
      nested();
      return value;
    }
  `);

  expect(messages.map(({ messageId }) => messageId)).toEqual([
    "unassertedParameter",
    "unassertedReturn",
  ]);
});

test("require-contract-assertions reports computed returns that are not named and asserted", () => {
  const messages = lint(`
    const increment = (value: number): number => value + 1;
  `);

  expect(messages.map(({ messageId }) => messageId)).toEqual([
    "unassertedParameter",
    "unassertedReturn",
  ]);
  expect(messages[1]?.message).toContain("local binding");
});

test("require-contract-assertions skips void and statically evident returns", () => {
  expect(
    lint(`
      function stop(): void {
        return;
      }
      const enabled = (): boolean => true;
    `),
  ).toHaveLength(0);
});

test("require-contract-assertions supports configured assertion helpers", () => {
  expect(
    lint(
      `
        function parse(value: string): string {
          invariant(value.length > 0);
          const result = value.trim();
          invariant(result.length > 0);
          return result;
        }
      `,
      [{ assertionNames: ["invariant"] }],
    ),
  ).toHaveLength(0);
});

test("require-contract-assertions can reuse production function eligibility", () => {
  expect(
    lint(
      `
        const selectReady = (state: State) => state.ready;
        const allReady = (items: ReadonlyArray<Item>) =>
          items.every((item) => item.ready);
        const handleRestart = () => actor.send({ type: "RESTARTED" });
        const useStatus = (input: Input) => input.status;
      `,
      [{
        ignoreDelegates: true,
        ignoreDirectCallbacks: true,
        ignoreJSXComponents: true,
        ignoreNoInputClosures: true,
        ignoreReactHooks: true,
        minimumStatements: 2,
      }],
    ),
  ).toHaveLength(0);
});

test("require-contract-assertions can ignore React components and JSX callbacks", () => {
  const messages = lintRule({
    code: `const View = ({ items }: Props) => (
      <List
        data={items}
        renderItem={({ item }) => <Text>{item.title}</Text>}
      />
    );`,
    filename: "src/view.tsx",
    options: [{ ignoreJSXCallbacks: true, ignoreJSXComponents: true }],
    rule,
    ruleName: "require-contract-assertions",
  });
  expect(messages).toHaveLength(0);
});

test("require-contract-assertions exempts recognized assertion helper implementations", () => {
  expect(
    lint(
      `
        function assert(condition: unknown, message?: string): asserts condition {
          if (!condition) throw new Error(message);
        }
      `,
      [{ ignoreAssertionHelpers: true }],
    ),
  ).toHaveLength(0);
});

test("require-contract-assertions still checks meaningful domain contracts", () => {
  const messages = lint(
    `
      function normalize(value: string, limit: number): string {
        const result = value.trim().slice(0, limit);
        return result;
      }
    `,
    [{ minimumStatements: 2, ignoreDirectCallbacks: true }],
  );
  expect(messages.map(({ messageId }) => messageId)).toEqual([
    "unassertedParameter",
    "unassertedParameter",
    "unassertedReturn",
  ]);
});

test("require-contract-assertions rejects late and conditionally unreachable preconditions", () => {
  const messages = lint(`
    function normalize(value: string, enabled: boolean): string {
      const result = value.trim();
      if (enabled) assert(value.length > 0);
      assert(enabled === true);
      assert(result.length > 0);
      return result;
    }
  `);
  expect(messages.map(({ messageId }) => messageId)).toEqual([
    "unassertedParameter",
    "unassertedParameter",
  ]);
});

test("require-contract-assertions rejects postconditions invalidated by mutation", () => {
  const messages = lint(`
    function normalize(value: string): string {
      assert(value.length > 0);
      let result = value.trim();
      assert(result.length > 0);
      result = result.toUpperCase();
      return result;
    }
  `);
  expect(messages.map(({ messageId }) => messageId)).toEqual([
    "unassertedReturn",
  ]);
});

test("require-contract-assertions rejects vacuous checks and aliased type checks", () => {
  const messages = lint(`
    type Label = string;
    function normalize(value: Label): Label {
      assert(typeof value === "string");
      const result = value.trim();
      assert(result === result);
      return result;
    }
  `);
  expect(messages.map(({ messageId }) => messageId)).toEqual([
    "unassertedParameter",
    "unassertedReturn",
  ]);
});

test("require-contract-assertions structurally recognizes an aliased namespace import as an assertion", () => {
  const messages = lint(`
    import * as nodeAssert from "node:assert";
    const a = nodeAssert;
    function normalize(value: string): string {
      a.ok(value.length > 0);
      const result = value.trim();
      a.ok(result.length > 0);
      return result;
    }
  `);

  expect(messages).toHaveLength(0);
});

test("require-contract-assertions structurally recognizes a locally declared asserts-predicate helper", () => {
  const messages = lint(`
    function assertNonEmpty(value: string): asserts value is string {
      if (value.length === 0) throw new Error("empty");
    }
    function normalize(value: string): string {
      assertNonEmpty(value);
      const result = value.trim();
      assertNonEmpty(result);
      return result;
    }
  `);

  const normalizeMessages = messages.filter((message) => message.line >= 5);
  expect(normalizeMessages).toHaveLength(0);
});
