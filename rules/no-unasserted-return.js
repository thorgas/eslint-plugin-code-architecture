import {
  functionName,
  isFunctionExempt,
} from "./require-assertions.js";
import {
  assertionNameSet,
  isAssertionCall,
} from "./assertion-helpers.js";

const displayCalleeName = (node) => {
  if (node.type === "Identifier") return node.name;
  if (node.type !== "MemberExpression" || node.computed) return undefined;

  const objectName = displayCalleeName(node.object);
  if (!objectName || node.property.type !== "Identifier") return undefined;
  return `${objectName}.${node.property.name}`;
};

// `return f(...)` and `return await f(...)` are the shapes that smuggle an
// unexamined value out of a function. A returned identifier, literal, or
// object built in place has already been through the function's own hands.
const returnedCalls = (node) => {
  if (!node) return [];
  if (node.type === "CallExpression") return [node];
  if (
    [
      "AwaitExpression",
      "ChainExpression",
      "TSAsExpression",
      "TSNonNullExpression",
      "TSSatisfiesExpression",
      "TSTypeAssertion",
    ].includes(node.type)
  ) return returnedCalls(node.expression ?? node.argument);
  if (node.type === "ConditionalExpression") {
    return [
      ...returnedCalls(node.consequent),
      ...returnedCalls(node.alternate),
    ];
  }
  if (node.type === "LogicalExpression") {
    return [...returnedCalls(node.left), ...returnedCalls(node.right)];
  }
  return [];
};

const reportUnassertedReturn = (context, node, call) =>
  context.report({
    node,
    messageId: "unassertedReturn",
    data: { callee: displayCalleeName(call.callee) ?? "the call" },
  });

/** Requires direct call results to be bound, asserted, and then returned. */
export default {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow returning a call's result directly; assign, assert, then return",
      url: "https://github.com/tigerbeetle/tigerbeetle/blob/main/docs/TIGER_STYLE.md",
    },
    messages: {
      unassertedReturn:
        "This function returns {{callee}}(...) without asserting that result. Assign it to a local, assert its shape, then return it.",
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
          assertionNames: {
            type: "array",
            minItems: 1,
            items: { type: "string" },
          },
          directCallbackMaxStatements: { type: "integer", minimum: 0, default: 3 },
          ignoreAssertionHelpers: { type: "boolean", default: false },
          ignoreDelegates: { type: "boolean", default: true },
          ignoreDirectCallbacks: { type: "boolean", default: false },
          ignoreJSXCallbacks: { type: "boolean", default: false },
          ignoreJSXComponents: { type: "boolean", default: false },
          ignoreNoInputClosures: { type: "boolean", default: false },
          ignoreReactHooks: { type: "boolean", default: false },
          ignoreTrivialConstructors: { type: "boolean", default: false },
          minimumStatements: { type: "integer", minimum: 0, default: 1 },
        },
      },
    ],
  },
  create(context) {
    const options = context.options[0] ?? {};
    const assertionNames = assertionNameSet(options.assertionNames);
    const eligibility = {
      ...options,
      checkExpressionBodies: true,
      ignoreDelegates: options.ignoreDelegates !== false,
    };
    const functionStack = [];

    const exitFunction = () => {
      const current = functionStack.pop();
      if (!current) return;
      const body = current.node.body;
      const statementCount = body.type === "BlockStatement" ? body.body.length : 1;
      if (statementCount < (options.minimumStatements ?? 1)) return;
      if (isFunctionExempt(current.node, eligibility)) return;
      if (
        options.ignoreAssertionHelpers &&
        assertionNames.has(functionName(current.node))
      ) return;
      for (const { node, calls } of current.returns) {
        for (const call of calls) reportUnassertedReturn(context, node, call);
      }
    };

    return {
      ":function": (node) => {
        const calls =
          node.body.type === "BlockStatement"
            ? []
            : returnedCalls(node.body).filter(
                (call) => !isAssertionCall(call, assertionNames),
              );
        functionStack.push({
          node,
          returns: calls.length > 0 ? [{ calls, node: node.body }] : [],
        });
      },
      ":function:exit": exitFunction,
      ReturnStatement(node) {
        const current = functionStack.at(-1);
        if (!current) return;
        const calls = returnedCalls(node.argument).filter(
          (call) => !isAssertionCall(call, assertionNames),
        );
        if (calls.length > 0) current.returns.push({ calls, node });
      },
    };
  },
};
