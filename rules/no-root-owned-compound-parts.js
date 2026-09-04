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
    if (property.type !== "Property" || property.computed) continue;
    const key =
      property.key.type === "Identifier" ? property.key.name : undefined;
    if (!key) continue;
    const componentName =
      property.value.type === "Identifier"
        ? property.value.name
        : functionName(property.value);
    if (!componentName) continue;
    mappings.push({
      componentName,
      namespace: node.id.name,
      part: key,
    });
  }
  return mappings;
};

// `Object.assign(Root, { Item, Trigger })`: the first argument is the
// boundary itself, and the object literal's own keys are the remaining
// public parts. Synthesize the same {componentName, namespace, part} shape
// that `objectNamespaces` produces for plain object-literal compounds.
const objectAssignNamespaces = (node) => {
  if (node.id.type !== "Identifier" || node.init?.type !== "CallExpression") {
    return [];
  }
  const { arguments: args, callee } = node.init;
  if (
    callee?.type !== "MemberExpression" ||
    callee.computed ||
    callee.object.type !== "Identifier" ||
    callee.object.name !== "Object" ||
    callee.property.type !== "Identifier" ||
    callee.property.name !== "assign"
  ) {
    return [];
  }
  const [boundaryArgument, membersArgument] = args;
  if (
    boundaryArgument?.type !== "Identifier" ||
    membersArgument?.type !== "ObjectExpression"
  ) {
    return [];
  }
  const mappings = [
    { componentName: boundaryArgument.name, namespace: node.id.name, part: "Root" },
  ];
  for (const property of membersArgument.properties) {
    if (property.type !== "Property" || property.computed) continue;
    const key =
      property.key.type === "Identifier" ? property.key.name : undefined;
    if (!key) continue;
    const componentName =
      property.value.type === "Identifier"
        ? property.value.name
        : functionName(property.value);
    if (!componentName) continue;
    mappings.push({ componentName, namespace: node.id.name, part: key });
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
  if (
    node.id.type === "Identifier" &&
    node.init?.type === "Identifier"
  ) {
    state.aliases.set(node.id.name, node.init.name);
  }
  for (const mapping of [
    ...objectNamespaces(node),
    ...objectAssignNamespaces(node),
  ]) {
    if (["Provider", "Root"].includes(mapping.part)) {
      const namespaces =
        state.namespaceMappings.get(mapping.componentName) ?? new Set();
      namespaces.add(mapping.namespace);
      state.namespaceMappings.set(mapping.componentName, namespaces);
    }
    const parts = state.partBindings.get(mapping.namespace) ?? new Set();
    parts.add(mapping.componentName);
    state.partBindings.set(mapping.namespace, parts);
  }
};

const resolveAlias = (name, aliases, seen = new Set()) => {
  if (seen.has(name)) return name;
  seen.add(name);
  const next = aliases.get(name);
  return next ? resolveAlias(next, aliases, seen) : name;
};

const reportOwnedParts = (state) => {
  for (const root of state.roots) {
    // When the file defines the compound object for this root (an object
    // literal or `Object.assign(Root, {...})`), its member names are the
    // namespace ground truth: only those explicit namespaces are checked,
    // and direct JSX identifiers must resolve to an actual member binding.
    // Prefix matching (`AccordionShadowOverlay` "belongs" to `Accordion`
    // because it starts with the same string) is only used as a fallback
    // when no compound object exists in the file to consult.
    const explicitNamespaces = state.namespaceMappings.get(root.name);
    const hasCompoundObject = Boolean(
      explicitNamespaces && explicitNamespaces.size > 0,
    );
    const namespaces = new Set(explicitNamespaces ?? []);
    if (!hasCompoundObject) {
      const derived = root.name.replace(/(?:Root|Provider)$/u, "");
      if (derived && derived !== root.name) namespaces.add(derived);
    }
    for (const { candidate, node } of root.candidates) {
      const owned = [...namespaces].some((namespace) => {
        const isDeclaredMember =
          candidate.direct &&
          state.partBindings
            .get(namespace)
            ?.has(resolveAlias(candidate.display, state.aliases));
        if (hasCompoundObject) {
          return (
            (!candidate.direct && candidate.namespace === namespace) ||
            Boolean(isDeclaredMember)
          );
        }
        return (
          ownedByNamespace(candidate, namespace, root.name) ||
          Boolean(isDeclaredMember)
        );
      });
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
      aliases: new Map(),
      context,
      functionStack: [],
      namespaceMappings: new Map(),
      partBindings: new Map(),
      pattern: new RegExp(
        options.componentNamePattern ?? "(?:Root|Provider)$",
        "u",
      ),
      roots: [],
    });
  },
};

export default rule;
