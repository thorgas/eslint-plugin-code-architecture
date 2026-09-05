import { minimatch } from "minimatch";

import {
  functionName,
  isFunctionExempt,
} from "./require-assertions.js";
import {
  assertionNameSet,
  findVariable,
  isAssertionCall,
} from "./assertion-helpers.js";

const controlFlowTypes = new Set([
  "CatchClause",
  "ConditionalExpression",
  "DoWhileStatement",
  "ForInStatement",
  "ForOfStatement",
  "ForStatement",
  "IfStatement",
  "LogicalExpression",
  "SwitchCase",
  "SwitchStatement",
  "TryStatement",
  "WhileStatement",
]);

const isAncestor = (ancestor, node) => {
  let current = node;
  while (current) {
    if (current === ancestor) return true;
    current = current.parent;
  }
  return false;
};

const statementChild = (container, node) => {
  let current = node;
  while (current.parent && current.parent !== container) {
    current = current.parent;
  }
  return current.parent === container ? current : null;
};

const assertionDominatesReturn = (call, returnNode) => {
  let container = call.parent;
  while (container && container.type !== "BlockStatement") {
    container = container.parent;
  }
  if (!container || !isAncestor(container, returnNode)) return false;
  const assertionStatement = statementChild(container, call);
  const returnStatement = statementChild(container, returnNode);
  if (!assertionStatement || !returnStatement) return false;
  if (
    container.body.indexOf(assertionStatement) >=
    container.body.indexOf(returnStatement)
  ) {
    return false;
  }
  let current = call.parent;
  while (current && current !== container) {
    if (controlFlowTypes.has(current.type) && !isAncestor(current, returnNode)) {
      return false;
    }
    current = current.parent;
  }
  return true;
};

const assertionReferencesVariable = (call, variable) => {
  const condition = call.arguments[0];
  if (!condition || condition.type === "SpreadElement") return false;
  return variable.references.some(({ identifier }) =>
    isAncestor(condition, identifier),
  );
};

const variableWrittenBetween = (variable, start, end) =>
  variable.references.some(
    (reference) =>
      reference.isWrite() &&
      reference.identifier.range[0] > start.range[0] &&
      reference.identifier.range[0] < end.range[0],
  );

const displayCalleeName = (node) => {
  if (node.type === "Identifier") return node.name;
  if (node.type !== "MemberExpression" || node.computed) return undefined;

  const objectName = displayCalleeName(node.object);
  if (!objectName || node.property.type !== "Identifier") return undefined;
  return `${objectName}.${node.property.name}`;
};

const calleePatterns = (node) => {
  const name = displayCalleeName(node);
  if (node.type !== "MemberExpression" || node.computed) {
    return name ? [name] : [];
  }
  const property = node.property.type === "Identifier" ? node.property.name : undefined;
  return [...new Set([name, property && `*.${property}`].filter(Boolean))];
};

const callIsAllowed = (call, patterns) =>
  calleePatterns(call.callee).some((name) =>
    patterns.some((pattern) => minimatch(name, pattern)),
  );

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

const returnedLocalCall = (node, sourceCode) => {
  if (node?.type !== "Identifier") return null;
  const variable = findVariable(sourceCode, node);
  const definition = variable?.defs.find(
    ({ node: definitionNode }) =>
      definitionNode.type === "VariableDeclarator" && definitionNode.init,
  )?.node;
  if (!definition?.init) return null;
  const calls = returnedCalls(definition.init);
  return calls.length > 0 ? { call: calls[0], definition, variable } : null;
};

const localReturnIsAsserted = (current, node, local) =>
  current.assertions.some(
    (call) =>
      call.range[0] > local.definition.range[0] &&
      assertionDominatesReturn(call, node) &&
      assertionReferencesVariable(call, local.variable) &&
      !variableWrittenBetween(local.variable, call, node),
  );

const reportReturns = (context, current, allowedReturnCalls) => {
  for (const { node, calls } of current.returns) {
    for (const call of calls) {
      if (!callIsAllowed(call, allowedReturnCalls)) {
        reportUnassertedReturn(context, node, call);
      }
    }
  }
  for (const { node, local } of current.localReturns) {
    if (
      !callIsAllowed(local.call, allowedReturnCalls) &&
      !localReturnIsAsserted(current, node, local)
    ) {
      reportUnassertedReturn(context, node, local.call);
    }
  }
};

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
          allowedReturnCalls: {
            type: "array",
            items: { type: "string", minLength: 1 },
          },
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
    const allowedReturnCalls = options.allowedReturnCalls ?? [];
    const eligibility = {
      ...options,
      checkExpressionBodies: true,
      ignoreDelegates: options.ignoreDelegates !== false,
    };
    const sourceCode = context.sourceCode;
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
      reportReturns(context, current, allowedReturnCalls);
    };

    return {
      ":function": (node) => {
        const calls =
          node.body.type === "BlockStatement"
            ? []
            : returnedCalls(node.body).filter(
                (call) => !isAssertionCall(call, assertionNames, sourceCode),
              );
        functionStack.push({
          assertions: [],
          localReturns: [],
          node,
          returns: calls.length > 0 ? [{ calls, node: node.body }] : [],
        });
      },
      ":function:exit": exitFunction,
      ReturnStatement(node) {
        const current = functionStack.at(-1);
        if (!current) return;
        const calls = returnedCalls(node.argument).filter(
          (call) => !isAssertionCall(call, assertionNames, sourceCode),
        );
        if (calls.length > 0) current.returns.push({ calls, node });
        const local = returnedLocalCall(node.argument, sourceCode);
        if (local) current.localReturns.push({ local, node });
      },
      CallExpression(node) {
        const current = functionStack.at(-1);
        if (
          current &&
          isAssertionCall(node, assertionNames, sourceCode)
        ) {
          current.assertions.push(node);
        }
      },
    };
  },
};
