export const staticMemberPath = (node) => {
  if (node.type === "Identifier") return node.name;
  if (node.type !== "MemberExpression" || node.computed) return null;
  const object = staticMemberPath(node.object);
  if (!object || node.property.type !== "Identifier") return null;
  return `${object}.${node.property.name}`;
};

export const variableWrittenBetween = (variable, start, end) =>
  variable?.references.some(
    (reference) =>
      reference.isWrite() &&
      reference.identifier.range[0] > start.range[0] &&
      reference.identifier.range[0] < end.range[0],
  ) ?? false;

const writeTarget = (node) => {
  let current = node;
  while (
    current.parent?.type === "MemberExpression" &&
    current.parent.object === current
  ) {
    current = current.parent;
  }
  const parent = current.parent;
  if (parent?.type === "AssignmentExpression" && parent.left === current) {
    return current;
  }
  if (parent?.type === "UpdateExpression" && parent.argument === current) {
    return current;
  }
  if (
    parent?.type === "UnaryExpression" &&
    parent.operator === "delete" &&
    parent.argument === current
  ) {
    return current;
  }
  return null;
};

export const memberWrittenBetween = (variable, returnedPath, start, end) =>
  variable?.references.some(({ identifier }) => {
    if (
      identifier.range[0] <= start.range[0] ||
      identifier.range[0] >= end.range[0]
    ) {
      return false;
    }
    const target = writeTarget(identifier);
    const writtenPath = target && staticMemberPath(target);
    if (!writtenPath || writtenPath === identifier.name) return false;
    if (!returnedPath) return true;
    return (
      writtenPath === returnedPath ||
      writtenPath.startsWith(`${returnedPath}.`) ||
      returnedPath.startsWith(`${writtenPath}.`)
    );
  }) ?? false;
