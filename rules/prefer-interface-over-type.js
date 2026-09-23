const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Prefer interfaces for object shapes and reserve type aliases for features interfaces cannot express",
      url: "https://www.evolu.dev/docs/conventions",
    },
    messages: {
      useInterface:
        "Use an interface for the object shape '{{name}}'; reserve type aliases for unions, mapped types, tuples, and type utilities.",
    },
    schema: [],
  },
  create(context) {
    return {
      TSTypeAliasDeclaration(node) {
        if (node.typeAnnotation.type !== "TSTypeLiteral") return;
        context.report({
          data: { name: node.id.name },
          messageId: "useInterface",
          node,
        });
      },
    };
  },
};

export default rule;
