import path from "node:path";
import { minimatch } from "minimatch";

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

const findVariable = (sourceCode, node) => {
  let scope = sourceCode.getScope(node);
  while (scope) {
    const variable = scope.variables.find(({ name }) => name === node.name);
    if (variable) return variable;
    scope = scope.upper;
  }
  return undefined;
};

const getConstInitializer = (sourceCode, node) => {
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
  return definition.node.init ?? undefined;
};

const collectRawValues = (sourceCode, node, values, seen = new Set()) => {
  if (!node || seen.has(node)) return [];
  seen.add(node);

  if (node.type === "Literal") {
    return values.has(node.value) ? [{ node, value: node.value }] : [];
  }
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
    const value = node.quasis[0]?.value.cooked;
    return values.has(value) ? [{ node, value }] : [];
  }
  if (
    node.type === "UnaryExpression" &&
    (node.operator === "+" || node.operator === "-") &&
    node.argument.type === "Literal" &&
    typeof node.argument.value === "number"
  ) {
    const value = node.operator === "-" ? -node.argument.value : node.argument.value;
    return values.has(value) ? [{ node, value }] : [];
  }
  if (node.type === "Identifier") {
    const initializer = getConstInitializer(sourceCode, node);
    return collectRawValues(sourceCode, initializer, values, seen).map(
      ({ value }) => ({ node, value }),
    );
  }

  const keys = expressionKeys[node.type] ?? [];

  return keys.flatMap((key) => {
    const children = Array.isArray(node[key]) ? node[key] : [node[key]];
    return children.flatMap((child) =>
      collectRawValues(sourceCode, child, values, seen),
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
  configuredValues,
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
      replacement:
        configuredValues.get(match.value) ?? defaultReplacement,
      value: String(match.value),
    },
  });
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
        required: ["values"],
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
              required: ["properties", "value"],
              properties: {
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
    const valuesByProperty = new Map();
    for (const configuredValue of options.values) {
      for (const property of configuredValue.properties) {
        const values = valuesByProperty.get(property) ?? new Map();
        values.set(configuredValue.value, configuredValue.replacement);
        valuesByProperty.set(property, values);
      }
    }
    const sourceCode = context.sourceCode;
    const reportedNodes = new WeakSet();

    return {
      JSXAttribute(node) {
        const property = getJsxPropertyName(node);
        const configuredValues = valuesByProperty.get(property);
        if (!configuredValues) return;

        const match = getStaticJsxString(node);
        if (!match || !configuredValues.has(match.value)) return;
        reportRawValue({
          configuredValues,
          context,
          exceptions,
          match,
          property,
          reportedNodes,
        });
      },
      Property(node) {
        if (node.parent.type === "ObjectPattern") return;
        const property = getPropertyName(node);
        const configuredValues = valuesByProperty.get(property);
        if (!configuredValues) return;

        for (const match of collectRawValues(
          sourceCode,
          node.value,
          configuredValues,
        )) {
          reportRawValue({
            configuredValues,
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
