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
        ignoreDirectCallbacks: true,
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
    code: `function initialize(config) {
  startServices(config);
  connectObservers(config);
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

test("require-assertions can ignore short direct call callbacks", () => {
  const messages = lintRule({
    code: `register((value) => {
  consume(value);
  record(value);
});
schedule(() => flush());
observe(new Watcher(() => track()));`,
    options: [{ ignoreDirectCallbacks: true, minimum: 2 }],
    rule,
    ruleName: "require-assertions",
  });

  expect(messages).toHaveLength(0);
});

test("require-assertions keeps long direct callbacks and non-argument functions strict", () => {
  const messages = lintRule({
    code: `register((value) => {
  const first = value.a;
  const second = value.b;
  consume(first);
  record(second);
});

(function () {
  startServices();
  connectObservers();
})();

handlers.onSave = function (value) {
  persist(value);
  notify(value);
};

const bound = (value) => {
  persist(value);
  notify(value);
};
register(bound);

function declared(value) {
  persist(value);
  notify(value);
}`,
    options: [{ ignoreDirectCallbacks: true, minimum: 2 }],
    rule,
    ruleName: "require-assertions",
  });

  expect(messages).toHaveLength(5);
});

test("require-assertions honors directCallbackMaxStatements", () => {
  const messages = lintRule({
    code: `register((value) => {
  const first = value.a;
  const second = value.b;
  consume(first);
  record(second);
});`,
    options: [
      {
        directCallbackMaxStatements: 4,
        ignoreDirectCallbacks: true,
        minimum: 2,
      },
    ],
    rule,
    ruleName: "require-assertions",
  });

  expect(messages).toHaveLength(0);
});

test("require-assertions ignores short callbacks nested one level inside an options object argument", () => {
  const messages = lintRule({
    code: `streamScreen(buildMessages(screen), {
  onDone: (content, info) => {
    if (stale()) return;
    handleStreamDone(content, info);
  },
  onError: (err, trace) => {
    if (stale()) return;
    handleStreamError(err, trace);
  },
});`,
    options: [{ directCallbackMaxStatements: 2, ignoreDirectCallbacks: true, minimum: 2 }],
    rule,
    ruleName: "require-assertions",
  });

  expect(messages).toHaveLength(0);
});

test("require-assertions keeps a variable-bound handler map strict even with ignoreDirectCallbacks", () => {
  const messages = lintRule({
    code: `const handlers = {
  onSave: (v) => {
    persist(v);
    notify(v);
  },
};`,
    options: [{ ignoreDirectCallbacks: true, minimum: 2 }],
    rule,
    ruleName: "require-assertions",
  });

  expect(messages).toHaveLength(1);
});

test("require-assertions does not exempt callbacks nested two levels inside an argument object", () => {
  const messages = lintRule({
    code: `configure({
  handlers: {
    onSave: (v) => {
      persist(v);
      notify(v);
    },
  },
});`,
    options: [{ ignoreDirectCallbacks: true, minimum: 2 }],
    rule,
    ruleName: "require-assertions",
  });

  expect(messages).toHaveLength(1);
});

test("require-assertions does not exempt callbacks inside an ArrayExpression that is a call argument", () => {
  const messages = lintRule({
    code: `runAll([
  () => {
    persist();
    notify();
  },
]);`,
    options: [{ ignoreDirectCallbacks: true, minimum: 2 }],
    rule,
    ruleName: "require-assertions",
  });

  expect(messages).toHaveLength(1);
});

test("require-assertions treats a zero-parameter FunctionDeclaration as a no-input closure", () => {
  const messages = lintRule({
    code: `function buildDefaults() {
  return { retries: 3, timeout: 1000 };
}`,
    options: [{ ignoreNoInputClosures: true, minimum: 2 }],
    rule,
    ruleName: "require-assertions",
  });

  expect(messages).toHaveLength(0);
});

test("require-assertions keeps a FunctionDeclaration with parameters strict under ignoreNoInputClosures", () => {
  const messages = lintRule({
    code: `function buildConfig(overrides) {
  return { ...overrides, retries: 3 };
}`,
    options: [{ ignoreNoInputClosures: true, minimum: 2 }],
    rule,
    ruleName: "require-assertions",
  });

  expect(messages).toHaveLength(1);
});

test("require-assertions can ignore trivial Error-subclass constructors", () => {
  const messages = lintRule({
    code: `class AssetNotFoundError extends Error {
  constructor() {
    super("asset not found");
    this.name = "AssetNotFoundError";
  }
}`,
    options: [{ ignoreTrivialConstructors: true, minimum: 2 }],
    rule,
    ruleName: "require-assertions",
  });

  expect(messages).toHaveLength(0);
});

test("require-assertions keeps a constructor that validates or computes strict under ignoreTrivialConstructors", () => {
  const messages = lintRule({
    code: `class Range {
  constructor(min, max) {
    if (min > max) throw new Error("invalid range");
    this.min = min;
    this.max = max;
  }
}`,
    options: [{ ignoreTrivialConstructors: true, minimum: 2 }],
    rule,
    ruleName: "require-assertions",
  });

  expect(messages).toHaveLength(1);
});

test("require-assertions keeps a constructor that calls something other than super strict under ignoreTrivialConstructors", () => {
  const messages = lintRule({
    code: `class Session {
  constructor(id) {
    this.id = id;
    track(id);
  }
}`,
    options: [{ ignoreTrivialConstructors: true, minimum: 2 }],
    rule,
    ruleName: "require-assertions",
  });

  expect(messages).toHaveLength(1);
});
