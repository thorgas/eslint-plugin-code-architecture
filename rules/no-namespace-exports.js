const transparentWrappers = new Set(["Object.freeze", "Object.seal"]);

const calleeName = (callee) => {
  if (callee.type === "Identifier") return callee.name;
  if (
    callee.type === "MemberExpression" &&
    !callee.computed &&
    callee.object.type === "Identifier" &&
    callee.property.type === "Identifier"
  ) {
    return `${callee.object.name}.${callee.property.name}`;
  }
  return null;
};

const unwrapExpression = (node) => {
  let current = node;
  for (;;) {
    if (!current) return null;
    if (
      ["TSAsExpression", "TSSatisfiesExpression", "TSNonNullExpression"].includes(
        current.type,
      )
    ) {
      current = current.expression;
      continue;
    }
    if (
      current.type === "CallExpression" &&
      current.arguments.length === 1 &&
      transparentWrappers.has(calleeName(current.callee) ?? "")
    ) {
      current = current.arguments[0];
      continue;
    }
    return current;
  }
};

const isFunctionNode = (node) =>
  node?.type === "ArrowFunctionExpression" ||
  node?.type === "FunctionExpression";

const isCapitalized = (name) => /^[A-Z]/u.test(name);

const propertyName = (property) => {
  if (property.computed) return null;
  if (property.key.type === "Identifier") return property.key.name;
  if (property.key.type === "Literal") return String(property.key.value);
  return null;
};

const optionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    allowCompoundComponents: { type: "boolean" },
  },
};

/**
 * Classifies an object literal. A namespace bundles behavior: at least one
 * member is a function literal, a method, or a shorthand reference to a
 * module-level function. Objects whose members are only data (configuration,
 * lookup tables, style objects, enum-like constants) are not namespaces.
 */
const createClassifier = (sourceCode, options) => {
  const allowCompoundComponents = options.allowCompoundComponents ?? true;

  const isFunctionBinding = (identifier) => {
    let scope = sourceCode.getScope(identifier);
    while (scope) {
      const variable = scope.set.get(identifier.name);
      if (variable) {
        return variable.defs.some((definition) => {
          if (definition.type === "FunctionName") return true;
          if (definition.type !== "Variable") return false;
          return isFunctionNode(unwrapExpression(definition.node.init));
        });
      }
      scope = scope.upper;
    }
    return false;
  };

  const memberIsBehavior = (property) => {
    if (property.type !== "Property") return false;
    if (property.method || property.kind !== "init") return true;
    const value = unwrapExpression(property.value);
    if (isFunctionNode(value)) return true;
    return value?.type === "Identifier" && isFunctionBinding(value);
  };

  return (initializer) => {
    const expression = unwrapExpression(initializer);
    if (expression?.type !== "ObjectExpression") return false;
    const properties = expression.properties;
    if (properties.length === 0) return false;
    const behaviorMembers = properties.filter(memberIsBehavior);
    if (behaviorMembers.length === 0) return false;
    if (
      allowCompoundComponents &&
      properties.every((property) => {
        const name = propertyName(property);
        return name !== null && isCapitalized(name);
      })
    ) {
      return false;
    }
    return true;
  };
};

const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require unique exported members instead of exported object namespaces that bundle behavior",
      url: "https://www.evolu.dev/docs/conventions",
    },
    messages: {
      exportMembers:
        "'{{name}}' bundles functions behind an object namespace. Export each member individually so call sites import exactly what they use and every symbol stays searchable.",
      exportNamespace:
        "'{{name}}' is an exported TypeScript namespace. Export its members individually from the module instead.",
    },
    schema: [optionSchema],
  },
  create(context) {
    const isNamespace = createClassifier(
      context.sourceCode,
      context.options[0] ?? {},
    );
    const namespaces = new Set();

    const report = (name, node) => {
      context.report({
        data: { name },
        messageId: "exportMembers",
        node,
      });
    };

    return {
      VariableDeclarator(node) {
        if (node.id.type === "Identifier" && isNamespace(node.init)) {
          namespaces.add(node.id.name);
        }
      },
      ExportNamedDeclaration(node) {
        if (node.declaration?.type === "VariableDeclaration") {
          for (const declaration of node.declaration.declarations) {
            if (
              declaration.id.type === "Identifier" &&
              isNamespace(declaration.init)
            ) {
              report(declaration.id.name, declaration);
            }
          }
        }
        if (
          node.declaration?.type === "TSModuleDeclaration" &&
          node.declaration.kind === "namespace" &&
          !node.declaration.declare &&
          node.declaration.id.type === "Identifier"
        ) {
          context.report({
            data: { name: node.declaration.id.name },
            messageId: "exportNamespace",
            node: node.declaration,
          });
        }
        if (node.source) return;
        for (const specifier of node.specifiers) {
          if (
            specifier.local.type === "Identifier" &&
            namespaces.has(specifier.local.name)
          ) {
            report(specifier.local.name, specifier);
          }
        }
      },
      ExportDefaultDeclaration(node) {
        const declaration = node.declaration;
        if (declaration.type === "Identifier") {
          if (namespaces.has(declaration.name)) report(declaration.name, node);
          return;
        }
        if (isNamespace(declaration)) report("default", node);
      },
    };
  },
};

export default rule;
