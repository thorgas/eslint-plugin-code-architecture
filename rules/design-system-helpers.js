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
