import {
  assertionNameSet,
  isAssertionCall,
} from "./assertion-helpers.js";

const isFunction = (node) =>
  node.type === "ArrowFunctionExpression" ||
  node.type === "FunctionDeclaration" ||
  node.type === "FunctionExpression";

const functionName = (node) => {
  if (
    node.parent?.type === "VariableDeclarator" &&
    node.parent.init === node &&
    node.parent.id.type === "Identifier"
  ) {
    return node.parent.id.name;
  }
  if (node.id?.type === "Identifier") return node.id.name;
  return undefined;
};

const isReactHook = (node) => /^use[A-Z0-9]/.test(functionName(node) ?? "");

// A zero-parameter `function foo() { return {...}; }` factory is the same shape
// as the `const foo = () => ({...})` form this option already exempts, so the
// declaration syntax alone should not decide it. It is limited to a lone return
// on purpose: a zero-parameter function that *does* something - `function
// initialize() { startServices(); connectObservers(); }` - still owes the
// postcondition that its work landed, and stays strict.
const isReturnOnlyFactory = (node) =>
  node.body.type === "BlockStatement" &&
  node.body.body.length === 1 &&
  node.body.body[0].type === "ReturnStatement";

const isNoInputClosure = (node) => {
  if (node.params.length !== 0) return false;
  if (node.type === "FunctionDeclaration") return isReturnOnlyFactory(node);

  return node.parent.type === "VariableDeclarator" && node.parent.init === node;
};

const isCallArgument = (call, node) =>
  Boolean(call) &&
  (call.type === "CallExpression" || call.type === "NewExpression") &&
  call.arguments.includes(node);

// One level of object nesting: a function is still a "direct" callback when
// it is the value of a Property whose ObjectExpression is itself a direct
// argument of the call — e.g. `stream(request, { onDone: () => {...} })`.
// A variable-bound or exported object (handler maps, XState action arrays)
// does not qualify: the ObjectExpression must be the call's own argument.
const isDirectCallbackPosition = (node) => {
  const parent = node.parent;
  if (isCallArgument(parent, node)) return true;

  if (parent.type !== "Property" || parent.value !== node) return false;
  const objectExpression = parent.parent;
  if (!objectExpression || objectExpression.type !== "ObjectExpression") {
    return false;
  }
  return isCallArgument(objectExpression.parent, objectExpression);
};

const isDirectCallback = (node, maxStatements) => {
  if (node.type === "FunctionDeclaration") return false;
  if (!isDirectCallbackPosition(node)) return false;

  if (node.body.type !== "BlockStatement") return true;
  return node.body.body.length <= maxStatements;
};

const isSuperCallStatement = (statement) =>
  statement.type === "ExpressionStatement" &&
  statement.expression.type === "CallExpression" &&
  statement.expression.callee.type === "Super";

const isThisFieldAssignmentStatement = (statement) =>
  statement.type === "ExpressionStatement" &&
  statement.expression.type === "AssignmentExpression" &&
  statement.expression.operator === "=" &&
  statement.expression.left.type === "MemberExpression" &&
  statement.expression.left.object.type === "ThisExpression";

// A constructor whose body only forwards to `super(...)` and/or assigns
// fields straight from `this` has no invariant left to assert — the values
// come straight from the caller. Any branching, loop, or other call means
// there is something to validate, so it stays strict.
const isTrivialConstructor = (node) => {
  const parent = node.parent;
  if (parent.type !== "MethodDefinition" || parent.kind !== "constructor") {
    return false;
  }
  if (node.body.type !== "BlockStatement") return false;

  return node.body.body.every(
    (statement) =>
      isSuperCallStatement(statement) ||
      isThisFieldAssignmentStatement(statement),
  );
};

const isJSXCallback = (node) => {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (isFunction(parent)) return false;
    if (parent.type === "JSXAttribute") return true;
  }
  return false;
};

// A guarded throw - `if (!isValid(x)) throw new Error(...)` - fails loudly on
// the negative path, which is exactly what an assertion does. Walking stops
// at the nearest enclosing function (same shape as isJSXCallback) so a throw
// belongs to the function it is written in, never an outer one. A throw
// reached through a CatchClause is error propagation, not a precondition
// check, and never counts even if an `if` also happens to guard it.
const isGuardedThrow = (node) => {
  let sawGuard = false;
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (isFunction(parent)) break;
    if (parent.type === "CatchClause") return false;
    if (parent.type === "IfStatement" || parent.type === "ConditionalExpression") {
      sawGuard = true;
    }
  }
  return sawGuard;
};

/**
 * The function literals a wrapper hands to the single call that forms its body:
 * `(args) => withAdmin(async (db) => {…})`, or the same with leading statements
 * and a `return`. Exactly one call deep, and only when that call is the
 * function's whole remaining body - a function that computes and then happens
 * to call something is not a wrapper and owns its own assertions.
 */
const wrappedCallbacksOf = (node) => {
  let call = null;
  if (node.body.type !== "BlockStatement") {
    call = node.body;
  } else {
    const last = node.body.body.at(-1);
    if (!last) return [];
    if (last.type === "ReturnStatement") call = last.argument;
    else if (last.type === "ExpressionStatement") call = last.expression;
  }
  if (!call) return [];
  if (call.type === "AwaitExpression") call = call.argument;
  if (!call || call.type !== "CallExpression") return [];
  return call.arguments.filter((argument) => isFunction(argument));
};

const isJSXValue = (node) => {
  if (!node) return false;
  if (node.type === "JSXElement" || node.type === "JSXFragment") return true;
  if (node.type === "ConditionalExpression") {
    return isJSXValue(node.consequent) || isJSXValue(node.alternate);
  }
  if (node.type === "LogicalExpression") {
    return isJSXValue(node.left) || isJSXValue(node.right);
  }
  return false;
};

// Walks the function's own statements, never descending into a nested
// function, so a component that happens to define a callback is judged by
// what IT returns rather than by what the callback returns.
const returnsJSX = (node) => {
  if (node.body.type !== "BlockStatement") return isJSXValue(node.body);

  const pending = [...node.body.body];
  while (pending.length > 0) {
    const statement = pending.pop();
    if (!statement || typeof statement.type !== "string") continue;
    if (isFunction(statement)) continue;
    if (statement.type === "ReturnStatement") {
      if (isJSXValue(statement.argument)) return true;
      continue;
    }
    for (const [key, value] of Object.entries(statement)) {
      // AST nodes carry a `parent` back-pointer; following it walks in circles.
      if (key === "parent") continue;
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === "object" && !isFunction(item)) {
            pending.push(item);
          }
        }
      } else if (value && typeof value === "object" && "type" in value) {
        if (!isFunction(value)) pending.push(value);
      }
    }
  }
  return false;
};

/** The configured shapes that carry no invariant of their own. */
const isExempt = (node, options) => {
  if (options.ignoreJSXCallbacks && isJSXCallback(node)) return true;
  if (options.ignoreNoInputClosures && isNoInputClosure(node)) return true;
  if (options.ignoreReactHooks && isReactHook(node)) return true;
  if (
    options.ignoreDirectCallbacks &&
    isDirectCallback(node, options.directCallbackMaxStatements ?? 3)
  ) {
    return true;
  }
  if (options.ignoreTrivialConstructors && isTrivialConstructor(node)) {
    return true;
  }
  if (options.ignoreJSXComponents && returnsJSX(node)) return true;
  return node.body.type !== "BlockStatement" && !options.checkExpressionBodies;
};

const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require a minimum assertion density in functions, following TigerStyle",
      url: "https://github.com/tigerbeetle/tigerbeetle/blob/main/docs/TIGER_STYLE.md",
    },
    messages: {
      insufficientAssertions:
        "Function has {{actual}} assertion(s); TigerStyle requires at least {{minimum}}. Assert inputs, outputs, positive space, and negative space.",
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
          ignoreDirectCallbacks: { type: "boolean", default: false },
          directCallbackMaxStatements: {
            type: "integer",
            minimum: 0,
            default: 3,
          },
          creditWrapperClosures: { type: "boolean", default: false },
          ignoreJSXCallbacks: { type: "boolean", default: false },
          ignoreJSXComponents: { type: "boolean", default: false },
          ignoreNoInputClosures: { type: "boolean", default: false },
          ignoreReactHooks: { type: "boolean", default: false },
          ignoreTrivialConstructors: { type: "boolean", default: false },
          minimum: { type: "integer", minimum: 0, default: 2 },
          minimumStatements: { type: "integer", minimum: 0, default: 1 },
          assertionNames: {
            type: "array",
            minItems: 1,
            items: { type: "string" },
          },
          checkExpressionBodies: { type: "boolean", default: false },
          countGuardedThrows: { type: "boolean", default: false },
        },
      },
    ],
  },
  create(context) {
    const options = context.options[0] ?? {};
    const minimum = options.minimum ?? 2;
    const minimumStatements = options.minimumStatements ?? 1;
    const assertionNames = assertionNameSet(options.assertionNames);
    const functionStack = [];

    const enterFunction = (node) => {
      functionStack.push({ count: 0, node });
    };


    const exitFunction = () => {
      const current = functionStack.pop();
      if (!current) return;

      const { node } = current;
      // A wrapper's own body is one call, so the assertions belong in the
      // callback it hands that call - `(args) => withAdmin(async (db) => {…})`
      // asserts inside the closure, where the work is. Counting per scope
      // would leave the wrapper reporting zero forever no matter how well the
      // closure asserts, so the closure's assertions count for it too.
      if (options.creditWrapperClosures) {
        const enclosing = functionStack.at(-1);
        if (enclosing && wrappedCallbacksOf(enclosing.node).includes(node)) {
          enclosing.count += current.count;
        }
      }
      if (isExempt(node, options)) return;

      const statementCount =
        node.body.type === "BlockStatement" ? node.body.body.length : 1;
      if (statementCount < minimumStatements || current.count >= minimum)
        return;

      context.report({
        node,
        messageId: "insufficientAssertions",
        data: { actual: current.count, minimum },
      });
    };

    return {
      ":function": enterFunction,
      ":function:exit": exitFunction,
      CallExpression(node) {
        const current = functionStack.at(-1);
        if (!current) return;

        if (isAssertionCall(node, assertionNames)) current.count += 1;
      },
      ThrowStatement(node) {
        if (!options.countGuardedThrows) return;

        const current = functionStack.at(-1);
        if (!current) return;
        if (isGuardedThrow(node)) current.count += 1;
      },
    };
  },
};

export default rule;
