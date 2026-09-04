export const defaultAssertionNames = [
  "assert",
  "assertDefined",
  "nodeAssert",
  "nodeAssert.ok",
];

export const calleeName = (node) => {
  if (node.type === "Identifier") return node.name;
  if (node.type !== "MemberExpression" || node.computed) return undefined;

  const objectName = calleeName(node.object);
  if (!objectName || node.property.type !== "Identifier") return undefined;
  return `${objectName}.${node.property.name}`;
};

export const assertionNameSet = (configuredNames) =>
  new Set(configuredNames ?? defaultAssertionNames);

/** Walks up the scope chain from `identifier` to find its declaring variable. */
export const findVariable = (sourceCode, identifier) => {
  let scope = sourceCode.getScope(identifier);
  while (scope) {
    const variable = scope.set.get(identifier.name);
    if (variable) return variable;
    scope = scope.upper;
  }
  return null;
};

// Conservative allow-list of module specifiers that mean "this is an
// assertion/invariant helper" - either an exact well-known specifier, or one
// whose last path segment names the concept (`./utils/assert`,
// `@app/invariant`, `../shared/assertions`).
const exactAssertionModules = new Set([
  "assert",
  "node:assert",
  "node:assert/strict",
  "assert/strict",
  "tiny-invariant",
  "invariant",
]);
const assertionModuleLastSegments = new Set([
  "assert",
  "asserts",
  "assertions",
  "invariant",
]);

export const isAssertionModuleSource = (source) => {
  if (typeof source !== "string") return false;
  if (exactAssertionModules.has(source)) return true;
  const lastSegment = source
    .split("/")
    .pop()
    .replace(/\.(?:[cm]?[jt]sx?)$/u, "");
  return assertionModuleLastSegments.has(lastSegment);
};

// Resolves one level of local aliasing (`const a = nodeAssert;`) so that
// `a.ok(x)` still traces back to the original import.
const resolveAliasedVariable = (sourceCode, identifier, followedAlias) => {
  const variable = findVariable(sourceCode, identifier);
  const def = variable?.defs[0];
  if (!def) return null;
  if (def.type === "ImportBinding") return { def, variable };
  if (
    !followedAlias &&
    def.type === "Variable" &&
    def.node.type === "VariableDeclarator" &&
    def.node.init?.type === "Identifier"
  ) {
    return resolveAliasedVariable(sourceCode, def.node.init, true);
  }
  return { def, variable };
};

/** True when `identifier` resolves (through one alias hop) to an import from an assertion module. */
export const isAssertionImportIdentifier = (identifier, sourceCode) => {
  const resolved = resolveAliasedVariable(sourceCode, identifier, false);
  if (!resolved || resolved.def.type !== "ImportBinding") return false;
  return isAssertionModuleSource(resolved.def.parent.source.value);
};

const hasAssertsPredicate = (node) => {
  const fnNode = node?.type === "VariableDeclarator" ? node.init : node;
  const returnType = fnNode?.returnType?.typeAnnotation;
  return returnType?.type === "TSTypePredicate" && returnType.asserts === true;
};

/** True when `identifier` resolves to a function (any declaration form, incl. TS overloads) with an `asserts` return predicate. */
export const isAssertsFunctionIdentifier = (identifier, sourceCode) => {
  const variable = findVariable(sourceCode, identifier);
  if (!variable) return false;
  return variable.defs.some((def) => hasAssertsPredicate(def.node));
};

const calleeRootIdentifier = (node) => {
  if (node.type === "Identifier") return node;
  if (node.type === "MemberExpression" && !node.computed) {
    return calleeRootIdentifier(node.object);
  }
  return null;
};

/**
 * True when `node` (a CallExpression) is an assertion call, either because:
 * - its callee's exact printed name is in `assertionNames` (textual, as before), or
 * - (when `sourceCode` is given) it resolves structurally to an assertion
 *   import, a local alias of one, or a locally declared `asserts` function.
 */
export const isAssertionCall = (node, assertionNames, sourceCode) => {
  const name = calleeName(node.callee);
  if (name !== undefined && assertionNames.has(name)) return true;
  if (!sourceCode) return false;

  if (
    node.callee.type === "Identifier" &&
    isAssertsFunctionIdentifier(node.callee, sourceCode)
  ) {
    return true;
  }

  const root = calleeRootIdentifier(node.callee);
  if (root && isAssertionImportIdentifier(root, sourceCode)) return true;

  return false;
};
