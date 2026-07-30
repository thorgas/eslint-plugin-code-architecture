import { dependencyParameter } from "./dependency-helpers.js";

const nearestTrackedFunction = (functionStack) => {
  for (let index = functionStack.length - 1; index >= 0; index -= 1) {
    const tracked = functionStack[index];
    if (tracked) return tracked;
  }
  return null;
};

const markAllUsed = (functionStack, node) => {
  const tracked = nearestTrackedFunction(functionStack);
  if (!tracked) return;
  if (node?.type !== "Identifier" || node.name !== "deps") return;
  for (const reference of tracked.references) {
    tracked.used.add(reference.property);
  }
};

const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow required dependency wrapper types that a function does not use",
      url: "https://www.evolu.dev/docs/dependency-injection",
    },
    messages: {
      unusedDependency:
        "Remove unused {{dependency}} from deps; this function never reads deps.{{property}}.",
    },
    schema: [],
  },
  create(context) {
    const functionStack = [];

    return {
      ":function"(node) {
        const dependency = dependencyParameter(node);
        const tracked =
          dependency?.parameter.type === "Identifier" &&
          dependency.parameter.name === "deps"
            ? {
                references: dependency.references.filter(
                  ({ optional }) => !optional,
                ),
                used: new Set(),
              }
            : null;
        functionStack.push(tracked);
      },
      ":function:exit"() {
        const tracked = functionStack.pop();
        if (!tracked) return;

        for (const reference of tracked.references) {
          if (tracked.used.has(reference.property)) continue;
          context.report({
            data: {
              dependency: reference.name,
              property: reference.property,
            },
            messageId: "unusedDependency",
            node: reference.node,
          });
        }
      },
      MemberExpression(node) {
        if (
          node.object.type !== "Identifier" ||
          node.object.name !== "deps" ||
          node.computed ||
          node.property.type !== "Identifier"
        ) {
          return;
        }

        nearestTrackedFunction(functionStack)?.used.add(node.property.name);
      },
      CallExpression(node) {
        for (const argument of node.arguments) {
          markAllUsed(functionStack, argument);
        }
      },
      NewExpression(node) {
        for (const argument of node.arguments) {
          markAllUsed(functionStack, argument);
        }
      },
      ReturnStatement(node) {
        markAllUsed(functionStack, node.argument);
      },
      SpreadElement(node) {
        markAllUsed(functionStack, node.argument);
      },
    };
  },
};

export default rule;
