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
    const {
      actorHooks,
      componentNamePattern,
      forbiddenHooks,
      maximumActorHooks,
    } = makeConfiguration(options);
    const functionStack = [];

    const currentComponent = () =>
      functionStack.findLast(({ component }) => component)?.component;

    const enterFunction = (node) => {
      const parentComponent = currentComponent();
      const name = functionName(node);
      const component =
        name && componentNamePattern.test(name)
          ? { actorHookCount: 0, node }
          : undefined;

      if (parentComponent && options.forbidInlineFunctions !== false) {
        context.report({ node, messageId: "inlineFunction" });
      }
      functionStack.push({ component });
    };

    const exitFunction = () => {
      const current = functionStack.pop();
      const component = current?.component;
      if (!component || component.actorHookCount <= maximumActorHooks) return;

      context.report({
        node: component.node,
        messageId: "multipleActors",
        data: { actual: component.actorHookCount, maximum: maximumActorHooks },
      });
    };

    return {
      ":function": enterFunction,
      ":function:exit": exitFunction,
      CallExpression(node) {
        const component = currentComponent();
        if (!component) return;

        const hook = calleeLeafName(node.callee);
        if (!hook) return;
        if (forbiddenHooks.has(hook)) {
          context.report({
            node,
            messageId: "forbiddenHook",
            data: { hook },
          });
        }
        if (actorHooks.has(hook)) component.actorHookCount += 1;
      },
      TryStatement(node) {
        if (options.forbidTryStatements === false || !currentComponent())
          return;
        context.report({ node, messageId: "errorHandling" });
      },
    };
  },
};

export default rule;
