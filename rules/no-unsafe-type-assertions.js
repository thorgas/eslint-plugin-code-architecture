const isConstAssertion = (node) =>
  node.typeAnnotation.type === "TSTypeReference" &&
  node.typeAnnotation.typeName.type === "Identifier" &&
  node.typeAnnotation.typeName.name === "const";

const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow TypeScript assertions and non-null assertions that bypass runtime validation",
      url: "https://effect.website/llms-full.txt",
    },
    messages: {
      nonNullAssertion:
        "Do not use a non-null assertion. Check the value explicitly or model absence in the type.",
      typeAssertion:
        "Do not assert a TypeScript type. Decode unknown data, narrow it with a guard, or use satisfies.",
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
          allowConst: { type: "boolean", default: true },
          checkNonNull: { type: "boolean", default: true },
        },
      },
    ],
  },
  create(context) {
    const options = context.options[0] ?? {};

    return {
      TSAsExpression(node) {
        if (options.allowConst !== false && isConstAssertion(node)) return;
        context.report({ node, messageId: "typeAssertion" });
      },
      TSNonNullExpression(node) {
        if (options.checkNonNull === false) return;
        context.report({ node, messageId: "nonNullAssertion" });
      },
      TSTypeAssertion(node) {
        context.report({ node, messageId: "typeAssertion" });
      },
    };
  },
};

export default rule;
