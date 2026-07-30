const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require unique exported members instead of exported object namespaces",
      url: "https://www.evolu.dev/docs/conventions",
    },
    messages: {
      exportMembers:
        "Export unique, descriptive members individually instead of exporting the '{{name}}' object namespace.",
    },
    schema: [],
  },
  create(context) {
    const namespaces = new Set();

    const report = (name, node) => {
      context.report({
        data: { name },
        messageId: "exportMembers",
        node,
      });
    };

    return {
      VariableDeclarator(node) {
        if (
          node.id.type === "Identifier" &&
          node.init?.type === "ObjectExpression"
        ) {
          namespaces.add(node.id.name);
        }
      },
      ExportNamedDeclaration(node) {
        if (node.declaration?.type === "VariableDeclaration") {
          for (const declaration of node.declaration.declarations) {
            if (
              declaration.id.type === "Identifier" &&
              declaration.init?.type === "ObjectExpression"
            ) {
              report(declaration.id.name, declaration);
            }
          }
        }

        for (const specifier of node.specifiers) {
          if (
            specifier.local.type === "Identifier" &&
            namespaces.has(specifier.local.name)
          ) {
            report(specifier.local.name, specifier);
          }
        }
      },
    };
  },
};

export default rule;
