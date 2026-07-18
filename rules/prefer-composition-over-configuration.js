import {
  containsJsx,
  functionName,
  jsxNameParts,
  readPropsParameter,
  referencedPropName,
  referencedProps,
  unwrapExpression,
} from "./composition-helpers.js";

const makeConfiguration = (options) => ({
  allowedComponents: new Set(options.allowedComponents ?? []),
  collectionProps: new Set(
    options.collectionProps ?? [
      "data",
      "items",
      "options",
      "rows",
      "sections",
      "steps",
      "tabs",
    ],
  ),
  componentNamePattern: new RegExp(
    options.componentNamePattern ?? "^[A-Z]",
    "u",
  ),
  configurationPropPattern: new RegExp(
    options.configurationPropPattern ??
      "^(?:show|hide|enable|disable|with|without)[A-Z_]",
    "u",
  ),
  minimumConditionalProps: options.minimumConditionalProps ?? 2,
  rendererPropPattern: new RegExp(
    options.rendererPropPattern ?? "^(?:render[A-Z_]|[a-zA-Z]+Component$)",
    "u",
  ),
  variantPropPattern: new RegExp(
    options.variantPropPattern ?? "^(?:layout|mode|variant|view|type)$",
    "u",
  ),
});

const isCompositionBoundary = (name) => {
  if (name.type === "JSXIdentifier") {
    return /(?:Root|Provider)$/u.test(name.name);
  }
  return (
    name.type === "JSXMemberExpression" &&
    ["Provider", "Root"].includes(name.property.name)
  );
};

const isConsumerOwnedAssembly = (node, component) => {
  let current = node.parent;
  while (current && current !== component.node) {
    if (
      current.type === "JSXElement" &&
      isCompositionBoundary(current.openingElement.name)
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
};

const currentComponent = (state) =>
  state.functionStack.findLast(({ component }) => component)?.component;

const enterFunction = (state, node) => {
  const name = functionName(node);
  const eligible =
    name &&
    state.configuration.componentNamePattern.test(name) &&
    !state.configuration.allowedComponents.has(name);
  state.functionStack.push({
    component: eligible
      ? {
          conditionalProps: new Set(),
          aliases: new Map(),
          name,
          node,
          props: readPropsParameter(node.params[0]),
          variantProps: new Set(),
        }
      : undefined,
  });
};

const exitFunction = (state) => {
  const component = state.functionStack.pop()?.component;
  if (!component) return;
  if (
    component.conditionalProps.size >=
    state.configuration.minimumConditionalProps
  ) {
    state.context.report({
      node: component.node,
      messageId: "conditionalProps",
      data: { props: [...component.conditionalProps].sort().join(", ") },
    });
  }
  if (component.variantProps.size > 0) {
    state.context.report({
      node: component.node,
      messageId: "variantProp",
      data: { props: [...component.variantProps].sort().join(", ") },
    });
  }
};

const recordConditionalProps = (state, test, rendered) => {
  const component = currentComponent(state);
  if (
    !component ||
    !containsJsx(rendered, state.sourceCode) ||
    isConsumerOwnedAssembly(rendered, component)
  ) {
    return;
  }
  const names = referencedProps(test, component.props, state.sourceCode);
  for (const name of names) {
    if (state.configuration.configurationPropPattern.test(name)) {
      component.conditionalProps.add(name);
    }
    if (state.configuration.variantPropPattern.test(name)) {
      component.variantProps.add(name);
    }
  }
};

const resolveProp = (node, component, seen = new Set()) => {
  const unwrapped = unwrapExpression(node);
  if (!unwrapped) return undefined;
  const direct = referencedPropName(unwrapped, component.props);
  if (direct) return direct;
  if (unwrapped.type !== "Identifier" || seen.has(unwrapped.name)) {
    return undefined;
  }
  seen.add(unwrapped.name);
  return resolveProp(component.aliases.get(unwrapped.name), component, seen);
};

const reportRenderer = (state, node, component, prop, force = false) => {
  if (
    !prop ||
    (!force && !state.configuration.rendererPropPattern.test(prop)) ||
    isConsumerOwnedAssembly(node, component)
  ) {
    return false;
  }
  state.context.report({
    node,
    messageId: "rendererProp",
    data: { prop },
  });
  return true;
};

const reportRendererProp = (state, node, component) => {
  const calledProp = resolveProp(node.callee, component);
  if (!calledProp || !state.configuration.rendererPropPattern.test(calledProp)) {
    return false;
  }
  return reportRenderer(state, node, component, calledProp);
};

const collectionProp = (node, component, seen = new Set()) => {
  const unwrapped = unwrapExpression(node);
  const direct = referencedPropName(unwrapped, component.props);
  if (direct) return direct;
  if (unwrapped?.type === "Identifier" && !seen.has(unwrapped.name)) {
    seen.add(unwrapped.name);
    return collectionProp(
      component.aliases.get(unwrapped.name),
      component,
      seen,
    );
  }
  if (unwrapped?.type !== "CallExpression") return undefined;
  const callee = unwrapExpression(unwrapped.callee);
  if (callee?.type !== "MemberExpression") return undefined;
  return collectionProp(callee.object, component, seen);
};

const handleCallExpression = (state, node) => {
  const component = currentComponent(state);
  if (!component || reportRendererProp(state, node, component)) return;
  const callee = unwrapExpression(node.callee);
  if (
    callee?.type !== "MemberExpression" ||
    callee.computed ||
    callee.property.type !== "Identifier" ||
    callee.property.name !== "map"
  ) {
    return;
  }
  const prop = collectionProp(callee.object, component);
  if (
    prop &&
    state.configuration.collectionProps.has(prop) &&
    node.arguments.some((argument) =>
      containsJsx(argument, state.sourceCode),
    ) &&
    !isConsumerOwnedAssembly(node, component)
  ) {
    state.context.report({
      node,
      messageId: "collectionProp",
      data: { prop },
    });
  }
};

const handleJsxOpening = (state, node) => {
  const component = currentComponent(state);
  if (!component) return;
  const parts = jsxNameParts(node.name);
  if (parts.length === 0) return;
  const prop = resolveProp(
    { type: "Identifier", name: parts[0] },
    component,
  );
  if (!prop) return;
  reportRenderer(state, node, component, prop, parts.length > 1);
};

const recordAlias = (state, node) => {
  const component = currentComponent(state);
  if (component && node.id.type === "Identifier" && node.init) {
    component.aliases.set(node.id.name, node.init);
  }
};

const makeVisitors = (state) => ({
  ":function": (node) => enterFunction(state, node),
  ":function:exit": () => exitFunction(state),
  CallExpression: (node) => handleCallExpression(state, node),
  ConditionalExpression: (node) =>
    recordConditionalProps(state, node.test, node),
  IfStatement: (node) => recordConditionalProps(state, node.test, node),
  LogicalExpression: (node) =>
    recordConditionalProps(state, node.left, node),
  JSXOpeningElement: (node) => handleJsxOpening(state, node),
  VariableDeclarator: (node) => recordAlias(state, node),
});

const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Prefer consumer-owned JSX composition over prop-driven component assembly",
      url: "https://www.components.build/composition",
    },
    messages: {
      collectionProp:
        "Component maps the '{{prop}}' prop into JSX. Let the consumer map its data and compose the repeated parts as children.",
      conditionalProps:
        "Component conditionally assembles JSX with configuration props {{props}}. Expose composable parts so the consumer controls the structure.",
      rendererProp:
        "Component calls the '{{prop}}' renderer prop. Expose the rendered area as a composable child or compound part.",
      variantProp:
        "Component uses structural variant props {{props}} to select different JSX hierarchies. Expose those hierarchies for consumer composition.",
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
          allowedComponents: { type: "array", items: { type: "string" } },
          collectionProps: { type: "array", items: { type: "string" } },
          componentNamePattern: { type: "string", default: "^[A-Z]" },
          configurationPropPattern: { type: "string" },
          minimumConditionalProps: {
            type: "integer",
            minimum: 1,
            default: 2,
          },
          rendererPropPattern: { type: "string" },
          variantPropPattern: { type: "string" },
        },
      },
    ],
  },
  create(context) {
    return makeVisitors({
      configuration: makeConfiguration(context.options[0] ?? {}),
      context,
      functionStack: [],
      sourceCode: context.sourceCode,
    });
  },
};

export default rule;
