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

test("no-unasserted-return accepts a returned call when the function asserts elsewhere", () => {
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

  expect(messages).toHaveLength(0);
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
      function loadAccount(id) {
        return fetchJson(buildUrl(id));
      }
    `,
    options: [{ ignoreDelegates: false }],
    rule,
    ruleName: "no-unasserted-return",
  });

  expect(messages).toHaveLength(1);
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

test("no-unasserted-return honours configured assertion helper names", () => {
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

  expect(messages).toHaveLength(0);
});
