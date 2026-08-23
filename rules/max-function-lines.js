const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Enforce TigerStyle's hard physical line limit for functions",
      url: "https://github.com/tigerbeetle/tigerbeetle/blob/main/docs/TIGER_STYLE.md",
    },
    messages: {
      tooManyLines:
        "Function spans {{actual}} lines; the configured hard limit is {{max}}. Keep control flow in the parent and extract focused leaf logic.",
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
          ignoreJSX: { type: "boolean", default: false },
          max: { type: "integer", minimum: 1, default: 70 },
          skipBlankLines: { type: "boolean", default: false },
        },
      },
    ],
  },
  create(context) {
    const options = context.options[0] ?? {};
    const max = options.max ?? 70;
    const sourceCode = context.sourceCode;
    const functionStack = [];
    const jsxFunctions = new WeakSet();

    const inspectFunction = (node) => {
      const firstLine = node.loc.start.line;
      const lastLine = node.loc.end.line;
      let actual = lastLine - firstLine + 1;

      if (options.skipBlankLines) {
        const lines = sourceCode.lines.slice(firstLine - 1, lastLine);
        actual = lines.filter((line) => line.trim().length > 0).length;
      }

      if (actual <= max) return;

      context.report({
        node,
        messageId: "tooManyLines",
        data: { actual, max },
      });
    };

    const markJsxFunction = () => {
      const currentFunction = functionStack.at(-1);
      if (currentFunction) jsxFunctions.add(currentFunction);
    };

    return {
      ":function"(node) {
        functionStack.push(node);
      },
      ":function:exit"(node) {
        functionStack.pop();
        if (options.ignoreJSX && jsxFunctions.has(node)) return;
        inspectFunction(node);
      },
      JSXElement: markJsxFunction,
      JSXFragment: markJsxFunction,
    };
  },
};

export default rule;
