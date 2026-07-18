import {
  functionName,
  readPropsParameter,
  referencedPropName,
  walkNodes,
} from "./composition-helpers.js";

const containsChildren = (root, component, sourceCode) => {
  let found = false;
  walkNodes(root, sourceCode, (node) => {
    if (referencedPropName(node, component.props) === "children") found = true;
  }, { skipFunctions: true });
  return found;
};

const makeComponent = (node, pattern) => {
  const name = functionName(node);
  if (!name || !pattern.test(name)) return undefined;
  const props = readPropsParameter(node.params[0]);
  return {
    acceptsChildren: [...props.bindings.values()].includes("children"),
    name,
    node,
    props,
    rendersChildren: false,
  };
};

const exitFunction = (state) => {
  const component = state.functionStack.pop()?.component;
  if (!component) return;
  if (
    component.node.type === "ArrowFunctionExpression" &&
    component.node.body.type !== "BlockStatement" &&
    containsChildren(component.node.body, component, state.sourceCode)
  ) {
    component.rendersChildren = true;
  }
  if (!component.acceptsChildren) {
    state.context.report({
      node: component.node,
      messageId: "missingChildren",
      data: { name: component.name },
    });
  } else if (!component.rendersChildren) {
    state.context.report({
      node: component.node,
      messageId: "unrenderedChildren",
      data: { name: component.name },
    });
  }
};

const currentComponent = (state) => state.functionStack.at(-1)?.component;

const makeVisitors = (state) => ({
  ":function"(node) {
    state.functionStack.push({
      component: makeComponent(node, state.pattern),
    });
  },
  ":function:exit"() {
    exitFunction(state);
  },
  MemberExpression(node) {
    const component = currentComponent(state);
    if (
      component &&
      referencedPropName(node, component.props) === "children"
    ) {
      component.acceptsChildren = true;
    }
  },
  ReturnStatement(node) {
    const component = currentComponent(state);
    if (
      component &&
      node.argument &&
      containsChildren(node.argument, component, state.sourceCode)
    ) {
      component.rendersChildren = true;
    }
  },
});

const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require composition roots and providers to accept and render children",
      url: "https://www.components.build/composition",
    },
    messages: {
      missingChildren:
        "{{name}} is a composition boundary but does not accept children. Let the consumer provide the child hierarchy.",
      unrenderedChildren:
        "{{name}} accepts children but does not return them. Render children inside the shared state or infrastructure boundary.",
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
          componentNamePattern: {
            type: "string",
            default: "(?:Root|Provider)$",
          },
        },
      },
    ],
  },
  create(context) {
    return makeVisitors({
      context,
      functionStack: [],
      pattern: new RegExp(
        context.options[0]?.componentNamePattern ?? "(?:Root|Provider)$",
        "u",
      ),
      sourceCode: context.sourceCode,
    });
  },
};

export default rule;
