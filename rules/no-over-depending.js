import { dependencyParameter } from "./dependency-helpers.js";

const markDestructuredPropertiesUsed = (pattern, used) => {
  let restFound = false;
  for (const property of pattern.properties) {
    if (property.type === "RestElement") {
      restFound = true;
      continue;
    }
    if (!property.computed && property.key.type === "Identifier") {
      used.add(property.key.name);
    } else {
      restFound = true;
    }
  }
  return restFound;
};

const collectUsedProperties = (variable) => {
  const used = new Set();
  let allUsed = false;

  for (const ref of variable.references) {
    const identifier = ref.identifier;
    const parent = identifier.parent;

    if (
      parent?.type === "MemberExpression" &&
      parent.object === identifier &&
      !parent.computed &&
      parent.property.type === "Identifier"
    ) {
      used.add(parent.property.name);
      continue;
    }

    if (
      parent?.type === "VariableDeclarator" &&
      parent.init === identifier &&
      parent.id.type === "ObjectPattern"
    ) {
      if (markDestructuredPropertiesUsed(parent.id, used)) allUsed = true;
      continue;
    }

    // Any other read of `deps` itself (call argument, return value, spread,
    // alias assignment, template literal, forwarding to another function,
    // etc.) means the whole deps object escapes, so treat every declared
    // dependency as used.
    allUsed = true;
  }

  return { allUsed, used };
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
    const sourceCode = context.sourceCode;

    return {
      ":function"(node) {
        const dependency = dependencyParameter(node);
        if (
          !dependency ||
          dependency.parameter.type !== "Identifier" ||
          dependency.parameter.name !== "deps"
        ) {
          return;
        }

        const references = dependency.references.filter(
          ({ optional }) => !optional,
        );
        if (references.length === 0) return;

        // Find the scope variable for the `deps` parameter declared by this
        // function, so nested functions with their own `deps` parameter
        // don't cross-contaminate.
        const declaredVariables = sourceCode.getDeclaredVariables(node);
        const variable = declaredVariables.find((v) => v.name === "deps");
        if (!variable) return;

        const { allUsed, used } = collectUsedProperties(variable);
        if (allUsed) {
          for (const reference of references) used.add(reference.property);
        }

        for (const reference of references) {
          if (used.has(reference.property)) continue;
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
    };
  },
};

export default rule;
