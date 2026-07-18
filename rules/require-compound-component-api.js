import {
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

const variableObject = (node) => {
  if (node.id.type !== "Identifier") return undefined;
  const value = unwrapExpression(node.init);
  if (value?.type !== "ObjectExpression") return undefined;
  return { name: node.id.name, node, value };
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
  if (name) state.componentBindings.add(name);
};

const recordVariable = (state, node) => {
  const candidate = variableObject(node);
  if (candidate) state.candidates.push(candidate);
  if (node.id.type !== "Identifier" || !node.init) return;
  state.initializers.set(node.id.name, node.init);
  if (
    ["ArrowFunctionExpression", "FunctionExpression"].includes(
      unwrapExpression(node.init)?.type,
    )
  ) {
    state.componentBindings.add(node.id.name);
  }
};

const componentBinding = (node, state, seen = new Set()) => {
  const value = unwrapExpression(node);
  if (!value) return false;
  if (
    ["ArrowFunctionExpression", "FunctionExpression", "MemberExpression"]
      .includes(value.type)
  ) {
    return true;
  }
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
  const properties = candidate.value.properties.filter(
    (property) => property.type === "Property",
  );
  const names = properties.map(propertyName);
  const hasBoundary = names.some((name) => state.boundaries.has(name));
  if (!hasBoundary && !state.compoundPattern?.test(candidate.name)) return;
  if (!hasBoundary) {
    state.context.report({ node: candidate.node, messageId: "missingBoundary" });
  }
  if (!state.exportedNames.has(candidate.name)) {
    state.context.report({ node: candidate.node, messageId: "privateApi" });
  }
  const parts = names.filter(
    (name) => name && !state.boundaries.has(name),
  );
  if (parts.length < state.minimumParts) {
    state.context.report({
      node: candidate.node,
      messageId: "insufficientParts",
      data: { minimum: String(state.minimumParts) },
    });
  }
  reportInvalidMembers(state, properties);
};

const reportInvalidMembers = (state, properties) => {
  const bindings = new Map();
  for (const property of properties) {
    const name = propertyName(property);
    if (!name) continue;
    if (!componentBinding(property.value, state)) {
      state.context.report({
        node: property,
        messageId: "invalidMember",
        data: { member: name },
      });
      continue;
    }
    const binding = canonicalBinding(property.value, state);
    if (!binding) continue;
    const previous = bindings.get(binding);
    if (previous) {
      state.context.report({
        node: property,
        messageId: "duplicateBinding",
        data: { first: previous, member: name },
      });
    } else {
      bindings.set(binding, name);
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
      wrapperNames: new Set(options.wrapperNames ?? ["forwardRef", "memo"]),
    };
    return {
      ":function": (node) => recordBinding(state, node),
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
