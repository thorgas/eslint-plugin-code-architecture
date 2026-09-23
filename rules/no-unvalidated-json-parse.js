import { minimatch } from "minimatch";

const calleeName = (node) => {
  if (node.type === "Identifier") return node.name;
  if (node.type === "CallExpression") return calleeName(node.callee);
  if (node.type !== "MemberExpression" || node.computed) return undefined;

  const objectName = calleeName(node.object);
  if (!objectName || node.property.type !== "Identifier") return undefined;
  return `${objectName}.${node.property.name}`;
};

const isJsonParse = (node) => calleeName(node.callee) === "JSON.parse";

const isValidationCall = (name, validationCalls) => {
  if (!name) return false;
  return validationCalls.some((pattern) =>
    minimatch(name, pattern, { dot: true, matchBase: false }),
  );
};

const returnedExpression = (node) => {
  if (
    node.type !== "ArrowFunctionExpression" &&
    node.type !== "FunctionExpression"
  ) {
    return undefined;
  }
  if (node.body.type !== "BlockStatement") return node.body;

  const returnStatement = node.body.body.find(
    (statement) => statement.type === "ReturnStatement",
  );
  return returnStatement?.argument ?? undefined;
};

const callsValidationWith = (
  root,
  parameterName,
  validationCalls,
  visitorKeys,
) => {
  const pending = [root];

  while (pending.length > 0) {
    const current = pending.pop();
    if (!current) continue;
    if (
      current.type === "ArrowFunctionExpression" ||
      current.type === "FunctionExpression"
    ) {
      continue;
    }

    if (
      current.type === "CallExpression" &&
      isValidationCall(calleeName(current.callee), validationCalls) &&
      current.arguments.some(
        (argument) =>
          argument.type === "Identifier" && argument.name === parameterName,
      )
    ) {
      return true;
    }

    for (const key of visitorKeys[current.type] ?? []) {
      const child = current[key];
      if (Array.isArray(child)) {
        pending.push(...child);
      } else if (child?.type) {
        pending.push(child);
      }
    }
  }

  return false;
};

const hasPipelineValidation = (node, validationCalls, visitorKeys) => {
  let child = node;
  let current = node.parent;

  while (current) {
    if (
      current.type === "CallExpression" &&
      current.callee.type === "MemberExpression" &&
      !current.callee.computed &&
      current.callee.property.type === "Identifier" &&
      current.callee.property.name === "pipe"
    ) {
      const parsingStage =
        child === current.callee ? -1 : current.arguments.indexOf(child);

      for (const [operatorIndex, operator] of current.arguments.entries()) {
        if (
          operatorIndex <= parsingStage ||
          operator.type !== "CallExpression" ||
          calleeName(operator.callee) !== "Effect.flatMap"
        ) {
          continue;
        }

        const handler = operator.arguments.at(-1);
        const expression = handler ? returnedExpression(handler) : undefined;
        const parameter = handler?.params?.[0];
        if (
          expression &&
          parameter?.type === "Identifier" &&
          callsValidationWith(
            expression,
            parameter.name,
            validationCalls,
            visitorKeys,
          )
        ) {
          return true;
        }
      }
    }

    child = current;
    current = current.parent;
  }

  return false;
};

const findContainingBinding = (node) => {
  let current = node.parent;

  while (current) {
    if (
      current.type === "VariableDeclarator" &&
      current.id.type === "Identifier"
    ) {
      return current;
    }
    if (/Statement$/u.test(current.type)) return undefined;
    current = current.parent;
  }

  return undefined;
};

const isEffectTryCallback = (node) => {
  const property = node.parent;
  const object = property?.parent;
  const call = object?.parent;

  return (
    property?.type === "Property" &&
    property.value === node &&
    !property.computed &&
    property.key.type === "Identifier" &&
    property.key.name === "try" &&
    object?.type === "ObjectExpression" &&
    call?.type === "CallExpression" &&
    ["Effect.try", "Effect.tryPromise"].includes(calleeName(call.callee))
  );
};

const bindingReceivesParsedValue = (node, declarator) => {
  let current = node.parent;

  while (current && current !== declarator) {
    if (
      (current.type === "ArrowFunctionExpression" ||
        current.type === "FunctionExpression") &&
      !isEffectTryCallback(current)
    ) {
      return false;
    }
    current = current.parent;
  }

  return current === declarator;
};

const findVariable = (scope, name) => {
  let current = scope;

  while (current) {
    const variable = current.set.get(name);
    if (variable) return variable;
    current = current.upper;
  }

  return undefined;
};

const isGuardCondition = (identifier) => {
  let child = identifier;
  let current = identifier.parent;

  while (current) {
    if (current.type === "IfStatement" && current.test === child) return true;
    if (current.type === "ConditionalExpression" && current.test === child) {
      return true;
    }
    if (current.type === "WhileStatement" && current.test === child) {
      return true;
    }
    if (current.type === "UnaryExpression" && current.operator === "!") {
      child = current;
      current = current.parent;
      continue;
    }
    if (current.type === "LogicalExpression") {
      child = current;
      current = current.parent;
      continue;
    }
    return false;
  }

  return false;
};

const isValidationArgument = (identifier, validationCalls) => {
  const call = identifier.parent;
  return (
    call?.type === "CallExpression" &&
    isValidationCall(calleeName(call.callee), validationCalls) &&
    call.arguments.includes(identifier)
  );
};

const hasSingleValidatedReference = (node, validationCalls, sourceCode) => {
  const declarator = findContainingBinding(node);
  if (!declarator || declarator.id.type !== "Identifier") return false;
  if (!bindingReceivesParsedValue(node, declarator)) return false;

  const variable = findVariable(
    sourceCode.getScope(declarator),
    declarator.id.name,
  );
  const references = variable?.references.filter(
    (reference) => reference.identifier !== declarator.id,
  );
  if (!references || references.length === 0) return false;

  const validatingReference = references.find((reference) =>
    isValidationArgument(reference.identifier, validationCalls),
  );
  if (!validatingReference) return false;

  const validatingStart = validatingReference.identifier.range[0];

  return references.every(
    (reference) =>
      reference === validatingReference ||
      (isGuardCondition(reference.identifier) &&
        reference.identifier.range[0] < validatingStart),
  );
};

const hasValidationAncestor = (node, validationCalls, maximumDepth) => {
  let current = node.parent;
  let depth = 0;

  while (current && depth < maximumDepth) {
    if (
      current.type === "CallExpression" &&
      isValidationCall(calleeName(current.callee), validationCalls)
    ) {
      return true;
    }

    current = current.parent;
    depth += 1;
  }

  return false;
};

const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require JSON.parse results to be validated by an approved runtime schema decoder",
      url: "https://effect.website/llms-full.txt",
    },
    messages: {
      unvalidatedParse:
        "JSON.parse returns unknown external data. Wrap it in an approved schema decoder before using it.",
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
          maximumAncestorDepth: { type: "integer", minimum: 1, default: 12 },
          validationCalls: {
            type: "array",
            minItems: 1,
            items: { type: "string" },
          },
        },
      },
    ],
  },
  create(context) {
    const options = context.options[0] ?? {};
    const validationCalls =
      options.validationCalls ?? [
        "Schema.decode",
        "Schema.decodeSync",
        "Schema.decodeUnknown",
        "Schema.decodeUnknownSync",
        "Schema.parseJson",
        "Schema.transform",
        "*.parse",
        "*.safeParse",
        "*.parseAsync",
        "*.safeParseAsync",
        "*.decode",
        "*.decodeUnknownSync",
        "*.decodeUnknown",
        "*.assert",
        "*.validate",
      ];
    const maximumDepth = options.maximumAncestorDepth ?? 12;
    const sourceCode = context.sourceCode;
    const visitorKeys = sourceCode.visitorKeys;

    return {
      CallExpression(node) {
        if (!isJsonParse(node)) return;
        if (hasValidationAncestor(node, validationCalls, maximumDepth)) return;
        if (hasPipelineValidation(node, validationCalls, visitorKeys)) return;
        if (hasSingleValidatedReference(node, validationCalls, sourceCode))
          return;
        context.report({ node, messageId: "unvalidatedParse" });
      },
    };
  },
};

export default rule;
