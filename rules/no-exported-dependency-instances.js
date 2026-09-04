import {
  compositionRootSchema,
  isCompositionRoot,
} from "./composition-root-helpers.js";

const defaultFactoryPattern =
  "^(?:create|make|build|init|initialize|open|connect|instantiate|setup)(?:[A-Z]|$)";

/**
 * Factories whose products are definitions or static data rather than live
 * service instances. Exporting these is the documented usage of their APIs.
 */
const defaultIgnoredFactories = [
  "createContext",
  "React.createContext",
  "StyleSheet.create",
];

const transparentWrappers = new Set(["Object.freeze", "Object.seal"]);

const calleeName = (callee) => {
  if (callee.type === "Identifier") return callee.name;
  if (
    callee.type === "MemberExpression" &&
    !callee.computed &&
    callee.property.type === "Identifier"
  ) {
    const objectName = calleeName(callee.object);
    return objectName === null ? null : `${objectName}.${callee.property.name}`;
  }
  return null;
};

const lastSegment = (name) => name.slice(name.lastIndexOf(".") + 1);

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
    if (current.type === "AwaitExpression") {
      current = current.argument;
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

const optionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    ...compositionRootSchema,
    factoryPattern: { type: "string" },
    ignoredFactories: { type: "array", items: { type: "string" } },
  },
};

const createClassifier = (options) => {
  const factoryPattern = new RegExp(
    options.factoryPattern ?? defaultFactoryPattern,
    "u",
  );
  const ignoredFactories = new Set([
    ...defaultIgnoredFactories,
    ...(options.ignoredFactories ?? []),
  ]);

  return (initializer) => {
    const expression = unwrapExpression(initializer);
    if (!expression) return null;

    if (expression.type === "NewExpression") {
      const name = calleeName(expression.callee);
      if (name === null || ignoredFactories.has(name)) return null;
      return { factory: `new ${name}`, kind: "constructor" };
    }

    if (expression.type !== "CallExpression") return null;
    const name = calleeName(expression.callee);
    if (name === null || ignoredFactories.has(name)) return null;
    if (!factoryPattern.test(lastSegment(name))) return null;
    return { factory: `${name}()`, kind: "factory" };
  };
};

const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow exporting module-level instances created by factories or constructors at import time",
      url: "https://www.evolu.dev/docs/dependency-injection",
    },
    messages: {
      exportedInstance:
        "'{{name}}' is a module-level instance created by {{factory}} and exported as a global. Export the factory instead and create the instance in the composition root that assembles dependencies.",
    },
    schema: [optionSchema],
  },
  create(context) {
    const options = context.options[0] ?? {};
    if (isCompositionRoot(context, options)) return {};

    const classify = createClassifier(options);
    const instances = new Map();
    const sourceCode = context.sourceCode;

    const report = (name, instance, node) => {
      context.report({
        data: { factory: instance.factory, name },
        messageId: "exportedInstance",
        node,
      });
    };

    const isModuleScope = (node) => {
      const scope = sourceCode.getScope(node);
      return scope.type === "module" || scope.type === "global";
    };

    return {
      VariableDeclarator(node) {
        if (node.id.type !== "Identifier" || !isModuleScope(node)) return;
        const instance = classify(node.init);
        if (instance) instances.set(node.id.name, instance);
      },
      ExportNamedDeclaration(node) {
        if (node.declaration?.type === "VariableDeclaration") {
          for (const declaration of node.declaration.declarations) {
            if (declaration.id.type !== "Identifier") continue;
            const instance = classify(declaration.init);
            if (instance) report(declaration.id.name, instance, declaration);
          }
        }
        if (node.source) return;
        for (const specifier of node.specifiers) {
          if (specifier.local.type !== "Identifier") continue;
          const instance = instances.get(specifier.local.name);
          if (instance) report(specifier.local.name, instance, specifier);
        }
      },
      ExportDefaultDeclaration(node) {
        const declaration = node.declaration;
        if (declaration.type === "Identifier") {
          const instance = instances.get(declaration.name);
          if (instance) report(declaration.name, instance, node);
          return;
        }
        const instance = classify(declaration);
        if (instance) report("default", instance, node);
      },
    };
  },
};

export default rule;
