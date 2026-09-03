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

test("require-assertions can ignore thin delegates", () => {
  const messages = lintRule({
    code: `
      const restart = () => actor.send({ type: "RESTARTED" });
      function normalize(value) { return normalizeValue(value); }
    `,
    options: [{ ignoreDelegates: true, minimum: 2 }],
    rule,
    ruleName: "require-assertions",
  });
  expect(messages).toHaveLength(0);
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

test("require-assertions can ignore functions that render JSX", () => {
  const messages = lintRule({
    code: `function TonalIcon({ name }) {
  const t = useTheme();
  return <SquircleView style={t.chip}><Icon name={name} /></SquircleView>;
}

const Badge = ({ label }) => <Text>{label}</Text>;

function MaybeRow({ row }) {
  const t = useTheme();
  return row ? <Row style={t.row} value={row} /> : null;
}`,
    filename: "src/screen.tsx",
    options: [{ ignoreJSXComponents: true, minimum: 2 }],
    rule,
    ruleName: "require-assertions",
  });

  expect(messages).toHaveLength(0);
});

test("require-assertions can ignore React hooks while keeping helpers strict", () => {
  const messages = lintRule({
    code: `function useRowModel(rows) {
  function summarize(values) {
    const total = values.length;
    return { values, total };
  }
  return summarize(rows);
}

const useAuthScreenFields = (session) => {
  const email = session.email;
  return { email };
};

function usefulValue(values) {
  const total = values.length;
  return { values, total };
}

function RowList({ rows }) {
  const model = useRowModel(rows);
  return <List data={model.rows} />;
}`,
    filename: "src/screen.tsx",
    options: [
      { ignoreJSXComponents: true, ignoreReactHooks: true, minimum: 2 },
    ],
    rule,
    ruleName: "require-assertions",
  });

  expect(messages).toHaveLength(2);
  expect(messages.map((message) => message.line)).toEqual([2, 14]);
});

test("require-assertions keeps React hooks strict by default", () => {
  const messages = lintRule({
    code: `function useAuthScreenFields(session) {
  const email = session.email;
  return { email };
}`,
    options: [{ minimum: 2 }],
    rule,
    ruleName: "require-assertions",
  });

  expect(messages).toHaveLength(1);
});

test("require-assertions judges a component by its own return, not a callback's", () => {
  const messages = lintRule({
    code: `function buildRow(rows) {
  const first = rows[0];
  return renderer.map(() => <Cell value={first} />);
}`,
    filename: "src/screen.tsx",
    options: [{ ignoreJSXComponents: true, minimum: 2 }],
    rule,
    ruleName: "require-assertions",
  });

  expect(messages).toHaveLength(1);
});

test("require-assertions keeps a working zero-parameter FunctionDeclaration strict under ignoreNoInputClosures", () => {
  const messages = lintRule({
    code: `function initialize() {
  startServices();
  connectObservers();
}`,
    options: [{ ignoreNoInputClosures: true, minimum: 2 }],
    rule,
    ruleName: "require-assertions",
  });

  expect(messages).toHaveLength(1);
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

test("require-assertions credits a wrapper's callback assertions to the wrapper", () => {
  const messages = lintRule({
    code: `const loadMoreThreads = async (page) => {
  const next = await fetchPage(page);
  setState((current) => {
    assert(next.length >= 0, "a page never shrinks the list");
    assert(unique(next), "a page never repeats an id");
    return current.concat(next);
  });
};`,
    options: [{ creditWrapperClosures: true, minimum: 2 }],
    rule,
    ruleName: "require-assertions",
  });

  expect(messages).toHaveLength(0);
});

test("require-assertions still reports a wrapper whose callback does not assert", () => {
  const messages = lintRule({
    code: `const loadMoreThreads = async (page) => {
  const next = await fetchPage(page);
  setState((current) => {
    record(next);
    return current.concat(next);
  });
};`,
    options: [{ creditWrapperClosures: true, minimum: 2 }],
    rule,
    ruleName: "require-assertions",
  });

  expect(messages).toHaveLength(2);
});

test("require-assertions counts guarded throws when countGuardedThrows is on", () => {
  const messages = lintRule({
    code: `function parseAge(input) {
  if (typeof input !== "string") throw new Error("age must be a string");
  if (Number.isNaN(Number(input))) throw new Error("age must be numeric");
  return Number(input);
}`,
    options: [{ countGuardedThrows: true, minimum: 2 }],
    rule,
    ruleName: "require-assertions",
  });

  expect(messages).toHaveLength(0);
});

test("require-assertions still reports the same validator when countGuardedThrows is off", () => {
  const messages = lintRule({
    code: `function parseAge(input) {
  if (typeof input !== "string") throw new Error("age must be a string");
  if (Number.isNaN(Number(input))) throw new Error("age must be numeric");
  return Number(input);
}`,
    options: [{ minimum: 2 }],
    rule,
    ruleName: "require-assertions",
  });

  expect(messages).toHaveLength(1);
});

test("require-assertions does not count an unconditional throw at the top of a function", () => {
  const messages = lintRule({
    code: `function notImplemented() {
  throw new Error("not implemented");
}`,
    options: [{ countGuardedThrows: true, minimum: 1 }],
    rule,
    ruleName: "require-assertions",
  });

  expect(messages).toHaveLength(1);
});

test("require-assertions does not count a rethrow inside a catch block", () => {
  const messages = lintRule({
    code: `function retryOnce(run) {
  try {
    return run();
  } catch (error) {
    if (error.retryable) throw error;
    return null;
  }
}`,
    options: [{ countGuardedThrows: true, minimum: 1 }],
    rule,
    ruleName: "require-assertions",
  });

  expect(messages).toHaveLength(1);
});

test("require-assertions attributes a guarded throw inside a nested callback to that callback, not the outer function", () => {
  const messages = lintRule({
    code: `function buildValidator() {
  return function validate(value) {
    if (!value) throw new Error("value required");
    if (typeof value !== "string") throw new Error("value must be a string");
    return value;
  };
}`,
    options: [{ countGuardedThrows: true, minimum: 2 }],
    rule,
    ruleName: "require-assertions",
  });

  expect(messages).toHaveLength(1);
  expect(messages[0]?.line).toBe(1);
});

test("require-assertions combines a guarded throw with an assert to reach the minimum", () => {
  const messages = lintRule({
    code: `function parseAge(input) {
  assert(typeof input === "string" || typeof input === "number", "input must be a string or number");
  if (Number.isNaN(Number(input))) throw new Error("age must be numeric");
  return Number(input);
}`,
    options: [{ countGuardedThrows: true, minimum: 2 }],
    rule,
    ruleName: "require-assertions",
  });

  expect(messages).toHaveLength(0);
});

test("require-assertions does not credit a callback to a function that computes on its own", () => {
  const messages = lintRule({
    code: `const summarize = (rows) => {
  const total = rows.length;
  emit(() => {
    assert(total >= 0, "total is never negative");
    assert(rows.length === total, "rows did not change");
  });
  return total;
};`,
    options: [{ creditWrapperClosures: true, minimum: 2 }],
    rule,
    ruleName: "require-assertions",
  });

  expect(messages).toHaveLength(1);
});
