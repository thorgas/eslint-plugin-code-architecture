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

export const isAssertionCall = (node, assertionNames) => {
  const name = calleeName(node.callee);
  return name !== undefined && assertionNames.has(name);
};
