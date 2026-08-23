import { expect, test } from "bun:test";
import rule from "../rules/require-assertions.js";
import { lintRule } from "./rule-tester.js";

test("require-assertions reports a function below the configured assertion density", () => {
  const messages = lintRule({
    code: "function transfer(source, target) { return source - target; }",
    options: [{ minimum: 2 }],
    rule,
    ruleName: "require-assertions",
  });

  expect(messages).toHaveLength(1);
  expect(messages[0]?.messageId).toBe("insufficientAssertions");
});

test("require-assertions counts direct and qualified assertions per function", () => {
  const messages = lintRule({
    code: `function transfer(source, target) {
  assertDefined(source);
  nodeAssert.ok(target);
  return source - target;
}
const identity = (value) => value;`,
    rule,
    ruleName: "require-assertions",
  });

  expect(messages).toHaveLength(0);
});

test("require-assertions keeps parameterized XState actions strict", () => {
  const messages = lintRule({
    code: `createMachine({
  states: {
    ready: {
      on: {
        SAVE: {
          actions: [
            ({ context }) => {
              persist(context);
              notifySaved();
            },
            () => {
              recordTransition();
              notifySaved();
            },
          ],
        },
      },
    },
  },
});`,
    options: [
      {
        ignoreJSXCallbacks: true,
        ignoreNoInputClosures: true,
        minimum: 2,
      },
    ],
    rule,
    ruleName: "require-assertions",
  });

  expect(messages).toHaveLength(2);
});

test("require-assertions can ignore React render callbacks", () => {
  const messages = lintRule({
    code: `function Screen({ items }) {
  assert(items);
  assert(Array.isArray(items));
  return (
    <List
      data={items}
      renderItem={({ item }) => {
        const title = item.title;
        return <Text>{title}</Text>;
      }}
    />
  );
}`,
    filename: "src/screen.tsx",
    options: [{ ignoreJSXCallbacks: true, minimum: 2 }],
    rule,
    ruleName: "require-assertions",
  });

  expect(messages).toHaveLength(0);
});

test("require-assertions can ignore no-input orchestration closures", () => {
  const messages = lintRule({
    code: `const orchestrate = () => {
  startServices();
  connectObservers();
};`,
    options: [{ ignoreNoInputClosures: true, minimum: 2 }],
    rule,
    ruleName: "require-assertions",
  });

  expect(messages).toHaveLength(0);
});

test("require-assertions keeps boundary and domain functions strict", () => {
  const messages = lintRule({
    code: `function initialize() {
  startServices();
  connectObservers();
}

function summarize(values) {
  const total = values.length;
  return { total };
}

const service = {
  initialize() {
    startServices();
    connectObservers();
  },
};

class Service {
  initialize() {
    startServices();
    connectObservers();
  }
}`,
    options: [
      {
        ignoreJSXCallbacks: true,
        ignoreNoInputClosures: true,
        minimum: 2,
      },
    ],
    rule,
    ruleName: "require-assertions",
  });

  expect(messages).toHaveLength(4);
});

test("require-assertions does not exempt nested domain functions", () => {
  const messages = lintRule({
    code: `register((registry) => {
  assert(registry);
  assert(registry.expose);
  function summarize(values) {
    const total = values.length;
    return { total };
  }
  registry.expose(summarize);
});`,
    options: [
      {
        ignoreJSXCallbacks: true,
        ignoreNoInputClosures: true,
        minimum: 2,
      },
    ],
    rule,
    ruleName: "require-assertions",
  });

  expect(messages).toHaveLength(1);
  expect(messages[0]?.line).toBe(4);
});

test("require-assertions preserves exhaustive callback checking by default", () => {
  const messages = lintRule({
    code: `register((value) => {
  consume(value);
  record(value);
});`,
    options: [{ minimum: 2 }],
    rule,
    ruleName: "require-assertions",
  });

  expect(messages).toHaveLength(1);
});
