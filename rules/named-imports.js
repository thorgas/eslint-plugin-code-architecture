const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Require named imports",
      url: "https://www.evolu.dev/docs/conventions",
    },
    messages: {
      useNamedImports:
        "Use named imports instead of a default or namespace import.",
    },
    schema: [],
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        for (const specifier of node.specifiers) {
          if (specifier.type === "ImportSpecifier") continue;
          context.report({ messageId: "useNamedImports", node: specifier });
        }
      },
    };
  },
};

export default rule;
