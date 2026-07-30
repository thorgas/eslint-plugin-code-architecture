import {
  assertionNameSet,
  isAssertionCall,
} from "./assertion-helpers.js";

const equalityOperators = new Set(["==", "===", "!=", "!=="]);
const controlFlowTypes = new Set([
  "CatchClause",
  "ConditionalExpression",
  "DoWhileStatement",
  "ForInStatement",
  "ForOfStatement",
  "ForStatement",
  "IfStatement",
  "LogicalExpression",
  "SwitchCase",
  "SwitchStatement",
  "TryStatement",
  "WhileStatement",
]);

const unwrapParameter = (parameter) =>
  parameter.type === "TSParameterProperty"
    ? unwrapParameter(parameter.parameter)
    : parameter;

const collectBindings = (parameter, inheritedOptional = false) => {
  const node = unwrapParameter(parameter);
  if (node.type === "Identifier") {
    if (node.name === "this") return [];
    return [
      {
        name: node.name,
        node,
        optional: inheritedOptional || node.optional === true,
        type: node.typeAnnotation?.typeAnnotation ?? null,
      },
    ];
  }
  if (node.type === "AssignmentPattern") {
    return collectBindings(node.left, inheritedOptional);
  }
  if (node.type === "RestElement") {
    return collectBindings(node.argument, inheritedOptional);
  }
  if (node.type === "ObjectPattern") {
    return node.properties.flatMap((property) => {
      if (property.type === "RestElement") {
        return collectBindings(property.argument, inheritedOptional);
      }
      return collectBindings(property.value, inheritedOptional);
    });
  }
  if (node.type === "ArrayPattern") {
    return node.elements.flatMap((element) =>
      element ? collectBindings(element, inheritedOptional) : [],
    );
  }
  return [];
};

const findVariable = (sourceCode, identifier) => {
  let scope = sourceCode.getScope(identifier);
  while (scope) {
    const variable = scope.set.get(identifier.name);
    if (variable) return variable;
    scope = scope.upper;
  }
  return null;
};

const isAncestor = (ancestor, node) => {
  let current = node;
  while (current) {
    if (current === ancestor) return true;
    current = current.parent;
  }
  return false;
};

const variableReferencedWithin = (variable, ancestor) =>
  variable?.references.some(({ identifier }) =>
    isAncestor(ancestor, identifier),
  ) ?? false;

const unwrapType = (type) => {
  let current = type;
  while (current?.type === "TSParenthesizedType") {
    current = current.typeAnnotation;
  }
  return current;
};

const primitiveTypeofName = (type) => {
  const names = new Map([
    ["TSBigIntKeyword", "bigint"],
    ["TSBooleanKeyword", "boolean"],
    ["TSNumberKeyword", "number"],
    ["TSStringKeyword", "string"],
    ["TSSymbolKeyword", "symbol"],
    ["TSUndefinedKeyword", "undefined"],
  ]);
  return names.get(unwrapType(type)?.type) ?? null;
};

const typeAllowsNullish = (type, value, optional) => {
  if (optional && value === "undefined") return true;
  const current = unwrapType(type);
  if (!current) return true;
  if (["TSAnyKeyword", "TSUnknownKeyword"].includes(current.type)) return true;
  if (current.type === "TSUnionType") {
    return current.types.some((member) =>
      typeAllowsNullish(member, value, false),
    );
  }
  if (value === "undefined") return current.type === "TSUndefinedKeyword";
  return current.type === "TSNullKeyword";
};

const identifierMatchesVariable = (node, variable, sourceCode) =>
  node?.type === "Identifier" &&
  findVariable(sourceCode, node) === variable;

const redundantTypeofCheck = (expression, target, sourceCode) => {
  if (
    expression.type !== "BinaryExpression" ||
    !equalityOperators.has(expression.operator)
  ) {
    return false;
  }
  const sides = [
    [expression.left, expression.right],
    [expression.right, expression.left],
  ];
  return sides.some(
    ([candidate, literal]) =>
      candidate.type === "UnaryExpression" &&
      candidate.operator === "typeof" &&
      identifierMatchesVariable(
        candidate.argument,
        target.variable,
        sourceCode,
      ) &&
      literal.type === "Literal" &&
      literal.value === primitiveTypeofName(target.type),
  );
};

const nullishValue = (node) => {
  if (node.type === "Literal" && node.value === null) return "null";
  if (node.type === "Identifier" && node.name === "undefined") {
    return "undefined";
  }
  return null;
};

const redundantNullishCheck = (expression, target, sourceCode) => {
  if (
    expression.type !== "BinaryExpression" ||
    !equalityOperators.has(expression.operator)
  ) {
    return false;
  }
  const sides = [
    [expression.left, expression.right],
    [expression.right, expression.left],
  ];
  return sides.some(([candidate, valueNode]) => {
    const value = nullishValue(valueNode);
    return (
      value !== null &&
      identifierMatchesVariable(candidate, target.variable, sourceCode) &&
      !typeAllowsNullish(target.type, value, target.optional)
    );
  });
};

const typeReferenceName = (type) => {
  const current = unwrapType(type);
  if (
    current?.type !== "TSTypeReference" ||
    current.typeName.type !== "Identifier"
  ) {
    return null;
  }
  return current.typeName.name;
};

const redundantInstanceCheck = (expression, target, sourceCode) =>
  expression.type === "BinaryExpression" &&
  expression.operator === "instanceof" &&
  identifierMatchesVariable(expression.left, target.variable, sourceCode) &&
  expression.right.type === "Identifier" &&
  expression.right.name === typeReferenceName(target.type);

const isArrayType = (type) => {
  const current = unwrapType(type);
  if (current?.type === "TSArrayType") return true;
  return ["Array", "ReadonlyArray"].includes(typeReferenceName(current));
};

const redundantArrayCheck = (expression, target, sourceCode) =>
  expression.type === "CallExpression" &&
  expression.callee.type === "MemberExpression" &&
  !expression.callee.computed &&
  expression.callee.object.type === "Identifier" &&
  expression.callee.object.name === "Array" &&
  expression.callee.property.type === "Identifier" &&
  expression.callee.property.name === "isArray" &&
  identifierMatchesVariable(
    expression.arguments[0],
    target.variable,
    sourceCode,
  ) &&
  isArrayType(target.type);

const assertionCondition = (call) => {
  const condition = call.arguments[0];
  return condition && condition.type !== "SpreadElement" ? condition : null;
};

const isTypeOnlyAssertion = (call, target, sourceCode) => {
  const expression = assertionCondition(call);
  if (!expression) return false;
  return (
    redundantTypeofCheck(expression, target, sourceCode) ||
    redundantNullishCheck(expression, target, sourceCode) ||
    redundantInstanceCheck(expression, target, sourceCode) ||
    redundantArrayCheck(expression, target, sourceCode)
  );
};

const statementContainer = (node, other) => {
  let current = node.parent;
  while (current) {
    if (
      (current.type === "BlockStatement" ||
        current.type === "SwitchCase") &&
      isAncestor(current, other)
    ) {
      return current;
    }
    current = current.parent;
  }
  return null;
};

const childWithin = (container, node) => {
  let current = node;
  while (current.parent && current.parent !== container) {
    current = current.parent;
  }
  return current.parent === container ? current : null;
};

const statementList = (container) =>
  container.type === "SwitchCase" ? container.consequent : container.body;

const assertionDominatesReturn = (call, returnNode) => {
  if (call.range[0] >= returnNode.range[0]) return false;
  const container = statementContainer(call, returnNode);
  if (!container) return false;
  const assertionChild = childWithin(container, call);
  const returnChild = childWithin(container, returnNode);
  if (!assertionChild || !returnChild || assertionChild === returnChild) {
    return false;
  }
  const statements = statementList(container);
  if (statements.indexOf(assertionChild) >= statements.indexOf(returnChild)) {
    return false;
  }

  let current = call.parent;
  while (current && current !== container) {
    if (
      controlFlowTypes.has(current.type) &&
      !isAncestor(current, returnNode)
    ) {
      return false;
    }
    current = current.parent;
  }
  return true;
};

const unwrapReturnedExpression = (expression) => {
  let current = expression;
  while (
    current &&
    [
      "AwaitExpression",
      "ChainExpression",
      "TSAsExpression",
      "TSNonNullExpression",
      "TSSatisfiesExpression",
      "TSTypeAssertion",
    ].includes(current.type)
  ) {
    current = current.expression;
  }
  return current;
};

const isStaticReturn = (expression) =>
  expression.type === "Literal" ||
  (expression.type === "TemplateLiteral" &&
    expression.expressions.length === 0) ||
  ["ArrowFunctionExpression", "FunctionExpression"].includes(
    expression.type,
  ) ||
  ["JSXElement", "JSXFragment"].includes(expression.type) ||
  (expression.type === "Identifier" && expression.name === "undefined");

const staticMemberPath = (node) => {
  if (node.type === "Identifier") return node.name;
  if (node.type !== "MemberExpression" || node.computed) return null;
  const object = staticMemberPath(node.object);
  if (!object || node.property.type !== "Identifier") return null;
  return `${object}.${node.property.name}`;
};

const assertionReferencesMember = (condition, returned, sourceCode) => {
  const path = staticMemberPath(returned);
  if (!path) return false;
  const root = returned;
  let rootIdentifier = root;
  while (rootIdentifier.type === "MemberExpression") {
    rootIdentifier = rootIdentifier.object;
  }
  if (rootIdentifier.type !== "Identifier") return false;
  const variable = findVariable(sourceCode, rootIdentifier);
  return (
    variable?.references.some(({ identifier }) => {
      if (!isAncestor(condition, identifier)) return false;
      let current = identifier;
      while (
        current.parent?.type === "MemberExpression" &&
        current.parent.object === current
      ) {
        current = current.parent;
      }
      return staticMemberPath(current) === path;
    }) ?? false
  );
};

const returnTarget = (expression, sourceCode, returnType) => {
  if (expression.type === "Identifier") {
    return {
      optional: false,
      type: returnType,
      variable: findVariable(sourceCode, expression),
    };
  }
  return null;
};

const returnIsAsserted = (state, returned, returnNode, sourceCode, options) => {
  const target = returnTarget(returned, sourceCode, state.returnType);
  return state.assertions.some((call) => {
    if (!assertionDominatesReturn(call, returnNode)) return false;
    const condition = assertionCondition(call);
    if (!condition) return false;
    const referencesReturn = target
      ? variableReferencedWithin(target.variable, condition)
      : assertionReferencesMember(condition, returned, sourceCode);
    if (!referencesReturn) return false;
    return !(
      options.ignoreTypeOnlyAssertions &&
      target &&
      isTypeOnlyAssertion(call, target, sourceCode)
    );
  });
};

const reportParameters = (context, state, sourceCode, options) => {
  if (!options.checkParameters) return;
  for (const binding of state.bindings) {
    const target = {
      ...binding,
      variable: findVariable(sourceCode, binding.node),
    };
    const asserted = state.assertions.some(
      (call) =>
        assertionCondition(call) !== null &&
        variableReferencedWithin(
          target.variable,
          assertionCondition(call),
        ) &&
        !(
          options.ignoreTypeOnlyAssertions &&
          isTypeOnlyAssertion(call, target, sourceCode)
        ),
    );
    if (asserted) continue;
    context.report({
      data: { name: binding.name },
      messageId: "unassertedParameter",
      node: binding.node,
    });
  }
};

const reportReturns = (context, state, sourceCode, options) => {
  if (!options.checkReturns || state.skipReturns) return;
  for (const returnNode of state.returns) {
    const returned = unwrapReturnedExpression(returnNode.argument);
    if (!returned || isStaticReturn(returned)) continue;
    if (returnIsAsserted(state, returned, returnNode.node, sourceCode, options)) {
      continue;
    }
    const hasNamedTarget =
      returned.type === "Identifier" || staticMemberPath(returned) !== null;
    context.report({
      data: {
        guidance: hasNamedTarget
          ? "Assert a semantic postcondition before this return."
          : "Assign the computed value to a local binding, assert a semantic postcondition, then return it.",
        value: sourceCode.getText(returned),
      },
      messageId: "unassertedReturn",
      node: returnNode.node,
    });
  }
};

const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require runtime assertions for every function parameter and returned value",
      url: "https://github.com/tigerbeetle/tigerbeetle/blob/main/docs/TIGER_STYLE.md",
    },
    messages: {
      unassertedParameter:
        "Parameter '{{name}}' needs a runtime assertion that checks a semantic precondition beyond its TypeScript type.",
      unassertedReturn:
        "Returned value '{{value}}' needs a dominating runtime assertion that checks a semantic postcondition beyond its TypeScript type. {{guidance}}",
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
          assertionNames: {
            type: "array",
            minItems: 1,
            items: { type: "string" },
          },
          checkParameters: { type: "boolean", default: true },
          checkReturns: { type: "boolean", default: true },
          ignoreTypeOnlyAssertions: { type: "boolean", default: true },
        },
      },
    ],
  },
  create(context) {
    const configured = context.options[0] ?? {};
    const options = {
      checkParameters: configured.checkParameters !== false,
      checkReturns: configured.checkReturns !== false,
      ignoreTypeOnlyAssertions:
        configured.ignoreTypeOnlyAssertions !== false,
    };
    const assertionNames = assertionNameSet(configured.assertionNames);
    const sourceCode = context.sourceCode;
    const functionStack = [];

    return {
      ":function"(node) {
        functionStack.push({
          assertions: [],
          bindings: node.params.flatMap((parameter) =>
            collectBindings(parameter),
          ),
          node,
          returnType: node.returnType?.typeAnnotation ?? null,
          returns:
            node.body.type === "BlockStatement"
              ? []
              : [{ argument: node.body, node: node.body }],
          skipReturns: node.generator === true,
        });
      },
      ":function:exit"() {
        const state = functionStack.pop();
        if (!state) return;
        reportParameters(context, state, sourceCode, options);
        reportReturns(context, state, sourceCode, options);
      },
      CallExpression(node) {
        const state = functionStack.at(-1);
        if (state && isAssertionCall(node, assertionNames)) {
          state.assertions.push(node);
        }
      },
      ReturnStatement(node) {
        const state = functionStack.at(-1);
        if (state) state.returns.push({ argument: node.argument, node });
      },
    };
  },
};

export default rule;
