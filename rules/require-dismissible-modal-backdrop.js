import { walkNodes } from "./composition-helpers.js";
import {
  jsxAttributeExpression,
  jsxAttributeName,
  jsxElementName,
} from "./design-system-helpers.js";

const stringArray = {
  type: "array",
  minItems: 1,
  uniqueItems: true,
  items: { type: "string", minLength: 1 },
};

const attributeWithName = (openingElement, names) =>
  openingElement.attributes.find(
    (attribute) =>
      attribute.type === "JSXAttribute" &&
      names.has(jsxAttributeName(attribute)),
  );

const isEnabled = (attribute) => {
  if (!attribute) return false;
  if (!attribute.value) return true;
  const expression = jsxAttributeExpression(attribute);
  return expression?.type === "Literal" && expression.value === true;
};

const hasBackdropDismissal = (node, sourceCode, surface) => {
  const backdropElements = new Set(surface.backdropElements);
  const outsidePressAttributes = new Set(surface.outsidePressAttributes);
  let found = false;
  walkNodes(node, sourceCode, (current) => {
    if (current === node || current.type !== "JSXElement") return;
    if (!backdropElements.has(jsxElementName(current.openingElement.name))) {
      return;
    }
    if (attributeWithName(current.openingElement, outsidePressAttributes)) {
      found = true;
    }
  });
  return found;
};

const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require configured transparent modal surfaces to expose close and backdrop dismissal paths",
    },
    messages: {
      incompleteDismissal:
        "Transparent '{{surface}}' is missing: {{missing}}.",
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        required: ["surfaces"],
        properties: {
          surfaces: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              additionalProperties: false,
              required: [
                "backdropElements",
                "name",
                "outsidePressAttributes",
                "requestCloseAttributes",
                "transparentAttribute",
              ],
              properties: {
                backdropElements: stringArray,
                name: { type: "string", minLength: 1 },
                outsidePressAttributes: stringArray,
                requestCloseAttributes: stringArray,
                transparentAttribute: { type: "string", minLength: 1 },
              },
            },
          },
        },
      },
    ],
  },
  create(context) {
    const surfaces = new Map(
      context.options[0].surfaces.map((surface) => [surface.name, surface]),
    );
    const sourceCode = context.sourceCode;
    return {
      JSXElement(node) {
        const name = jsxElementName(node.openingElement.name);
        const surface = surfaces.get(name);
        if (!surface) return;
        const transparent = attributeWithName(
          node.openingElement,
          new Set([surface.transparentAttribute]),
        );
        if (!isEnabled(transparent)) return;

        const hasRequestClose = attributeWithName(
          node.openingElement,
          new Set(surface.requestCloseAttributes),
        );
        const hasOutsidePress = hasBackdropDismissal(
          node,
          sourceCode,
          surface,
        );
        const missing = [
          !hasRequestClose && "request-close behavior",
          !hasOutsidePress && "outside-press dismissal",
        ].filter(Boolean);
        if (missing.length === 0) return;
        context.report({
          node: node.openingElement.name,
          messageId: "incompleteDismissal",
          data: { missing: missing.join(", "), surface: name },
        });
      },
    };
  },
};

export default rule;
