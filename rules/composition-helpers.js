const functionTypes = new Set([
  "ArrowFunctionExpression",
  "FunctionDeclaration",
  "FunctionExpression",
]);

const unwrapParameter = (parameter) =>
  parameter?.type === "AssignmentPattern" ? parameter.left : parameter;

export const functionName = (node) => {
  if (node.id?.type === "Identifier") return node.id.name;

  let current = node;
  for (let depth = 0; depth < 4; depth += 1) {
    const parent = current.parent;
    if (!parent) return undefined;
    if (
      parent.type === "VariableDeclarator" &&
      parent.id.type === "Identifier"
    ) {
      return parent.id.name;
    }
    if (
      parent.type === "Property" &&
      parent.value === current &&
      !parent.computed &&
      parent.key.type === "Identifier"
    ) {
      return parent.key.name;
    }
    if (
      ![
        "CallExpression",
        "ChainExpression",
        "TSAsExpression",
        "TSSatisfiesExpression",
      ].includes(parent.type)
    ) {
      return undefined;
    }
    current = parent;
  }
  return undefined;
};

const propertyName = (property) => {
  if (!property.computed && property.key.type === "Identifier") {
    return property.key.name;
  }
  if (property.key.type === "Literal" && typeof property.key.value === "string") {
    return property.key.value;
  }
  return undefined;
};

const localBindingName = (value) => {
  if (value.type === "Identifier") return value.name;
  if (
    value.type === "AssignmentPattern" &&
    value.left.type === "Identifier"
  ) {
    return value.left.name;
  }
  return undefined;
};

export const readPropsParameter = (parameter) => {
  const bindings = new Map();
  const unwrapped = unwrapParameter(parameter);
  if (!unwrapped) return { bindings };
  if (unwrapped.type === "Identifier") {
    return { bindings, propsIdentifier: unwrapped.name };
  }
  if (unwrapped.type !== "ObjectPattern") return { bindings };

  for (const property of unwrapped.properties) {
    if (property.type !== "Property") continue;
    const propName = propertyName(property);
    const localName = localBindingName(property.value);
    if (propName && localName) bindings.set(localName, propName);
  }
  return { bindings };
};

export const referencedPropName = (node, props) => {
  if (node.type === "Identifier") return props.bindings.get(node.name);
  if (
    node.type !== "MemberExpression" ||
    node.object.type !== "Identifier" ||
    node.object.name !== props.propsIdentifier
  ) {
    return undefined;
  }
  if (!node.computed && node.property.type === "Identifier") {
    return node.property.name;
  }
  if (
    node.computed &&
    node.property.type === "Literal" &&
    typeof node.property.value === "string"
  ) {
    return node.property.value;
  }
  return undefined;
};

export const walkNodes = (root, sourceCode, visit, options = {}) => {
  const stack = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;
    visit(node);
    if (
      node !== root &&
      options.skipFunctions &&
      functionTypes.has(node.type)
    ) {
      continue;
    }
    const keys = sourceCode.visitorKeys[node.type] ?? [];
    for (const key of keys) {
      const value = node[key];
      if (Array.isArray(value)) stack.push(...value);
      else if (value) stack.push(value);
    }
  }
};

export const containsJsx = (root, sourceCode) => {
  let found = false;
  walkNodes(root, sourceCode, (node) => {
    if (node.type === "JSXElement" || node.type === "JSXFragment") found = true;
  });
  return found;
};

export const referencedProps = (root, props, sourceCode) => {
  const names = new Set();
  walkNodes(root, sourceCode, (node) => {
    const name = referencedPropName(node, props);
    if (name) names.add(name);
  });
  return names;
};
