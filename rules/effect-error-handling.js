const EFFECT_SOURCE_PATTERN = /^effect(\/.*)?$/u;

const isEffectSource = (source) =>
  typeof source === "string" && EFFECT_SOURCE_PATTERN.test(source);

const findVariable = (scope, name) => {
  let current = scope;

  while (current) {
    const variable = current.set.get(name);
    if (variable) return variable;
    current = current.upper;
  }

  return undefined;
};

// Resolves an Identifier that is bound to an `effect`/`effect/Effect`/`effect/*`
// import to what it stands for: the whole namespace (`import * as Effect` or
// `import Effect from`), or one named member (`import { catchAll }`).
const resolveEffectImport = (identifierNode, scope) => {
  const variable = findVariable(scope, identifierNode.name);
  const def = variable?.defs.find((candidate) => candidate.type === "ImportBinding");
  if (!def) return undefined;

  const source = def.parent?.source?.value;
  if (!isEffectSource(source)) return undefined;

  if (def.node.type === "ImportNamespaceSpecifier") {
    return { kind: "namespace" };
  }
  if (def.node.type === "ImportDefaultSpecifier") {
    return { kind: "namespace" };
  }
  if (def.node.type === "ImportSpecifier") {
    // `import { Effect } from "effect"` binds the module namespace itself.
    if (def.node.imported.name === "Effect") return { kind: "namespace" };
    return { kind: "named", name: def.node.imported.name };
  }

  return undefined;
};

// Like a plain dotted-callee-name reader, but an identifier or member object
// that resolves (via scope) to an Effect import is normalized to its
// canonical `Effect.xxx` form first.
const resolveCalleeName = (node, scope) => {
  if (node.type === "Identifier") {
    const resolved = resolveEffectImport(node, scope);
    if (resolved?.kind === "named") return `Effect.${resolved.name}`;
    return node.name;
  }

  if (node.type !== "MemberExpression" || node.computed) return undefined;

  if (node.object.type === "Identifier") {
    const resolved = resolveEffectImport(node.object, scope);
    if (resolved?.kind === "namespace") {
      return node.property.type === "Identifier"
        ? `Effect.${node.property.name}`
        : undefined;
    }
  }

  const objectName = resolveCalleeName(node.object, scope);
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

const isNullOrUndefinedValue = (node) =>
  (node?.type === "Identifier" && node.name === "undefined") ||
  (node?.type === "Literal" && node.value === null);

const isSilentFallback = (handler, scope) => {
  const expression = returnedExpression(handler);
  if (!expression) return false;
  if (resolveCalleeName(expression, scope) === "Effect.void") return true;
  if (expression.type !== "CallExpression") return false;
  if (resolveCalleeName(expression.callee, scope) !== "Effect.succeed") {
    return false;
  }
  return (
    expression.arguments.length === 0 ||
    isNullOrUndefinedValue(expression.arguments[0])
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
    const sourceCode = context.sourceCode;

    return {
      CallExpression(node) {
        const scope = sourceCode.getScope(node);
        const name = resolveCalleeName(node.callee, scope);

        if (name === "Effect.catchAll") {
          const handler = node.arguments.at(-1);
          if (handler && isSilentFallback(handler, scope)) {
            context.report({ node, messageId: "silentCatchAll" });
          }
          return;
        }

        if (name === "Effect.catchTag") {
          const handler = node.arguments.at(-1);
          if (handler && isSilentFallback(handler, scope)) {
            context.report({ node, messageId: "silentCatchAll" });
          }
          return;
        }

        if (name === "Effect.catchTags") {
          const handlers = node.arguments[0];
          if (handlers?.type === "ObjectExpression") {
            for (const property of handlers.properties) {
              if (
                property.type === "Property" &&
                isSilentFallback(property.value, scope)
              ) {
                context.report({
                  node: property.value,
                  messageId: "silentCatchAll",
                });
              }
            }
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
          resolveCalleeName(error.callee, scope) === "Error"
        ) {
          context.report({ node, messageId: "genericError" });
        }
      },
      MemberExpression(node) {
        if (options.allowIgnore) return;
        const scope = sourceCode.getScope(node);
        if (resolveCalleeName(node, scope) !== "Effect.ignore") return;
        context.report({ node, messageId: "ignoredError" });
      },
    };
  },
};

export default rule;
