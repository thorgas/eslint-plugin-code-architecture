const calleeName = (node) => {
  if (node.type === "Identifier") return node.name;
  if (node.type === "CallExpression") return calleeName(node.callee);
  if (node.type !== "MemberExpression" || node.computed) return undefined;

  const objectName = calleeName(node.object);
  if (!objectName || node.property.type !== "Identifier") return undefined;
  return `${objectName}.${node.property.name}`;
};

const isJsonParse = (node) => calleeName(node.callee) === "JSON.parse";

const hasValidationAncestor = (node, validationCalls, maximumDepth) => {
  let current = node.parent;
  let depth = 0;

  while (current && depth < maximumDepth) {
    if (
      current.type === "CallExpression" &&
      validationCalls.has(calleeName(current.callee))
    ) {
      return true;
    }

    current = current.parent;
    depth += 1;
  }

  return false;
};

const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require JSON.parse results to be validated by an approved runtime schema decoder",
      url: "https://effect.website/llms-full.txt",
    },
    messages: {
      unvalidatedParse:
        "JSON.parse returns unknown external data. Wrap it in an approved schema decoder before using it.",
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
          maximumAncestorDepth: { type: "integer", minimum: 1, default: 12 },
          validationCalls: {
            type: "array",
            minItems: 1,
            items: { type: "string" },
          },
        },
      },
    ],
  },
  create(context) {
    const options = context.options[0] ?? {};
    const validationCalls = new Set(
      options.validationCalls ?? [
        "Schema.decode",
        "Schema.decodeSync",
        "Schema.decodeUnknown",
        "Schema.decodeUnknownSync",
        "Schema.parseJson",
        "Schema.transform",
      ],
    );
    const maximumDepth = options.maximumAncestorDepth ?? 12;

    return {
      CallExpression(node) {
        if (!isJsonParse(node)) return;
        if (hasValidationAncestor(node, validationCalls, maximumDepth)) return;
        context.report({ node, messageId: "unvalidatedParse" });
      },
    };
  },
};

export default rule;
