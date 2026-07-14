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

    return { ":function": inspectFunction };
  },
};

export default rule;
