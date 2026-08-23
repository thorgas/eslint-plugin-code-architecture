import {
  jsxElementName,
  matchesPatterns,
  relativeFilename,
} from "./design-system-helpers.js";

const stringArray = {
  type: "array",
  minItems: 1,
  uniqueItems: true,
  items: { type: "string", minLength: 1 },
};

const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require configured consumers to use design-system components",
    },
    messages: {
      preferReplacement:
        "Use the design-system replacement '{{replacement}}' instead of '{{primitive}}'.",
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        required: ["consumers", "replacements"],
        properties: {
          allowInside: stringArray,
          consumers: stringArray,
          replacements: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["replacement"],
              anyOf: [
                { required: ["from", "imported"] },
                { required: ["elements"] },
              ],
              properties: {
                elements: stringArray,
                from: { type: "string", minLength: 1 },
                imported: stringArray,
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
    const filename = relativeFilename(context);
    if (
      !matchesPatterns(filename, options.consumers) ||
      matchesPatterns(filename, options.allowInside)
    ) {
      return {};
    }

    const importReplacements = new Map();
    const elementReplacements = new Map();
    for (const replacement of options.replacements) {
      for (const imported of replacement.imported ?? []) {
        importReplacements.set(
          `${replacement.from}\0${imported}`,
          replacement.replacement,
        );
      }
      for (const element of replacement.elements ?? []) {
        elementReplacements.set(element, replacement.replacement);
      }
    }

    const report = (node, primitive, replacement) =>
      context.report({
        node,
        messageId: "preferReplacement",
        data: { primitive, replacement },
      });

    return {
      ImportDeclaration(node) {
        if (typeof node.source.value !== "string") return;
        for (const specifier of node.specifiers) {
          let imported;
          if (specifier.type === "ImportDefaultSpecifier") imported = "default";
          if (specifier.type === "ImportSpecifier") {
            imported =
              specifier.imported.type === "Identifier"
                ? specifier.imported.name
                : String(specifier.imported.value);
          }
          if (!imported) continue;
          const replacement = importReplacements.get(
            `${node.source.value}\0${imported}`,
          );
          if (replacement) report(specifier, imported, replacement);
        }
      },
      JSXOpeningElement(node) {
        const primitive = jsxElementName(node.name);
        const replacement = elementReplacements.get(primitive);
        if (replacement) report(node.name, primitive, replacement);
      },
    };
  },
};

export default rule;
