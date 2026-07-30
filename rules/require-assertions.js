import {
  assertionNameSet,
  isAssertionCall,
} from "./assertion-helpers.js";

const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require a minimum assertion density in functions, following TigerStyle",
      url: "https://github.com/tigerbeetle/tigerbeetle/blob/main/docs/TIGER_STYLE.md",
    },
    messages: {
      insufficientAssertions:
        "Function has {{actual}} assertion(s); TigerStyle requires at least {{minimum}}. Assert inputs, outputs, positive space, and negative space.",
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
          minimum: { type: "integer", minimum: 0, default: 2 },
          minimumStatements: { type: "integer", minimum: 0, default: 1 },
          assertionNames: {
            type: "array",
            minItems: 1,
            items: { type: "string" },
          },
          checkExpressionBodies: { type: "boolean", default: false },
        },
      },
    ],
  },
  create(context) {
    const options = context.options[0] ?? {};
    const minimum = options.minimum ?? 2;
    const minimumStatements = options.minimumStatements ?? 1;
    const assertionNames = assertionNameSet(options.assertionNames);
    const functionStack = [];

    const enterFunction = (node) => {
      functionStack.push({ count: 0, node });
    };

    const exitFunction = () => {
      const current = functionStack.pop();
      if (!current) return;

      const { node } = current;
      if (
        node.body.type !== "BlockStatement" &&
        !options.checkExpressionBodies
      ) {
        return;
      }

      const statementCount =
        node.body.type === "BlockStatement" ? node.body.body.length : 1;
      if (statementCount < minimumStatements || current.count >= minimum)
        return;

      context.report({
        node,
        messageId: "insufficientAssertions",
        data: { actual: current.count, minimum },
      });
    };

    return {
      ":function": enterFunction,
      ":function:exit": exitFunction,
      CallExpression(node) {
        const current = functionStack.at(-1);
        if (!current) return;

        if (isAssertionCall(node, assertionNames)) current.count += 1;
      },
    };
  },
};

export default rule;
