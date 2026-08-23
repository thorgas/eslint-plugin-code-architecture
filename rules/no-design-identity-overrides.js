import { walkNodes } from "./composition-helpers.js";
import {
  jsxAttributeExpression,
  jsxAttributeName,
  jsxElementName,
  matchesPatterns,
  propertyName,
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
        "Prevent consumers from overriding configured design identity properties",
    },
    messages: {
      identityOverride:
        "Do not override design identity property '{{property}}' on '{{component}}'. Use a supported component variant instead.",
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        required: ["components"],
        properties: {
          allowedFiles: stringArray,
          components: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["identityProperties", "names"],
              properties: {
                identityProperties: stringArray,
                names: stringArray,
                styleAttributes: stringArray,
              },
            },
          },
        },
      },
    ],
  },
  create(context) {
    const options = context.options[0];
    if (matchesPatterns(relativeFilename(context), options.allowedFiles)) {
      return {};
    }
    const components = new Map();
    for (const component of options.components) {
      for (const name of component.names) components.set(name, component);
    }
    const sourceCode = context.sourceCode;
    const report = (node, component, property) =>
      context.report({
        node,
        messageId: "identityOverride",
        data: { component, property },
      });

    return {
      JSXOpeningElement(node) {
        const name = jsxElementName(node.name);
        const component = components.get(name);
        if (!component) return;
        const identityProperties = new Set(component.identityProperties);
        const styleAttributes = new Set(component.styleAttributes ?? ["style"]);

        for (const attribute of node.attributes) {
          if (attribute.type !== "JSXAttribute") continue;
          const attributeName = jsxAttributeName(attribute);
          if (!attributeName) continue;
          if (identityProperties.has(attributeName)) {
            report(attribute, name, attributeName);
          }
          if (!styleAttributes.has(attributeName)) continue;
          const expression = jsxAttributeExpression(attribute);
          if (!expression) continue;
          walkNodes(expression, sourceCode, (current) => {
            if (current.type !== "Property") return;
            const property = propertyName(current);
            if (property && identityProperties.has(property)) {
              report(current.key, name, property);
            }
          });
        }
      },
    };
  },
};

export default rule;
