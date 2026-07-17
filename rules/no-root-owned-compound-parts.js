import { functionName } from "./composition-helpers.js";

const jsxName = (node) => {
  if (node.type === "JSXIdentifier") {
    return { display: node.name, direct: true, part: node.name };
  }
  if (node.type !== "JSXMemberExpression") return undefined;
  const parts = [];
  let current = node;
  while (current.type === "JSXMemberExpression") {
    parts.unshift(current.property.name);
    current = current.object;
  }
  if (current.type !== "JSXIdentifier") return undefined;
  parts.unshift(current.name);
  return {
    display: parts.join("."),
    direct: false,
    namespace: parts[0],
    part: parts.at(-1),
  };
};

const objectNamespaces = (node) => {
  if (
    node.id.type !== "Identifier" ||
    node.init?.type !== "ObjectExpression"
  ) {
    return [];
  }
  const mappings = [];
  for (const property of node.init.properties) {
    if (
      property.type !== "Property" ||
      property.computed ||
      property.key.type !== "Identifier" ||
      !["Provider", "Root"].includes(property.key.name)
    ) {
      continue;
    }
    const componentName =
      property.value.type === "Identifier"
        ? property.value.name
        : functionName(property.value);
    if (!componentName) continue;
    mappings.push({
      componentName,
      namespace: node.id.name,
    });
  }
  return mappings;
};

const ownedByNamespace = (candidate, namespace, componentName) => {
  if (!candidate.direct) return candidate.namespace === namespace;
  if (candidate.display === componentName) return false;
  const suffix = candidate.display.slice(namespace.length);
  return (
    candidate.display.startsWith(namespace) &&
    suffix.length > 0 &&
    /^[A-Z]/u.test(suffix)
  );
};

const currentRoot = (state) => {
  for (let index = state.functionStack.length - 1; index >= 0; index -= 1) {
    const frame = state.functionStack[index];
    if (frame.root) return frame.root;
    if (frame.blocksParent) return undefined;
  }
  return undefined;
};

const enterFunction = (state, node) => {
  const name = functionName(node);
  const root =
    name && state.pattern.test(name) ? { candidates: [], name, node } : undefined;
  if (root) state.roots.push(root);
  state.functionStack.push({
    blocksParent: Boolean(name && /^[A-Z]/u.test(name) && !root),
    root,
  });
};

const recordNamespaceMappings = (state, node) => {
  for (const mapping of objectNamespaces(node)) {
    const namespaces =
      state.namespaceMappings.get(mapping.componentName) ?? new Set();
    namespaces.add(mapping.namespace);
    state.namespaceMappings.set(mapping.componentName, namespaces);
  }
};

const reportOwnedParts = (state) => {
  for (const root of state.roots) {
    const namespaces = new Set(
      state.namespaceMappings.get(root.name) ?? [],
    );
    const derived = root.name.replace(/(?:Root|Provider)$/u, "");
    if (derived && derived !== root.name) namespaces.add(derived);
    for (const { candidate, node } of root.candidates) {
      const owned = [...namespaces].some((namespace) =>
        ownedByNamespace(candidate, namespace, root.name),
      );
      if (
        owned &&
        !state.allowedParts.has(candidate.part) &&
        !state.allowedParts.has(candidate.display)
      ) {
        state.context.report({
          node,
          messageId: "ownedPart",
          data: { part: candidate.display, root: root.name },
        });
      }
    }
  }
};

const makeVisitors = (state) => ({
  ":function": (node) => enterFunction(state, node),
  ":function:exit": () => state.functionStack.pop(),
  JSXOpeningElement(node) {
    const root = currentRoot(state);
    const candidate = jsxName(node.name);
    if (root && candidate) root.candidates.push({ candidate, node });
  },
  VariableDeclarator: (node) => recordNamespaceMappings(state, node),
  "Program:exit": () => reportOwnedParts(state),
});

const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Prevent composition roots from assembling their own compound parts",
      url: "https://www.components.build/composition",
    },
    messages: {
      ownedPart:
        "{{root}} renders its own compound part {{part}}. Move that part to the consumer-owned child hierarchy.",
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
          allowedParts: { type: "array", items: { type: "string" } },
          componentNamePattern: {
            type: "string",
            default: "(?:Root|Provider)$",
          },
        },
      },
    ],
  },
  create(context) {
    const options = context.options[0] ?? {};
    return makeVisitors({
      allowedParts: new Set(options.allowedParts ?? []),
      context,
      functionStack: [],
      namespaceMappings: new Map(),
      pattern: new RegExp(
        options.componentNamePattern ?? "(?:Root|Provider)$",
        "u",
      ),
      roots: [],
    });
  },
};

export default rule;
