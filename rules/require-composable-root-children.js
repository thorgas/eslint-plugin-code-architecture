import {
  functionName,
  readPropsParameter,
  referencedPropName,
  unwrapExpression,
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
    aliases: new Map(),
    allReturnsRenderChildren: true,
    hasReturn: false,
    name,
    node,
    props,
  };
};

const returnRendersChildren = (root, component, sourceCode, seen = new Set()) => {
  const node = unwrapExpression(root);
  if (!node) return false;
  if (node.type === "ConditionalExpression") {
    return (
      returnRendersChildren(node.consequent, component, sourceCode, seen) &&
      returnRendersChildren(node.alternate, component, sourceCode, seen)
    );
  }
  if (node.type === "LogicalExpression") {
    return (
      returnRendersChildren(node.left, component, sourceCode, seen) &&
      returnRendersChildren(node.right, component, sourceCode, seen)
    );
  }
  if (node.type === "SequenceExpression") {
    return returnRendersChildren(
      node.expressions.at(-1),
      component,
      sourceCode,
      seen,
    );
  }
  if (node.type === "Identifier" && !seen.has(node.name)) {
    seen.add(node.name);
    const resolved = component.aliases.get(node.name);
    if (resolved) {
      return returnRendersChildren(resolved, component, sourceCode, seen);
    }
  }
  return containsChildren(node, component, sourceCode);
};

const recordReturn = (component, expression, sourceCode) => {
  component.hasReturn = true;
  if (!returnRendersChildren(expression, component, sourceCode)) {
    component.allReturnsRenderChildren = false;
  }
};

const exitFunction = (state) => {
  const component = state.functionStack.pop()?.component;
  if (!component) return;
  if (
    component.node.type === "ArrowFunctionExpression" &&
    component.node.body.type !== "BlockStatement"
  ) {
    recordReturn(component, component.node.body, state.sourceCode);
  }
  if (!component.acceptsChildren) {
    state.context.report({
      node: component.node,
      messageId: "missingChildren",
      data: { name: component.name },
    });
  } else if (!component.hasReturn || !component.allReturnsRenderChildren) {
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
      node.argument
    ) {
      recordReturn(component, node.argument, state.sourceCode);
    }
  },
  VariableDeclarator(node) {
    const component = currentComponent(state);
    if (component && node.id.type === "Identifier" && node.init) {
      component.aliases.set(node.id.name, node.init);
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
        "{{name}} must render children on every reachable top-level return path. Keep the consumer-owned hierarchy inside the shared state or infrastructure boundary.",
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
