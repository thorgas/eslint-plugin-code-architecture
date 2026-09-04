import {
  containsJsx,
  functionName,
  unwrapExpression,
} from "./composition-helpers.js";

const propertyName = (property) => {
  if (!property.computed && property.key.type === "Identifier") {
    return property.key.name;
  }
  if (
    property.key.type === "Literal" &&
    typeof property.key.value === "string"
  ) {
    return property.key.value;
  }
  return undefined;
};

// Members extracted from a plain object literal, e.g.
// `{ Root: RootComponent, Item }`.
const objectExpressionMembers = (value) =>
  value.properties
    .filter((property) => property.type === "Property")
    .map((property) => ({
      name: propertyName(property),
      reportNode: property,
      valueNode: property.value,
    }))
    .filter((member) => member.name);

// Members extracted from `Object.assign(Root, { Item, Trigger })`: the first
// argument is the boundary itself (usually invoked directly as the compound
// component), and the object literal's own keys are the remaining public
// parts.
const objectAssignCall = (node, state) => {
  const callee = node.callee;
  if (
    callee?.type !== "MemberExpression" ||
    callee.computed ||
    callee.object.type !== "Identifier" ||
    callee.object.name !== "Object" ||
    callee.property.type !== "Identifier" ||
    callee.property.name !== "assign"
  ) {
    return undefined;
  }
  const [boundaryArgument, membersArgument] = node.arguments;
  if (
    !boundaryArgument ||
    boundaryArgument.type !== "Identifier" ||
    membersArgument?.type !== "ObjectExpression"
  ) {
    return undefined;
  }
  const boundaryName = state.boundaries.has(boundaryArgument.name)
    ? boundaryArgument.name
    : [...state.boundaries][0];
  return [
    { name: boundaryName, reportNode: boundaryArgument, valueNode: boundaryArgument },
    ...objectExpressionMembers(membersArgument),
  ];
};

const variableCandidate = (node, state) => {
  if (node.id.type !== "Identifier") return undefined;
  const value = unwrapExpression(node.init);
  if (!value) return undefined;
  if (value.type === "ObjectExpression") {
    return { members: objectExpressionMembers(value), name: node.id.name, node };
  }
  if (value.type === "CallExpression") {
    const members = objectAssignCall(value, state);
    if (members) return { members, name: node.id.name, node };
  }
  return undefined;
};

const exportDefaultCandidate = (node, state) => {
  const value = unwrapExpression(node.declaration);
  if (value?.type !== "CallExpression") return undefined;
  const members = objectAssignCall(value, state);
  if (!members) return undefined;
  return { exported: true, members, name: "", node };
};

const recordExport = (state, node) => {
  if (node.declaration?.type === "VariableDeclaration") {
    for (const declaration of node.declaration.declarations) {
      if (declaration.id.type === "Identifier") {
        state.exportedNames.add(declaration.id.name);
      }
    }
  }
  for (const specifier of node.specifiers ?? []) {
    if (specifier.local.type === "Identifier") {
      state.exportedNames.add(specifier.local.name);
    }
  }
};

const recordBinding = (state, node) => {
  const name = functionName(node);
  if (name && containsJsx(node, state.sourceCode)) {
    state.componentBindings.add(name);
  }
};

const recordVariable = (state, node) => {
  const candidate = variableCandidate(node, state);
  if (candidate) state.candidates.push(candidate);
  if (node.id.type !== "Identifier" || !node.init) return;
  state.initializers.set(node.id.name, node.init);
  const unwrapped = unwrapExpression(node.init);
  if (
    ["ArrowFunctionExpression", "FunctionExpression"].includes(
      unwrapped?.type,
    ) &&
    containsJsx(unwrapped, state.sourceCode)
  ) {
    state.componentBindings.add(node.id.name);
  }
};

// A compound member is only a valid component binding when it either
// references a function that renders JSX, or is a call to a configured
// wrapper (forwardRef/memo/...) around such a function. Member expressions
// (namespace re-exports from another module) are trusted, since their
// definition is not resolvable from this file.
const componentBinding = (node, state, seen = new Set()) => {
  const value = unwrapExpression(node);
  if (!value) return false;
  if (["ArrowFunctionExpression", "FunctionExpression"].includes(value.type)) {
    return containsJsx(value, state.sourceCode);
  }
  if (value.type === "MemberExpression") return true;
  if (value.type === "CallExpression") {
    const callee = unwrapExpression(value.callee);
    const wrapper =
      callee?.type === "Identifier"
        ? callee.name
        : callee?.type === "MemberExpression" &&
            callee.property.type === "Identifier"
          ? callee.property.name
          : undefined;
    return (
      Boolean(wrapper && state.wrapperNames.has(wrapper)) &&
      componentBinding(value.arguments[0], state, seen)
    );
  }
  if (value.type !== "Identifier") return false;
  if (state.componentBindings.has(value.name)) return true;
  if (seen.has(value.name)) return false;
  seen.add(value.name);
  return componentBinding(state.initializers.get(value.name), state, seen);
};

const canonicalBinding = (node, state, seen = new Set()) => {
  const value = unwrapExpression(node);
  if (value?.type !== "Identifier" || seen.has(value.name)) {
    return value?.type === "Identifier" ? value.name : undefined;
  }
  seen.add(value.name);
  const initial = state.initializers.get(value.name);
  return initial
    ? canonicalBinding(initial, state, seen) ?? value.name
    : value.name;
};

const reportCandidate = (state, candidate) => {
  if (state.ignoredNamePattern.test(candidate.name)) return;
  const boundaryMembers = candidate.members.filter(
    (member) => state.boundaries.has(member.name),
  );
  const hasBoundary = boundaryMembers.some((member) =>
    componentBinding(member.valueNode, state),
  );
  if (!hasBoundary && !state.compoundPattern?.test(candidate.name)) return;
  if (!hasBoundary) {
    state.context.report({ node: candidate.node, messageId: "missingBoundary" });
  }
  if (!candidate.exported && !state.exportedNames.has(candidate.name)) {
    state.context.report({ node: candidate.node, messageId: "privateApi" });
  }
  const parts = candidate.members.filter(
    (member) => member.name && !state.boundaries.has(member.name),
  );
  if (parts.length < state.minimumParts) {
    state.context.report({
      node: candidate.node,
      messageId: "insufficientParts",
      data: { minimum: String(state.minimumParts) },
    });
  }
  reportInvalidMembers(state, candidate.members);
};

const reportInvalidMembers = (state, members) => {
  const bindings = new Map();
  for (const member of members) {
    if (!member.name) continue;
    if (!componentBinding(member.valueNode, state)) {
      state.context.report({
        node: member.reportNode,
        messageId: "invalidMember",
        data: { member: member.name },
      });
      continue;
    }
    const binding = canonicalBinding(member.valueNode, state);
    if (!binding) continue;
    const previous = bindings.get(binding);
    if (previous) {
      state.context.report({
        node: member.reportNode,
        messageId: "duplicateBinding",
        data: { first: previous, member: member.name },
      });
    } else {
      bindings.set(binding, member.name);
    }
  }
};

const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require public compound API objects to expose a boundary and component parts",
      url: "https://github.com/francostan/composition-pattern-starter/blob/main/docs/Pattern.md",
    },
    messages: {
      duplicateBinding:
        "Compound members '{{first}}' and '{{member}}' reference the same component binding.",
      insufficientParts:
        "Compound API must expose at least {{minimum}} public parts in addition to its boundary.",
      invalidMember:
        "Compound member '{{member}}' must reference a component binding.",
      missingBoundary:
        "Configured compound API must expose a Provider or Root boundary member.",
      privateApi:
        "Compound API object must be exported so consumers can access its parts.",
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
          boundaryMembers: { type: "array", items: { type: "string" } },
          compoundNamePattern: { type: "string" },
          ignoredNamePattern: { type: "string", default: "Context$" },
          minimumParts: { type: "integer", minimum: 1, default: 2 },
          wrapperNames: { type: "array", items: { type: "string" } },
        },
      },
    ],
  },
  create(context) {
    const options = context.options[0] ?? {};
    const state = {
      boundaries: new Set(options.boundaryMembers ?? ["Provider", "Root"]),
      candidates: [],
      componentBindings: new Set(),
      compoundPattern: options.compoundNamePattern
        ? new RegExp(options.compoundNamePattern, "u")
        : undefined,
      context,
      exportedNames: new Set(),
      initializers: new Map(),
      ignoredNamePattern: new RegExp(
        options.ignoredNamePattern ?? "Context$",
        "u",
      ),
      minimumParts: options.minimumParts ?? 2,
      sourceCode: context.sourceCode,
      wrapperNames: new Set(options.wrapperNames ?? ["forwardRef", "memo"]),
    };
    return {
      ":function": (node) => recordBinding(state, node),
      ExportDefaultDeclaration(node) {
        const candidate = exportDefaultCandidate(node, state);
        if (candidate) state.candidates.push(candidate);
      },
      ExportNamedDeclaration: (node) => recordExport(state, node),
      ImportDeclaration(node) {
        for (const specifier of node.specifiers) {
          state.componentBindings.add(specifier.local.name);
        }
      },
      VariableDeclarator: (node) => recordVariable(state, node),
      "Program:exit"() {
        for (const candidate of state.candidates) {
          reportCandidate(state, candidate);
        }
      },
    };
  },
};

export default rule;
