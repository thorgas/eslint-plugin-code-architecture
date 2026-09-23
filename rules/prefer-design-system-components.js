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

const buildReplacementMaps = (replacements) => {
  const importReplacements = new Map();
  const elementReplacements = new Map();
  for (const replacement of replacements) {
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
  return { elementReplacements, importReplacements };
};

const specifierImportedName = (specifier) => {
  if (specifier.type === "ImportDefaultSpecifier") return "default";
  if (specifier.type !== "ImportSpecifier") return undefined;
  return specifier.imported.type === "Identifier"
    ? specifier.imported.name
    : String(specifier.imported.value);
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

    const { elementReplacements, importReplacements } = buildReplacementMaps(
      options.replacements,
    );
    const namespaceImports = new Map();

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
          if (specifier.type === "ImportNamespaceSpecifier") {
            namespaceImports.set(specifier.local.name, node.source.value);
            continue;
          }
          const imported = specifierImportedName(specifier);
          if (!imported) continue;
          const replacement = importReplacements.get(
            `${node.source.value}\0${imported}`,
          );
          if (replacement) report(specifier, imported, replacement);
        }
      },
      JSXOpeningElement(node) {
        const primitive = jsxElementName(node.name);
        const directReplacement = elementReplacements.get(primitive);
        if (directReplacement) {
          report(node.name, primitive, directReplacement);
          return;
        }

        if (node.name.type !== "JSXMemberExpression") return;
        const parts = primitive.split(".");
        if (parts.length !== 2) return;
        const [namespace, member] = parts;
        if (!namespaceImports.has(namespace)) return;

        const namespaceReplacement = elementReplacements.get(member);
        if (namespaceReplacement) {
          report(node.name, member, namespaceReplacement);
        }
      },
    };
  },
};

export default rule;
