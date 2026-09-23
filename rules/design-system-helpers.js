import path from "node:path";
import { minimatch } from "minimatch";
import { jsxNameParts, unwrapExpression } from "./composition-helpers.js";

export const relativeFilename = (context) =>
  path.relative(process.cwd(), context.filename).split(path.sep).join("/");

export const matchesPatterns = (filename, patterns = []) =>
  patterns.some((pattern) =>
    minimatch(filename, pattern, { dot: true, matchBase: false }),
  );

export const jsxElementName = (node) => jsxNameParts(node).join(".");

export const jsxAttributeName = (node) =>
  node.name.type === "JSXIdentifier" ? node.name.name : undefined;

export const propertyName = (node) => {
  if (!node.computed && node.key.type === "Identifier") return node.key.name;
  if (node.key.type === "Literal") return String(node.key.value);
  return undefined;
};

export const jsxAttributeExpression = (node) =>
  node.value?.type === "JSXExpressionContainer"
    ? node.value.expression
    : undefined;

export const findVariable = (sourceCode, node) => {
  let scope = sourceCode.getScope(node);
  while (scope) {
    const variable = scope.variables.find(({ name }) => name === node.name);
    if (variable) return variable;
    scope = scope.upper;
  }
  return undefined;
};

// Resolves an Identifier back to its initializer expression when the
// binding is a `const`, or a `let` that is never reassigned after its
// declaration.
export const getVariableInitializer = (sourceCode, node) => {
  const variable = findVariable(sourceCode, node);
  if (variable?.defs.length !== 1) return undefined;

  const [definition] = variable.defs;
  if (
    definition.type !== "Variable" ||
    definition.name.type !== "Identifier"
  ) {
    return undefined;
  }

  const { kind } = definition.parent;
  if (kind === "const") return definition.node.init ?? undefined;
  if (kind !== "let") return undefined;

  const isReassigned = variable.references.some(
    (reference) => reference.isWrite() && reference.identifier !== definition.name,
  );
  return isReassigned ? undefined : (definition.node.init ?? undefined);
};

// Resolves an Identifier bound to a `const` object-literal initializer
// back to that ObjectExpression, for use where a JSX attribute references
// a locally-declared style object instead of an inline literal.
export const constObjectLiteral = (sourceCode, node) => {
  if (node.type !== "Identifier") return undefined;
  const variable = findVariable(sourceCode, node);
  if (variable?.defs.length !== 1) return undefined;

  const [definition] = variable.defs;
  if (
    definition.type !== "Variable" ||
    definition.parent.kind !== "const" ||
    definition.name.type !== "Identifier"
  ) {
    return undefined;
  }
  return definition.node.init?.type === "ObjectExpression"
    ? definition.node.init
    : undefined;
};

export const staticLiteral = (node) => {
  node = unwrapExpression(node);
  if (!node) return undefined;
  if (
    node.type === "Literal" &&
    (typeof node.value === "string" || typeof node.value === "number")
  ) {
    return { node, value: node.value };
  }
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
    return { node, value: node.quasis[0]?.value.cooked ?? "" };
  }
  if (
    node.type === "UnaryExpression" &&
    (node.operator === "+" || node.operator === "-") &&
    node.argument.type === "Literal" &&
    typeof node.argument.value === "number"
  ) {
    return {
      node,
      value:
        node.operator === "-" ? -node.argument.value : node.argument.value,
    };
  }
  return undefined;
};
