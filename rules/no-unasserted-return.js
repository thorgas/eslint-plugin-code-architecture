const calleeName = (node) => {
  if (node.type === "Identifier") return node.name;
  if (node.type !== "MemberExpression" || node.computed) return undefined;

  const objectName = calleeName(node.object);
  if (!objectName || node.property.type !== "Identifier") return undefined;
  return `${objectName}.${node.property.name}`;
};

// `return f(...)` and `return await f(...)` are the shapes that smuggle an
// unexamined value out of a function. A returned identifier, literal, or
// object built in place has already been through the function's own hands.
const callExpressionOf = (node) => {
  if (!node) return undefined;
  if (node.type === "CallExpression") return node;
  if (
    node.type === "AwaitExpression" &&
    node.argument.type === "CallExpression"
  ) {
    return node.argument;
  }
  return undefined;
};

const returnedCall = (statement) => callExpressionOf(statement.argument);

const reportUnassertedReturn = (context, node, call) =>
  context.report({
    node,
    messageId: "unassertedReturn",
    data: { callee: calleeName(call.callee) ?? "the call" },
  });

/**
 * Requires a function that returns a call's result directly to either hold an
 * assertion somewhere in its body, or bind the result first so it can be
 * asserted: `const result = f(...); assert(...); return result;`.
 */
export default {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow returning a call's result directly from a function that asserts nothing; assign, assert, then return",
      url: "https://github.com/tigerbeetle/tigerbeetle/blob/main/docs/TIGER_STYLE.md",
    },
    messages: {
      unassertedReturn:
        "This function returns {{callee}}(...) without asserting anything. Assign the result to a local, assert its shape, then return it.",
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
          ignoreDelegates: { type: "boolean", default: true },
        },
      },
    ],
  },
  create(context) {
    const options = context.options[0] ?? {};
    const assertionNames = new Set(
      options.assertionNames ?? [
        "assert",
        "assertDefined",
        "nodeAssert",
        "nodeAssert.ok",
      ],
    );
    const ignoreDelegates = options.ignoreDelegates ?? true;
    const functionStack = [];

    const exitFunction = () => {
      const current = functionStack.pop();
      if (!current) return;
      if (current.assertions > 0) return;

      const body = current.node.body;
      if (body.type !== "BlockStatement") {
        const call = callExpressionOf(body);
        if (!call) return;
        const callee = calleeName(call.callee);
        if (ignoreDelegates && callee) return;
        reportUnassertedReturn(context, body, call);
        return;
      }

      // A delegate's whole body is the one return: it computes nothing of its
      // own, so the named callee carries the invariants and the wrapper has
      // nothing true to assert. `{ return f(x); }` and `=> f(x)` both qualify.
      const delegateCall =
        body.body.length === 1 ? returnedCall(body.body[0]) : undefined;
      const isDelegate = delegateCall && calleeName(delegateCall.callee);
      if (ignoreDelegates && isDelegate) return;

      for (const statement of current.returns) {
        const call = returnedCall(statement);
        reportUnassertedReturn(context, statement, call);
      }
    };

    return {
      ":function": (node) => {
        functionStack.push({ assertions: 0, node, returns: [] });
      },
      ":function:exit": exitFunction,
      CallExpression(node) {
        if (!assertionNames.has(calleeName(node.callee))) return;
        const current = functionStack.at(-1);
        if (current) current.assertions += 1;
      },
      ReturnStatement(node) {
        const current = functionStack.at(-1);
        if (!current) return;
        const call = returnedCall(node);
        if (!call) return;
        // Returning an assertion helper's own result is not a smuggled value.
        if (assertionNames.has(calleeName(call.callee))) return;
        current.returns.push(node);
      },
    };
  },
};
