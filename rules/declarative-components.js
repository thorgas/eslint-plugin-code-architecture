import { containsJsx } from "./composition-helpers.js";

const functionName = (node) => {
  if (node.id?.type === "Identifier") return node.id.name;
  if (
    node.parent?.type === "VariableDeclarator" &&
    node.parent.id.type === "Identifier"
  ) {
    return node.parent.id.name;
  }
  return undefined;
};

// A nested function only counts as inline behavior worth reporting when it is
// declared as its own statement or bound to a local variable (a function
// declaration, or `const x = () => ...`). Functions passed directly as JSX
// attribute values, call arguments (including `.map()` callbacks and
// `useCallback(() => ...)`), or other expression positions are not
// independently named or reused, so they are not reported.
const isBoundFunctionDeclaration = (node) =>
  node.type === "FunctionDeclaration" ||
  (node.parent?.type === "VariableDeclarator" &&
    node.parent.id.type === "Identifier" &&
    node.parent.init === node);

const calleeLeafName = (node) => {
  if (node.type === "Identifier") return node.name;
  if (
    node.type === "MemberExpression" &&
    !node.computed &&
    node.property.type === "Identifier"
  ) {
    return node.property.name;
  }
  return undefined;
};

const currentComponent = (state) =>
  state.functionStack.findLast(({ component }) => component)?.component;

// A function is a component only when it actually returns JSX. A
// capitalized name alone is not enough: it must both match the configured
// naming convention and contain JSX in its body.
const isComponent = (state, node, name) =>
  Boolean(name) &&
  state.componentNamePattern.test(name) &&
  containsJsx(node, state.sourceCode);

const enterFunction = (state, node) => {
  const parentComponent = currentComponent(state);
  const name = functionName(node);
  const component = isComponent(state, node, name)
    ? { actorHookCount: 0, node }
    : undefined;

  if (
    parentComponent &&
    state.forbidInlineFunctions &&
    isBoundFunctionDeclaration(node)
  ) {
    state.context.report({ node, messageId: "inlineFunction" });
  }
  state.functionStack.push({ component });
};

const exitFunction = (state) => {
  const current = state.functionStack.pop();
  const component = current?.component;
  if (!component || component.actorHookCount <= state.maximumActorHooks) {
    return;
  }

  state.context.report({
    node: component.node,
    messageId: "multipleActors",
    data: {
      actual: component.actorHookCount,
      maximum: state.maximumActorHooks,
    },
  });
};

const visitCallExpression = (state, node) => {
  const component = currentComponent(state);
  if (!component) return;

  const hook = calleeLeafName(node.callee);
  if (!hook) return;
  if (state.forbiddenHooks.has(hook)) {
    state.context.report({ node, messageId: "forbiddenHook", data: { hook } });
  }
  if (state.actorHooks.has(hook)) component.actorHookCount += 1;
};

const visitTryStatement = (state, node) => {
  if (!state.forbidTryStatements || !currentComponent(state)) return;
  state.context.report({ node, messageId: "errorHandling" });
};

const makeConfiguration = (options) => ({
  actorHooks: new Set(
    options.actorHooks ?? ["useActor", "useActorRef", "useMachine"],
  ),
  componentNamePattern: new RegExp(
    options.componentNamePattern ?? "^[A-Z]",
    "u",
  ),
  forbiddenHooks: new Set(
    options.forbiddenHooks ?? [
      "useEffect",
      "useLayoutEffect",
      "useReducer",
      "useState",
    ],
  ),
  maximumActorHooks: options.maximumActorHooks ?? 1,
});

const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Keep UI components declarative by moving state, effects, and business logic into an orchestrator",
      url: "https://www.sandromaglione.com/newsletter/components-take-care-of-themselves",
    },
    messages: {
      errorHandling:
        "Do not handle errors inside a component. Send an event and model recovery in the component orchestrator.",
      forbiddenHook:
        "Do not call {{hook}} inside a component. Components should read data and send events only.",
      inlineFunction:
        "Do not define inline functions inside a component. Move behavior into the orchestrator and send an event.",
      multipleActors:
        "Component uses {{actual}} actor hooks; the configured limit is {{maximum}}. Compose machines with actors instead.",
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
          actorHooks: { type: "array", items: { type: "string" } },
          componentNamePattern: { type: "string", default: "^[A-Z]" },
          forbidInlineFunctions: { type: "boolean", default: true },
          forbidTryStatements: { type: "boolean", default: true },
          forbiddenHooks: { type: "array", items: { type: "string" } },
          maximumActorHooks: { type: "integer", minimum: 0, default: 1 },
        },
      },
    ],
  },
  create(context) {
    const options = context.options[0] ?? {};
    const state = {
      ...makeConfiguration(options),
      context,
      forbidInlineFunctions: options.forbidInlineFunctions !== false,
      forbidTryStatements: options.forbidTryStatements !== false,
      functionStack: [],
      sourceCode: context.sourceCode,
    };

    return {
      ":function": (node) => enterFunction(state, node),
      ":function:exit": () => exitFunction(state),
      CallExpression: (node) => visitCallExpression(state, node),
      TryStatement: (node) => visitTryStatement(state, node),
    };
  },
};

export default rule;
