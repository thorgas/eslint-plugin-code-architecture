const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Limit function inputs to keep interfaces low-dimensional and explicit",
      url: "https://tigerstyle.dev/",
    },
    messages: {
      tooManyParameters:
        "Function accepts {{actual}} positional inputs; the configured limit is {{max}}. Prefer a cohesive options object or split the responsibility.",
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
          max: { type: "integer", minimum: 0, default: 5 },
          countThisParameter: { type: "boolean", default: false },
        },
      },
    ],
  },
  create(context) {
    const options = context.options[0] ?? {};
    const max = options.max ?? 5;

    const inspectFunction = (node) => {
      const actual = node.params.filter(
        (parameter) =>
          options.countThisParameter ||
          parameter.type !== "Identifier" ||
          parameter.name !== "this",
      ).length;
      if (actual <= max) return;

      context.report({
        node,
        messageId: "tooManyParameters",
        data: { actual, max },
      });
    };

    return { ":function": inspectFunction };
  },
};

export default rule;
