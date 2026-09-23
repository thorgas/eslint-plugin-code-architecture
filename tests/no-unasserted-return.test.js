import { expect, test } from "bun:test";
import rule from "../rules/no-unasserted-return.js";
import { lintRule } from "./rule-tester.js";

test("no-unasserted-return rejects returning a call from an assertion-free multi-statement function", () => {
  const messages = lintRule({
    code: `
      async function loadProfile(id) {
        const url = buildUrl(id);
        return fetchJson(url);
      }
    `,
    rule,
    ruleName: "no-unasserted-return",
  });

  expect(messages).toHaveLength(1);
  expect(messages[0]?.messageId).toBe("unassertedReturn");
});

test("no-unasserted-return rejects returning an awaited call the same way", () => {
  const messages = lintRule({
    code: `
      async function loadProfile(id) {
        const url = buildUrl(id);
        return await fetchJson(url);
      }
    `,
    rule,
    ruleName: "no-unasserted-return",
  });

  expect(messages).toHaveLength(1);
});

test("no-unasserted-return accepts assign, assert, return", () => {
  const messages = lintRule({
    code: `
      async function loadProfile(id) {
        const url = buildUrl(id);
        const profile = await fetchJson(url);
        assert(profile.id.length > 0, "profile must have an id");
        return profile;
      }
    `,
    rule,
    ruleName: "no-unasserted-return",
  });

  expect(messages).toHaveLength(0);
});

test("no-unasserted-return does not let an unrelated assertion cover a returned call", () => {
  const messages = lintRule({
    code: `
      function totalFor(entries, unit) {
        assert(unit.length > 0, "unit must be named");
        return sumInUnit(entries, unit);
      }
    `,
    rule,
    ruleName: "no-unasserted-return",
  });

  expect(messages).toHaveLength(1);
});

test("no-unasserted-return leaves single-statement delegates alone by default", () => {
  const messages = lintRule({
    code: `
      const loadProfile = (id) => fetchJson(buildUrl(id));
      function loadAccount(id) {
        return fetchJson(buildUrl(id));
      }
    `,
    rule,
    ruleName: "no-unasserted-return",
  });

  expect(messages).toHaveLength(0);
});

test("no-unasserted-return checks delegates when ignoreDelegates is off", () => {
  const messages = lintRule({
    code: `
      const loadProfile = (id) => fetchJson(buildUrl(id));
      function loadAccount(id) {
        return fetchJson(buildUrl(id));
      }
    `,
    options: [{ ignoreDelegates: false }],
    rule,
    ruleName: "no-unasserted-return",
  });

  expect(messages).toHaveLength(2);
});

test("no-unasserted-return treats a computed single-call wrapper as a delegate", () => {
  const messages = lintRule({
    code: `
      function dispatch(handler, value) {
        return handler[value.kind](value);
      }
    `,
    rule,
    ruleName: "no-unasserted-return",
  });

  expect(messages).toHaveLength(0);
});

test("no-unasserted-return attributes assertions to the function that holds them", () => {
  const messages = lintRule({
    code: `
      function outer(id) {
        const check = (value) => {
          assert(value.length > 0, "value must be non-empty");
          return value;
        };
        check(id);
        return fetchJson(id);
      }
    `,
    rule,
    ruleName: "no-unasserted-return",
  });

  expect(messages).toHaveLength(1);
});

test("no-unasserted-return ignores returns of plain values and constructions", () => {
  const messages = lintRule({
    code: `
      function describe(id) {
        const label = id.trim();
        return { id, label };
      }
    `,
    rule,
    ruleName: "no-unasserted-return",
  });

  expect(messages).toHaveLength(0);
});

test("no-unasserted-return does not let a configured helper cover another return", () => {
  const messages = lintRule({
    code: `
      function loadProfile(id) {
        const profile = fetchProfile(id);
        invariant(profile, "profile must exist");
        return normalize(profile);
      }
    `,
    options: [{ assertionNames: ["invariant"] }],
    rule,
    ruleName: "no-unasserted-return",
  });

  expect(messages).toHaveLength(1);
});

test("no-unasserted-return finds calls in conditional and logical returns", () => {
  const messages = lintRule({
    code: `
      function load(enabled, cached) {
        const source = enabled ? "remote" : "local";
        return enabled ? fetchRemote(source) : cached || fetchLocal(source);
      }
    `,
    rule,
    ruleName: "no-unasserted-return",
  });
  expect(messages).toHaveLength(2);
});

test("no-unasserted-return reuses production eligibility options", () => {
  const messages = lintRule({
    code: `
      const select = (state) => state.value;
      const render = (items) => items.map((item) => format(item));
      const restart = () => actor.send({ type: "RESTART" });
    `,
    options: [{
      ignoreDelegates: true,
      ignoreDirectCallbacks: true,
      ignoreNoInputClosures: true,
      minimumStatements: 2,
    }],
    rule,
    ruleName: "no-unasserted-return",
  });
  expect(messages).toHaveLength(0);
});

test("no-unasserted-return structurally recognizes a namespace-imported assertion and does not flag returning it directly", () => {
  const messages = lintRule({
    code: `
      import * as a from "assert";
      function checkAndReturn(value) {
        doSomethingElse();
        return a.ok(value);
      }
    `,
    rule,
    ruleName: "no-unasserted-return",
  });

  expect(messages).toHaveLength(0);
});

test("no-unasserted-return still flags returning a call from an unrelated import under an assert-like alias", () => {
  const messages = lintRule({
    code: `
      import { isEqual as checkEqual } from "lodash";
      function compare(left, right) {
        doSomethingElse();
        return checkEqual(left, right);
      }
    `,
    rule,
    ruleName: "no-unasserted-return",
  });

  expect(messages).toHaveLength(1);
  expect(messages[0]?.messageId).toBe("unassertedReturn");
});

test("no-unasserted-return follows a returned local call binding", () => {
  const messages = lintRule({
    code: `
      function example(input) {
        const result = load(input);
        return result;
      }
    `,
    options: [{ ignoreDelegates: false }],
    rule,
    ruleName: "no-unasserted-return",
  });

  expect(messages.map(({ messageId }) => messageId)).toEqual([
    "unassertedReturn",
  ]);
});

test("no-unasserted-return accepts an asserted local call binding", () => {
  const messages = lintRule({
    code: `
      function example(input) {
        const result = load(input);
        assert(result.ok);
        return result;
      }
    `,
    options: [{ ignoreDelegates: false }],
    rule,
    ruleName: "no-unasserted-return",
  });

  expect(messages).toHaveLength(0);
});

test("no-unasserted-return allows explicitly trusted return call patterns", () => {
  const messages = lintRule({
    code: `
      function hasMatch(items, query) {
        const normalized = query.trim();
        return items.some((item) => item.label.toLowerCase().includes(normalized));
      }
      function matchesPath(name, path) {
        const suffix = path.slice(1);
        return name === suffix || name.endsWith(suffix);
      }
    `,
    options: [{ allowedReturnCalls: ["*.some", "*.includes", "*.endsWith"] }],
    rule,
    ruleName: "no-unasserted-return",
  });

  expect(messages).toHaveLength(0);
});

test("no-unasserted-return keeps unlisted calls strict when return patterns are configured", () => {
  const messages = lintRule({
    code: `
      function load(items) {
        prepare(items);
        return fetchItems(items);
      }
    `,
    options: [{ allowedReturnCalls: ["*.some"] }],
    rule,
    ruleName: "no-unasserted-return",
  });

  expect(messages).toHaveLength(1);
});

test("no-unasserted-return checks every call in a returned conditional local", () => {
  const messages = lintRule({
    code: `
      function example(condition) {
        const result = condition ? values.some(test) : load();
        return result;
      }
    `,
    options: [{ allowedReturnCalls: ["values.some"] }],
    rule,
    ruleName: "no-unasserted-return",
  });

  expect(messages).toHaveLength(1);
  expect(messages[0]?.message).toContain("load");
});

test("no-unasserted-return checks every call in a returned logical local", () => {
  const messages = lintRule({
    code: `
      function example(cached) {
        const result = cached || values.some(test) || load();
        return result;
      }
    `,
    options: [{ allowedReturnCalls: ["values.some"] }],
    rule,
    ruleName: "no-unasserted-return",
  });

  expect(messages).toHaveLength(1);
  expect(messages[0]?.message).toContain("load");
});

test("no-unasserted-return rejects an assertion invalidated by a member write", () => {
  const messages = lintRule({
    code: `
      function example(input) {
        const result = load(input);
        assert(result.valid);
        result.valid = false;
        return result;
      }
    `,
    rule,
    ruleName: "no-unasserted-return",
  });

  expect(messages).toHaveLength(1);
});

test("no-unasserted-return follows local bindings in conditional return leaves", () => {
  const messages = lintRule({
    code: `
      function indirect(flag) {
        const result = load();
        return flag ? result : null;
      }
    `,
    options: [{ ignoreDelegates: false }],
    rule,
    ruleName: "no-unasserted-return",
  });

  expect(messages).toHaveLength(1);
  expect(messages[0]?.message).toContain("load");
});

test("no-unasserted-return follows locals in both conditional and logical leaves", () => {
  const messages = lintRule({
    code: `
      function choose(flag, cached) {
        const primary = loadPrimary();
        const fallback = loadFallback();
        return flag ? primary : cached || fallback;
      }
    `,
    options: [{ ignoreDelegates: false }],
    rule,
    ruleName: "no-unasserted-return",
  });

  expect(messages).toHaveLength(2);
});

test("no-unasserted-return accepts an asserted local conditional leaf", () => {
  const messages = lintRule({
    code: `
      function indirect(flag) {
        const result = load();
        assert(result.valid);
        return flag ? result : null;
      }
    `,
    options: [{ ignoreDelegates: false }],
    rule,
    ruleName: "no-unasserted-return",
  });

  expect(messages).toHaveLength(0);
});

test("no-unasserted-return rejects a conditional local assertion invalidated by mutation", () => {
  const messages = lintRule({
    code: `
      function indirect(flag) {
        const result = load();
        assert(result.valid);
        result.valid = false;
        return flag ? result : null;
      }
    `,
    options: [{ ignoreDelegates: false }],
    rule,
    ruleName: "no-unasserted-return",
  });

  expect(messages).toHaveLength(1);
});

test("no-unasserted-return trusts configured imported export identities through aliases", () => {
  const messages = lintRule({
    code: `
      import { isEligible as eligible } from "@app/predicates";
      import * as predicates from "@app/predicates";
      function direct(value) {
        prepare(value);
        return eligible(value);
      }
      function namespaced(value) {
        prepare(value);
        return predicates.isEligible(value);
      }
    `,
    options: [{
      ignoreDelegates: false,
      trustedReturnImports: [{ module: "@app/predicates", exports: ["isEligible"] }],
    }],
    rule,
    ruleName: "no-unasserted-return",
  });

  expect(messages).toHaveLength(0);
});

test("no-unasserted-return rejects locally shadowed trusted import names", () => {
  const messages = lintRule({
    code: `
      import { isEligible } from "@app/predicates";
      function example(value) {
        const isEligible = repository.some;
        prepare(value);
        return isEligible(value);
      }
    `,
    options: [{
      ignoreDelegates: false,
      trustedReturnImports: [{ module: "@app/predicates", exports: ["isEligible"] }],
    }],
    rule,
    ruleName: "no-unasserted-return",
  });

  expect(messages).toHaveLength(1);
});
