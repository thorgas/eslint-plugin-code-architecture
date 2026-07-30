import path from "node:path";
import { minimatch } from "minimatch";

const docsUrl = "https://www.evolu.dev/docs/dependency-injection";

const defaultCapabilities = [
  {
    dependency: "TimeDep",
    factories: ["createTestTime", "createTime"],
    replacement: "deps.time.now()",
    selector: "Date.now",
  },
  {
    dependency: "LoggerDep",
    factories: ["createLogger", "createTestLogger"],
    replacement: "deps.logger",
    selector: "console.*",
  },
];

const normalizePath = (value) => value.split(path.sep).join("/");

const resolveRoot = (configuredRoot) => {
  if (!configuredRoot) return process.cwd();
  if (path.isAbsolute(configuredRoot)) return configuredRoot;
  return path.resolve(process.cwd(), configuredRoot);
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

const isGlobalIdentifier = (sourceCode, identifier) => {
  const variable = findVariable(sourceCode, identifier);
  return variable === null || variable.defs.length === 0;
};

const memberName = (node) => {
  if (!node.computed && node.property.type === "Identifier") {
    return node.property.name;
  }
  if (node.computed && node.property.type === "Literal") {
    return String(node.property.value);
  }
  return null;
};

const functionName = (node) => {
  if (node.id?.type === "Identifier") return node.id.name;

  let current = node;
  while (
    current.parent &&
    ["TSAsExpression", "TSSatisfiesExpression"].includes(current.parent.type)
  ) {
    current = current.parent;
  }
  const parent = current.parent;
  if (parent?.type === "VariableDeclarator" && parent.id.type === "Identifier") {
    return parent.id.name;
  }
  if (
    parent?.type === "Property" &&
    !parent.computed &&
    parent.key.type === "Identifier"
  ) {
    return parent.key.name;
  }
  return null;
};

const importedName = (specifier) => {
  if (specifier.type === "ImportDefaultSpecifier") return "default";
  if (specifier.type === "ImportNamespaceSpecifier") return "*";
  if (specifier.imported.type === "Identifier") return specifier.imported.name;
  return String(specifier.imported.value);
};

const isImportIdentifier = (node) =>
  node.parent?.type === "ImportSpecifier" ||
  node.parent?.type === "ImportDefaultSpecifier" ||
  node.parent?.type === "ImportNamespaceSpecifier";

const optionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    root: { type: "string" },
    compositionRoots: { type: "array", items: { type: "string" } },
    dependencyFactories: { type: "array", items: { type: "string" } },
    capabilities: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["dependency", "replacement", "selector"],
        properties: {
          dependency: { type: "string" },
          factories: { type: "array", items: { type: "string" } },
          replacement: { type: "string" },
          selector: {
            type: "string",
            pattern: "^[A-Za-z_$][A-Za-z0-9_$]*\\.(?:\\*|[A-Za-z_$][A-Za-z0-9_$]*)$",
          },
        },
      },
    },
    serviceLocators: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["dependency", "imports", "module", "replacement"],
        properties: {
          dependency: { type: "string" },
          imports: {
            type: "array",
            minItems: 1,
            items: { type: "string" },
          },
          module: { type: "string" },
          replacement: { type: "string" },
        },
      },
    },
  },
};

const createState = (context) => {
  const options = context.options[0] ?? {};
  const sourceCode = context.sourceCode;
  const root = resolveRoot(options.root);
  const filename = normalizePath(
    path.relative(root, path.resolve(context.filename)),
  );
  const isCompositionRoot = (options.compositionRoots ?? []).some((pattern) =>
    minimatch(filename, pattern, { dot: true, matchBase: false }),
  );
  const capabilities = (options.capabilities ?? defaultCapabilities).map(
    (capability) => {
      const [object, property] = capability.selector.split(".");
      return { ...capability, object, property };
    },
  );

  return {
    capabilities,
    dependencyFactories: new Set(options.dependencyFactories ?? []),
    functionStack: [],
    isCompositionRoot,
    serviceLocatorOptions: options.serviceLocators ?? [],
    serviceLocators: new Map(),
    sourceCode,
  };
};

const isAllowed = (state, factories = []) =>
  state.isCompositionRoot ||
  state.functionStack.some(
    (name) =>
      name !== null &&
      (state.dependencyFactories.has(name) || factories.includes(name)),
  );

const reportCapability = (context, capability, node) => {
  context.report({
    data: {
      dependency: capability.dependency,
      replacement: capability.replacement,
      selector: capability.selector,
    },
    messageId: "implicitGlobal",
    node,
  });
};

const inspectMember = (context, state, node) => {
  if (node.object.type !== "Identifier") return;
  const property = memberName(node);
  if (property === null) return;

  const capability = state.capabilities.find(
    (candidate) =>
      candidate.object === node.object.name &&
      (candidate.property === "*" || candidate.property === property),
  );
  if (
    !capability ||
    !isGlobalIdentifier(state.sourceCode, node.object) ||
    isAllowed(state, capability.factories)
  ) {
    return;
  }
  reportCapability(context, capability, node);
};

const inspectDestructuring = (context, state, node) => {
  if (
    node.id.type !== "ObjectPattern" ||
    node.init?.type !== "Identifier" ||
    !isGlobalIdentifier(state.sourceCode, node.init)
  ) {
    return;
  }
  for (const propertyNode of node.id.properties) {
    if (propertyNode.type !== "Property") continue;
    const property =
      propertyNode.key.type === "Identifier"
        ? propertyNode.key.name
        : String(propertyNode.key.value);
    const capability = state.capabilities.find(
      (candidate) =>
        candidate.object === node.init.name &&
        (candidate.property === "*" || candidate.property === property),
    );
    if (!capability || isAllowed(state, capability.factories)) continue;
    reportCapability(context, capability, propertyNode);
  }
};

const recordServiceLocators = (state, node) => {
  if (node.importKind === "type") return;
  const source = String(node.source.value);
  const configurations = state.serviceLocatorOptions.filter(
    (configuration) => configuration.module === source,
  );
  for (const specifier of node.specifiers) {
    if (specifier.importKind === "type") continue;
    const imported = importedName(specifier);
    const configuration = configurations.find(({ imports }) =>
      imports.includes(imported),
    );
    if (!configuration) continue;
    state.serviceLocators.set(specifier.local.name, {
      configuration,
      imported,
      variable: findVariable(state.sourceCode, specifier.local),
    });
  }
};

const inspectServiceLocator = (context, state, node) => {
  if (isImportIdentifier(node) || isAllowed(state)) return;
  const locator = state.serviceLocators.get(node.name);
  if (
    !locator ||
    findVariable(state.sourceCode, node) !== locator.variable ||
    !locator.variable?.references.some(
      (reference) => reference.identifier === node,
    )
  ) {
    return;
  }
  context.report({
    data: {
      dependency: locator.configuration.dependency,
      imported: locator.imported,
      module: locator.configuration.module,
      replacement: locator.configuration.replacement,
    },
    messageId: "importedServiceLocator",
    node,
  });
};

const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require external capabilities to enter application code through dependency injection",
      url: docsUrl,
    },
    messages: {
      implicitGlobal:
        "{{selector}} is an implicit external dependency. Inject {{dependency}} and use {{replacement}}, or move this access into an allowed dependency factory or composition root.",
      importedServiceLocator:
        "Imported {{imported}} from '{{module}}' is an implicit service locator. Inject {{dependency}} and use {{replacement}}, or limit this access to an allowed dependency factory or composition root.",
    },
    schema: [optionSchema],
  },
  create(context) {
    const state = createState(context);

    return {
      ":function"(node) {
        state.functionStack.push(functionName(node));
      },
      ":function:exit"() {
        state.functionStack.pop();
      },
      Identifier: (node) => inspectServiceLocator(context, state, node),
      ImportDeclaration: (node) => recordServiceLocators(state, node),
      MemberExpression: (node) => inspectMember(context, state, node),
      VariableDeclarator: (node) =>
        inspectDestructuring(context, state, node),
    };
  },
};

export default rule;
