const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Prefer arrow functions while permitting TypeScript overload declarations",
      url: "https://www.evolu.dev/docs/conventions",
    },
    messages: {
      useArrow:
        "Use an arrow function instead of the function keyword. TypeScript overload sets are the documented exception.",
    },
    schema: [],
  },
  create(context) {
    const declarations = [];
    const overloadedNames = new Set();

    return {
      FunctionDeclaration(node) {
        declarations.push(node);
      },
      TSDeclareFunction(node) {
        if (node.id) overloadedNames.add(node.id.name);
      },
      "Program:exit"() {
        for (const declaration of declarations) {
          if (declaration.id && overloadedNames.has(declaration.id.name)) {
            continue;
          }
          context.report({ messageId: "useArrow", node: declaration });
        }
      },
      FunctionExpression(node) {
        context.report({ messageId: "useArrow", node });
      },
    };
  },
};

export default rule;
