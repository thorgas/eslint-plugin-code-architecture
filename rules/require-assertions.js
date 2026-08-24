const calleeName = (node) => {
  if (node.type === "Identifier") return node.name;
  if (node.type !== "MemberExpression" || node.computed) return undefined;

  const objectName = calleeName(node.object);
  if (!objectName || node.property.type !== "Identifier") return undefined;
  return `${objectName}.${node.property.name}`;
};

const isFunction = (node) =>
  node.type === "ArrowFunctionExpression" ||
  node.type === "FunctionDeclaration" ||
  node.type === "FunctionExpression";

const isNoInputClosure = (node) => {
  if (node.params.length !== 0) return false;
  if (node.type === "FunctionDeclaration") return true;

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
          ignoreJSXCallbacks: { type: "boolean", default: false },
          ignoreNoInputClosures: { type: "boolean", default: false },
          ignoreTrivialConstructors: { type: "boolean", default: false },
          minimum: { type: "integer", minimum: 0, default: 2 },
          minimumStatements: { type: "integer", minimum: 0, default: 1 },
          assertionNames: {
            type: "array",
            minItems: 1,
            items: { type: "string" },
          },
          checkExpressionBodies: { type: "boolean", default: false },
        },
      },
    ],
  },
  create(context) {
    const options = context.options[0] ?? {};
    const minimum = options.minimum ?? 2;
    const minimumStatements = options.minimumStatements ?? 1;
    const directCallbackMaxStatements = options.directCallbackMaxStatements ?? 3;
    const assertionNames = new Set(
      options.assertionNames ?? [
        "assert",
        "assertDefined",
        "nodeAssert",
        "nodeAssert.ok",
      ],
    );
    const functionStack = [];

    const enterFunction = (node) => {
      functionStack.push({ count: 0, node });
    };

    const exitFunction = () => {
      const current = functionStack.pop();
      if (!current) return;

      const { node } = current;
      if (options.ignoreJSXCallbacks && isJSXCallback(node)) return;
      if (options.ignoreNoInputClosures && isNoInputClosure(node)) return;
      if (
        options.ignoreDirectCallbacks &&
        isDirectCallback(node, directCallbackMaxStatements)
      ) {
        return;
      }
      if (options.ignoreTrivialConstructors && isTrivialConstructor(node)) {
        return;
      }
      if (
        node.body.type !== "BlockStatement" &&
        !options.checkExpressionBodies
      ) {
        return;
      }

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

        const name = calleeName(node.callee);
        if (name && assertionNames.has(name)) current.count += 1;
      },
    };
  },
};

export default rule;
