const calleeName = (node) => {
  if (node.type === "Identifier") return node.name;
  if (node.type !== "MemberExpression" || node.computed) return undefined;

  const objectName = calleeName(node.object);
  if (!objectName || node.property.type !== "Identifier") return undefined;
  return `${objectName}.${node.property.name}`;
};

const returnedExpression = (node) => {
  if (
    node.type !== "ArrowFunctionExpression" &&
    node.type !== "FunctionExpression"
  ) {
    return undefined;
  }
  if (node.body.type !== "BlockStatement") return node.body;

  const returnStatement = node.body.body.find(
    (statement) => statement.type === "ReturnStatement",
  );
  return returnStatement?.argument ?? undefined;
};

const isUndefinedValue = (node) =>
  node?.type === "Identifier" && node.name === "undefined";

const isSilentFallback = (handler) => {
  const expression = returnedExpression(handler);
  if (!expression) return false;
  if (calleeName(expression) === "Effect.void") return true;
  if (expression.type !== "CallExpression") return false;
  if (calleeName(expression.callee) !== "Effect.succeed") return false;
  return (
    expression.arguments.length === 0 ||
    isUndefinedValue(expression.arguments[0])
  );
};

const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Prevent silent Effect failures, defect erasure, and untyped generic errors",
      url: "https://github.com/mikearnaldi/accountability/blob/main/specs/completed/error-tracker.md",
    },
    messages: {
      catchAllCause:
        "Do not catch all causes in business logic; it also intercepts defects. Handle typed errors with catchTag/catchTags or propagate the cause.",
      genericError:
        "Do not fail an Effect with Error. Define a Schema.TaggedError domain error.",
      ignoredError:
        "Do not use Effect.ignore. Propagate, transform, or explicitly recover from the typed error.",
      manualErrorTap:
        "Do not manually log with Effect.tapError in business logic. Preserve the error channel for the top-level telemetry handler.",
      silentCatchAll:
        "This catchAll handler erases the failure with Effect.void or undefined. Propagate, transform, or provide a documented domain fallback.",
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
          allowCatchAllCause: { type: "boolean", default: false },
          allowIgnore: { type: "boolean", default: false },
          allowTapError: { type: "boolean", default: false },
          allowGenericError: { type: "boolean", default: false },
        },
      },
    ],
  },
  create(context) {
    const options = context.options[0] ?? {};

    return {
      CallExpression(node) {
        const name = calleeName(node.callee);

        if (name === "Effect.catchAll") {
          const handler = node.arguments.at(-1);
          if (handler && isSilentFallback(handler)) {
            context.report({ node, messageId: "silentCatchAll" });
          }
          return;
        }

        if (name === "Effect.catchAllCause" && !options.allowCatchAllCause) {
          context.report({ node, messageId: "catchAllCause" });
          return;
        }

        if (name === "Effect.tapError" && !options.allowTapError) {
          context.report({ node, messageId: "manualErrorTap" });
          return;
        }

        if (name !== "Effect.fail" || options.allowGenericError) return;
        const error = node.arguments[0];
        if (
          error?.type === "NewExpression" &&
          calleeName(error.callee) === "Error"
        ) {
          context.report({ node, messageId: "genericError" });
        }
      },
      MemberExpression(node) {
        if (options.allowIgnore || calleeName(node) !== "Effect.ignore") return;
        context.report({ node, messageId: "ignoredError" });
      },
    };
  },
};

export default rule;
