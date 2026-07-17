import {
  containsJsx,
  functionName,
  readPropsParameter,
  referencedPropName,
  referencedProps,
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
          name,
          node,
          props: readPropsParameter(node.params[0]),
        }
      : undefined,
  });
};

const exitFunction = (state) => {
  const component = state.functionStack.pop()?.component;
  if (
    !component ||
    component.conditionalProps.size <
      state.configuration.minimumConditionalProps
  ) {
    return;
  }
  state.context.report({
    node: component.node,
    messageId: "conditionalProps",
    data: { props: [...component.conditionalProps].sort().join(", ") },
  });
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
  }
};

const reportRendererProp = (state, node, component) => {
  const calledProp = referencedPropName(node.callee, component.props);
  if (!calledProp || !state.configuration.rendererPropPattern.test(calledProp)) {
    return false;
  }
  state.context.report({
    node,
    messageId: "rendererProp",
    data: { prop: calledProp },
  });
  return true;
};

const handleCallExpression = (state, node) => {
  const component = currentComponent(state);
  if (!component || reportRendererProp(state, node, component)) return;
  if (
    node.callee.type !== "MemberExpression" ||
    node.callee.computed ||
    node.callee.property.type !== "Identifier" ||
    node.callee.property.name !== "map"
  ) {
    return;
  }
  const collectionProp = referencedPropName(
    node.callee.object,
    component.props,
  );
  if (
    collectionProp &&
    state.configuration.collectionProps.has(collectionProp) &&
    node.arguments.some((argument) =>
      containsJsx(argument, state.sourceCode),
    ) &&
    !isConsumerOwnedAssembly(node, component)
  ) {
    state.context.report({
      node,
      messageId: "collectionProp",
      data: { prop: collectionProp },
    });
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
