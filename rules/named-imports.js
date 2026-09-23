import { minimatch } from "minimatch";

const matchesAny = (value, patterns) =>
  patterns.some((pattern) => minimatch(value, pattern));

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
    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
          allowDefaultImportsFrom: {
            type: "array",
            items: { type: "string" },
          },
          allowNamespaceImportsFrom: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    ],
  },
  create(context) {
    const options = context.options[0] ?? {};
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        for (const specifier of node.specifiers) {
          if (specifier.type === "ImportSpecifier") continue;
          if (
            specifier.type === "ImportDefaultSpecifier" &&
            matchesAny(source, options.allowDefaultImportsFrom ?? [])
          ) continue;
          if (
            specifier.type === "ImportNamespaceSpecifier" &&
            matchesAny(source, options.allowNamespaceImportsFrom ?? [])
          ) continue;
          context.report({ messageId: "useNamedImports", node: specifier });
        }
      },
    };
  },
};

export default rule;
