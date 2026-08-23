import {
  jsxAttributeExpression,
  jsxAttributeName,
  matchesPatterns,
  propertyName,
  relativeFilename,
  staticLiteral,
} from "./design-system-helpers.js";

const stringArray = {
  type: "array",
  minItems: 1,
  uniqueItems: true,
  items: { type: "string", minLength: 1 },
};
const designValue = { anyOf: [{ type: "string" }, { type: "number" }] };

const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Reject static literals in configured design-related properties",
    },
    messages: {
      rawDesignProperty:
        "Raw literal '{{value}}' is not allowed for '{{property}}'. Use {{replacement}} instead.",
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        required: ["properties"],
        properties: {
          allowedFiles: stringArray,
          properties: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["names"],
              properties: {
                allowedValues: {
                  type: "array",
                  uniqueItems: true,
                  items: designValue,
                },
                names: stringArray,
                replacement: { type: "string", minLength: 1 },
              },
            },
          },
        },
      },
    ],
  },
  create(context) {
    const options = context.options[0];
    if (
      matchesPatterns(relativeFilename(context), options.allowedFiles)
    ) {
      return {};
    }

    const configuredProperties = new Map();
    for (const group of options.properties) {
      for (const name of group.names) configuredProperties.set(name, group);
    }

    const inspect = (property, expression) => {
      const config = configuredProperties.get(property);
      if (!config) return;
      const literal = staticLiteral(expression);
      if (!literal || config.allowedValues?.includes(literal.value)) return;
      context.report({
        node: literal.node,
        messageId: "rawDesignProperty",
        data: {
          property,
          replacement: config.replacement ?? "an approved design token",
          value: String(literal.value),
        },
      });
    };

    return {
      JSXAttribute(node) {
        const property = jsxAttributeName(node);
        if (!property) return;
        inspect(
          property,
          node.value?.type === "Literal"
            ? node.value
            : jsxAttributeExpression(node),
        );
      },
      Property(node) {
        if (node.parent.type === "ObjectPattern") return;
        const property = propertyName(node);
        if (property) inspect(property, node.value);
      },
    };
  },
};

export default rule;
