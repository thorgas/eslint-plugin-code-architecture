const unwrapExpression = (node) => {
  let current = node;
  while (
    current &&
    ["TSAsExpression", "TSSatisfiesExpression", "TSNonNullExpression"].includes(
      current.type,
    )
  ) {
    current = current.expression;
  }
  return current;
};

const createdTypeName = (initializer) => {
  const expression = unwrapExpression(initializer);
  if (!expression) return null;

  if (
    expression.type === "CallExpression" &&
    expression.callee.type === "Identifier" &&
    /^create[A-Z]/u.test(expression.callee.name)
  ) {
    return expression.callee.name.slice("create".length);
  }

  if (
    expression.type === "NewExpression" &&
    expression.callee.type === "Identifier"
  ) {
    return expression.callee.name;
  }

  return null;
};

const lowerFirst = (value) =>
  `${value.charAt(0).toLowerCase()}${value.slice(1)}`;

const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow exported global dependency instances created by matching factories",
      url: "https://www.evolu.dev/docs/dependency-injection",
    },
    messages: {
      exportedInstance:
        "Do not export the global {{name}} instance. Export its factory and create the instance in the composition root.",
    },
    schema: [],
  },
  create(context) {
    const instances = new Map();

    const recordDeclaration = (declaration) => {
      if (declaration.id.type !== "Identifier") return;
      const typeName = createdTypeName(declaration.init);
      if (!typeName || declaration.id.name !== lowerFirst(typeName)) return;
      instances.set(declaration.id.name, declaration);
    };

    const report = (name, node) => {
      context.report({
        data: { name },
        messageId: "exportedInstance",
        node,
      });
    };

    return {
      VariableDeclarator: recordDeclaration,
      ExportNamedDeclaration(node) {
        if (node.declaration?.type === "VariableDeclaration") {
          for (const declaration of node.declaration.declarations) {
            if (declaration.id.type !== "Identifier") continue;
            const typeName = createdTypeName(declaration.init);
            if (
              typeName &&
              declaration.id.name === lowerFirst(typeName)
            ) {
              report(declaration.id.name, declaration);
            }
          }
        }

        for (const specifier of node.specifiers) {
          if (
            specifier.local.type === "Identifier" &&
            instances.has(specifier.local.name)
          ) {
            report(specifier.local.name, specifier);
          }
        }
      },
    };
  },
};

export default rule;
