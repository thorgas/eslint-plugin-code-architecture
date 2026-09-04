import path from "node:path";
import { minimatch } from "minimatch";
import { getVariableInitializer } from "./design-system-helpers.js";

const normalizePath = (value) => value.split(path.sep).join("/");
const defaultReplacement = "an approved design token";

const expressionKeys = {
  ArrayExpression: ["elements"],
  AwaitExpression: ["argument"],
  BinaryExpression: ["left", "right"],
  CallExpression: ["arguments"],
  ChainExpression: ["expression"],
  ConditionalExpression: ["consequent", "alternate"],
  LogicalExpression: ["left", "right"],
  NewExpression: ["arguments"],
  SequenceExpression: ["expressions"],
  SpreadElement: ["argument"],
  TSAsExpression: ["expression"],
  TSNonNullExpression: ["expression"],
  TSSatisfiesExpression: ["expression"],
  TSTypeAssertion: ["expression"],
};

const matchesFile = (filename, patterns) =>
  patterns.some((pattern) =>
    minimatch(filename, pattern, { dot: true, matchBase: false }),
  );

const getPropertyName = (node) => {
  const { key } = node;
  if (!node.computed && key.type === "Identifier") return key.name;
  if (key.type === "Literal") return String(key.value);
  if (key.type === "TemplateLiteral" && key.expressions.length === 0) {
    return key.quasis[0]?.value.cooked;
  }
  return undefined;
};

const getJsxPropertyName = (node) =>
  node.name.type === "JSXIdentifier" ? node.name.name : undefined;

const getStaticJsxString = (node) => {
  if (node.value?.type === "Literal" && typeof node.value.value === "string") {
    return { node: node.value, value: node.value.value };
  }
  if (node.value?.type !== "JSXExpressionContainer") return undefined;

  const expression = node.value.expression;
  if (expression.type === "Literal" && typeof expression.value === "string") {
    return { node: expression, value: expression.value };
  }
  if (
    expression.type === "TemplateLiteral" &&
    expression.expressions.length === 0
  ) {
    return { node: expression, value: expression.quasis[0]?.value.cooked };
  }
  return undefined;
};

const colorLikeProperties = new Set([
  "color",
  "backgroundColor",
  "borderColor",
  "tintColor",
  "shadowColor",
  "fill",
  "stroke",
]);

const isColorLikeProperty = (property) =>
  colorLikeProperties.has(property) || property.endsWith("Color");

const defaultColorPattern = /^#[0-9a-fA-F]{3,8}$/;
const defaultColorFunctionPattern = /^(rgba?|hsla?)\(/i;

const isDefaultColorValue = (value) =>
  typeof value === "string" &&
  (defaultColorPattern.test(value) || defaultColorFunctionPattern.test(value));

// Resolves a property's configured matchers plus the built-in color
// detection into a single "does this value count as raw?" lookup that
// returns the replacement text, or undefined when nothing matches.
const buildMatcher = (matchers, property) => (value) => {
  for (const matcher of matchers) {
    if (matcher.test(value)) return matcher.replacement ?? defaultReplacement;
  }
  if (isColorLikeProperty(property) && isDefaultColorValue(value)) {
    return defaultReplacement;
  }
  return undefined;
};

const collectRawValues = (sourceCode, node, matchValue, seen = new Set()) => {
  if (!node || seen.has(node)) return [];
  seen.add(node);

  if (node.type === "Literal") {
    const replacement = matchValue(node.value);
    return replacement ? [{ node, replacement, value: node.value }] : [];
  }
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
    const value = node.quasis[0]?.value.cooked;
    const replacement = matchValue(value);
    return replacement ? [{ node, replacement, value }] : [];
  }
  if (
    node.type === "UnaryExpression" &&
    (node.operator === "+" || node.operator === "-") &&
    node.argument.type === "Literal" &&
    typeof node.argument.value === "number"
  ) {
    const value = node.operator === "-" ? -node.argument.value : node.argument.value;
    const replacement = matchValue(value);
    return replacement ? [{ node, replacement, value }] : [];
  }
  if (node.type === "Identifier") {
    const initializer = getVariableInitializer(sourceCode, node);
    return collectRawValues(sourceCode, initializer, matchValue, seen).map(
      ({ replacement, value }) => ({ node, replacement, value }),
    );
  }

  const keys = expressionKeys[node.type] ?? [];

  return keys.flatMap((key) => {
    const children = Array.isArray(node[key]) ? node[key] : [node[key]];
    return children.flatMap((child) =>
      collectRawValues(sourceCode, child, matchValue, seen),
    );
  });
};

const isExcepted = (exceptions, property, value) =>
  exceptions.some(
    (exception) =>
      (!exception.properties || exception.properties.includes(property)) &&
      (!exception.values || exception.values.includes(value)),
  );

const reportRawValue = ({
  context,
  exceptions,
  match,
  property,
  reportedNodes,
}) => {
  if (
    reportedNodes.has(match.node) ||
    isExcepted(exceptions, property, match.value)
  ) {
    return;
  }
  reportedNodes.add(match.node);
  context.report({
    node: match.node,
    messageId: "rawDesignValue",
    data: {
      property,
      replacement: match.replacement,
      value: String(match.value),
    },
  });
};

const buildValueMatcher = (configuredValue) =>
  configuredValue.pattern
    ? {
        replacement: configuredValue.replacement,
        test: (value) =>
          typeof value === "string" &&
          new RegExp(configuredValue.pattern).test(value),
      }
    : {
        replacement: configuredValue.replacement,
        test: (value) => value === configuredValue.value,
      };

const buildMatchersByProperty = (values = []) => {
  const matchersByProperty = new Map();
  for (const configuredValue of values) {
    const matcher = buildValueMatcher(configuredValue);
    for (const property of configuredValue.properties) {
      const matchers = matchersByProperty.get(property) ?? [];
      matchers.push(matcher);
      matchersByProperty.set(property, matchers);
    }
  }
  return matchersByProperty;
};

const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require configured design values to use semantic tokens in configured style properties",
    },
    messages: {
      rawDesignValue:
        "Raw design value '{{value}}' is not allowed for '{{property}}'. Use {{replacement}} instead.",
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
          allowedFiles: {
            type: "array",
            minItems: 1,
            uniqueItems: true,
            items: { type: "string", minLength: 1 },
          },
          exceptions: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["files"],
              properties: {
                files: {
                  type: "array",
                  minItems: 1,
                  uniqueItems: true,
                  items: { type: "string", minLength: 1 },
                },
                properties: {
                  type: "array",
                  minItems: 1,
                  uniqueItems: true,
                  items: { type: "string", minLength: 1 },
                },
                values: {
                  type: "array",
                  minItems: 1,
                  uniqueItems: true,
                  items: { anyOf: [{ type: "string" }, { type: "number" }] },
                },
              },
            },
          },
          values: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["properties"],
              anyOf: [{ required: ["value"] }, { required: ["pattern"] }],
              properties: {
                pattern: { type: "string", minLength: 1 },
                properties: {
                  type: "array",
                  minItems: 1,
                  uniqueItems: true,
                  items: { type: "string", minLength: 1 },
                },
                replacement: { type: "string", minLength: 1 },
                value: { anyOf: [{ type: "string" }, { type: "number" }] },
              },
            },
          },
        },
      },
    ],
  },
  create(context) {
    const options = context.options[0];
    const filename = normalizePath(
      path.relative(process.cwd(), context.filename),
    );
    if (matchesFile(filename, options.allowedFiles ?? [])) return {};

    const exceptions = (options.exceptions ?? []).filter(({ files }) =>
      matchesFile(filename, files),
    );
    const matchersByProperty = buildMatchersByProperty(options.values);
    const sourceCode = context.sourceCode;
    const reportedNodes = new WeakSet();

    return {
      JSXAttribute(node) {
        const property = getJsxPropertyName(node);
        if (!property) return;
        const match = getStaticJsxString(node);
        if (!match) return;
        const matchValue = buildMatcher(
          matchersByProperty.get(property) ?? [],
          property,
        );
        const replacement = matchValue(match.value);
        if (!replacement) return;
        reportRawValue({
          context,
          exceptions,
          match: { ...match, replacement },
          property,
          reportedNodes,
        });
      },
      Property(node) {
        if (node.parent.type === "ObjectPattern") return;
        const property = getPropertyName(node);
        if (!property) return;
        const matchValue = buildMatcher(
          matchersByProperty.get(property) ?? [],
          property,
        );

        for (const match of collectRawValues(
          sourceCode,
          node.value,
          matchValue,
        )) {
          reportRawValue({
            context,
            exceptions,
            match,
            property,
            reportedNodes,
          });
        }
      },
    };
  },
};

export default rule;
