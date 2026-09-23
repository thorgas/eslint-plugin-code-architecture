import {
  compositionRootSchema,
  isCompositionRoot,
} from "./composition-root-helpers.js";

const docsUrl = "https://www.evolu.dev/docs/dependency-injection";

/**
 * Built-in capability groups. Each group names the ambient global access that
 * makes a function depend on the outside world, the dependency contract that
 * should replace it, and the replacement expression to suggest.
 *
 * Selector forms:
 * - `Object.member` – a member read on a global object.
 * - `Object.*` – every member read on a global object.
 * - `identifier` – a bare global value reference such as `fetch`.
 * - `new Identifier()` – a zero-argument constructor call (`new Date()`).
 * - `new Identifier` – any constructor call (`new WebSocket(url)`).
 */
export const capabilityGroups = {
  environment: {
    dependency: "ConfigDep",
    replacement: "deps.config",
    selectors: ["process.env"],
  },
  locale: {
    dependency: "LocaleDep",
    replacement: "deps.locale",
    selectors: ["Intl.*", "navigator.language", "navigator.languages"],
  },
  logging: {
    dependency: "LoggerDep",
    replacement: "deps.logger",
    selectors: ["console.*"],
  },
  network: {
    dependency: "FetchDep",
    replacement: "deps.fetch",
    selectors: [
      "fetch",
      "navigator.onLine",
      "navigator.sendBeacon",
      "new WebSocket",
      "new XMLHttpRequest",
    ],
  },
  randomness: {
    dependency: "RandomDep",
    replacement: "deps.random",
    selectors: ["Math.random", "crypto.randomUUID", "crypto.getRandomValues"],
  },
  storage: {
    dependency: "StorageDep",
    replacement: "deps.storage",
    selectors: [
      "document.cookie",
      "indexedDB.*",
      "localStorage.*",
      "sessionStorage.*",
    ],
  },
  time: {
    dependency: "TimeDep",
    replacement: "deps.time.now()",
    selectors: ["Date.now", "new Date()", "performance.now"],
  },
};

const groupNames = Object.keys(capabilityGroups);

const identifierPattern = "[A-Za-z_$][A-Za-z0-9_$]*";
const selectorPattern = `^(?:new ${identifierPattern}(?:\\(\\))?|${identifierPattern}(?:\\.(?:\\*|${identifierPattern}))?)$`;

const parseSelector = (selector) => {
  const constructorMatch = /^new (\S+?)(\(\))?$/u.exec(selector);
  if (constructorMatch) {
    return {
      kind: "constructor",
      object: constructorMatch[1],
      zeroArguments: constructorMatch[2] === "()",
    };
  }
  const [object, property] = selector.split(".");
  if (property === undefined) return { kind: "bare", object };
  return { kind: "member", object, property };
};

const dependencyBaseName = (dependency) =>
  dependency.endsWith("Dep") ? dependency.slice(0, -"Dep".length) : dependency;

const derivedFactories = (dependency) => {
  const base = dependencyBaseName(dependency);
  return [`create${base}`, `createTest${base}`];
};

const buildCapabilities = (options) => {
  const groups = options.groups ?? groupNames;
  const builtIn = groups.flatMap((groupName) => {
    const group = capabilityGroups[groupName];
    return group.selectors.map((selector) => ({
      dependency: group.dependency,
      factories: [],
      group: groupName,
      replacement: group.replacement,
      selector,
    }));
  });
  const custom = (options.capabilities ?? []).map((capability) => ({
    factories: [],
    ...capability,
  }));
  return [...builtIn, ...custom].map((capability) => ({
    ...capability,
    ...parseSelector(capability.selector),
    factories: [
      ...derivedFactories(capability.dependency),
      ...capability.factories,
    ],
  }));
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
  if (parent?.type === "MethodDefinition" && parent.key.type === "Identifier") {
    return parent.key.name;
  }
  return null;
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

const memberName = (node) => {
  if (!node.computed && node.property.type === "Identifier") {
    return node.property.name;
  }
  if (node.computed && node.property.type === "Literal") {
    return String(node.property.value);
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

/**
 * Collects every identifier that references a global value binding: either an
 * unresolved reference or one resolved to a declared global with no local
 * definition. Type-only references are excluded.
 */
const collectGlobalValueReferences = (globalScope) => {
  const identifiers = new Set();
  const record = (reference) => {
    if (reference.isValueReference === false) return;
    identifiers.add(reference.identifier);
  };
  for (const reference of globalScope.through) record(reference);
  for (const variable of globalScope.variables) {
    if (variable.defs.length > 0) continue;
    for (const reference of variable.references) record(reference);
  }
  return identifiers;
};

const optionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    ...compositionRootSchema,
    groups: {
      type: "array",
      uniqueItems: true,
      items: { type: "string", enum: groupNames },
    },
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
          selector: { type: "string", pattern: selectorPattern },
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
  return {
    capabilities: buildCapabilities(options),
    dependencyFactories: new Set(options.dependencyFactories ?? []),
    functionStack: [],
    globalReferences: new Set(),
    isCompositionRoot: isCompositionRoot(context, options),
    serviceLocatorOptions: options.serviceLocators ?? [],
    serviceLocators: new Map(),
    sourceCode: context.sourceCode,
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

const findCapability = (state, kind, object, property, predicate = () => true) =>
  state.capabilities.find(
    (candidate) =>
      candidate.kind === kind &&
      candidate.object === object &&
      (kind !== "member" ||
        candidate.property === "*" ||
        candidate.property === property) &&
      predicate(candidate),
  );

const inspectMember = (context, state, node) => {
  if (
    node.object.type !== "Identifier" ||
    !state.globalReferences.has(node.object)
  ) {
    return;
  }
  const property = memberName(node);
  if (property === null) return;
  const capability = findCapability(state, "member", node.object.name, property);
  if (!capability || isAllowed(state, capability.factories)) return;
  reportCapability(context, capability, node);
};

const inspectDestructuring = (context, state, node) => {
  if (
    node.id.type !== "ObjectPattern" ||
    node.init?.type !== "Identifier" ||
    !state.globalReferences.has(node.init)
  ) {
    return;
  }
  for (const propertyNode of node.id.properties) {
    if (propertyNode.type !== "Property") continue;
    const property =
      propertyNode.key.type === "Identifier"
        ? propertyNode.key.name
        : String(propertyNode.key.value);
    const capability = findCapability(
      state,
      "member",
      node.init.name,
      property,
    );
    if (!capability || isAllowed(state, capability.factories)) continue;
    reportCapability(context, capability, propertyNode);
  }
};

const inspectBareGlobal = (context, state, node) => {
  if (!state.globalReferences.has(node)) return;
  if (node.parent?.type === "NewExpression" && node.parent.callee === node) {
    return;
  }
  const capability = findCapability(state, "bare", node.name);
  if (!capability || isAllowed(state, capability.factories)) return;
  reportCapability(context, capability, node);
};

const inspectConstructor = (context, state, node) => {
  if (
    node.callee.type !== "Identifier" ||
    !state.globalReferences.has(node.callee)
  ) {
    return;
  }
  const capability = findCapability(
    state,
    "constructor",
    node.callee.name,
    null,
    (candidate) => !candidate.zeroArguments || node.arguments.length === 0,
  );
  if (!capability || isAllowed(state, capability.factories)) return;
  reportCapability(context, capability, node);
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
      Program(node) {
        state.globalReferences = collectGlobalValueReferences(
          state.sourceCode.getScope(node),
        );
      },
      ":function"(node) {
        state.functionStack.push(functionName(node));
      },
      ":function:exit"() {
        state.functionStack.pop();
      },
      Identifier(node) {
        inspectServiceLocator(context, state, node);
        inspectBareGlobal(context, state, node);
      },
      ImportDeclaration: (node) => recordServiceLocators(state, node),
      MemberExpression: (node) => inspectMember(context, state, node),
      NewExpression: (node) => inspectConstructor(context, state, node),
      VariableDeclarator: (node) =>
        inspectDestructuring(context, state, node),
    };
  },
};

export default rule;
