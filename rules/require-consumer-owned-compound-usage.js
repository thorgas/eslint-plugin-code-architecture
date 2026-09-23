import {
  jsxNameParts,
  walkNodes,
} from "./composition-helpers.js";

const sameNamespacePart = (element, namespace, boundaries) => {
  const parts = jsxNameParts(element.openingElement.name);
  return (
    parts.length >= 2 &&
    parts[0] === namespace &&
    !boundaries.has(parts.at(-1))
  );
};

const containsSameNamespacePart = (
  node,
  namespace,
  boundaries,
  sourceCode,
) => {
  let found = false;
  for (const child of node.children) {
    walkNodes(child, sourceCode, (candidate) => {
      if (
        candidate.type === "JSXElement" &&
        sameNamespacePart(candidate, namespace, boundaries)
      ) {
        found = true;
      }
    });
  }
  return found;
};

const inspectBoundary = (state, node) => {
  const parts = jsxNameParts(node.openingElement.name);
  if (
    parts.length < 2 ||
    !state.boundaries.has(parts.at(-1))
  ) {
    return;
  }
  const namespace = parts[0];
  if (
    !state.compoundNamespaces.has(namespace) ||
    state.ignoredNamespacePattern.test(namespace)
  ) {
    return;
  }
  const headless = state.headlessCompounds.has(namespace);
  if (node.openingElement.selfClosing) {
    if (!headless) {
      state.context.report({
        node: node.openingElement,
        messageId: "selfClosingBoundary",
        data: { boundary: parts.join(".") },
      });
    }
    return;
  }
  if (
    !headless &&
    !containsSameNamespacePart(
      node,
      namespace,
      state.boundaries,
      state.sourceCode,
    )
  ) {
    state.context.report({
      node: node.openingElement,
      messageId: "missingParts",
      data: { boundary: parts.join("."), namespace },
    });
  }
};

const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require compound boundaries to contain consumer-selected public parts",
      url: "https://github.com/francostan/composition-pattern-starter/blob/main/docs/Pattern.md",
    },
    messages: {
      missingParts:
        "{{boundary}} must contain at least one consumer-selected {{namespace}} part.",
      selfClosingBoundary:
        "{{boundary}} is self-closing. Open the boundary and compose its public parts as children.",
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
          boundaryMembers: { type: "array", items: { type: "string" } },
          headlessCompounds: { type: "array", items: { type: "string" } },
          ignoredNamespacePattern: { type: "string", default: "Context$" },
        },
      },
    ],
  },
  create(context) {
    const options = context.options[0] ?? {};
    const state = {
      boundaries: new Set(options.boundaryMembers ?? ["Provider", "Root"]),
      compoundNamespaces: new Set(),
      context,
      headlessCompounds: new Set(options.headlessCompounds ?? []),
      ignoredNamespacePattern: new RegExp(
        options.ignoredNamespacePattern ?? "Context$",
        "u",
      ),
      elements: [],
      sourceCode: context.sourceCode,
    };
    return {
      ImportDeclaration(node) {
        for (const specifier of node.specifiers) {
          if (/^[A-Z]/u.test(specifier.local.name)) {
            state.compoundNamespaces.add(specifier.local.name);
          }
        }
      },
      JSXElement: (node) => state.elements.push(node),
      VariableDeclarator(node) {
        if (node.id.type !== "Identifier") return;
        if (
          node.init?.type === "ObjectExpression" &&
          node.init.properties.some(
            (property) =>
              property.type === "Property" &&
              property.key.type === "Identifier" &&
              state.boundaries.has(property.key.name),
          )
        ) {
          state.compoundNamespaces.add(node.id.name);
          return;
        }
        // `Object.assign(Root, { Item, Trigger })`: the first argument is
        // the boundary itself, so the assigned local name is a compound
        // namespace regardless of the object literal's own keys.
        const callee = node.init?.type === "CallExpression" && node.init.callee;
        if (
          callee &&
          callee.type === "MemberExpression" &&
          !callee.computed &&
          callee.object.type === "Identifier" &&
          callee.object.name === "Object" &&
          callee.property.type === "Identifier" &&
          callee.property.name === "assign" &&
          node.init.arguments[0]?.type === "Identifier" &&
          node.init.arguments[1]?.type === "ObjectExpression"
        ) {
          state.compoundNamespaces.add(node.id.name);
        }
      },
      "Program:exit"() {
        for (const element of state.elements) inspectBoundary(state, element);
      },
    };
  },
};

export default rule;
