const dependencyNamePattern = /^[A-Z][A-Za-z0-9]*Dep$/u;

export const dependencyPropertyName = (dependencyName) => {
  const baseName = dependencyName.slice(0, -"Dep".length);
  return `${baseName.charAt(0).toLowerCase()}${baseName.slice(1)}`;
};

const dependencyReference = (node, optional = false) => {
  if (
    node?.type !== "TSTypeReference" ||
    node.typeName.type !== "Identifier"
  ) {
    return null;
  }

  if (dependencyNamePattern.test(node.typeName.name)) {
    return {
      name: node.typeName.name,
      node,
      optional,
      property: dependencyPropertyName(node.typeName.name),
    };
  }

  if (
    node.typeName.name === "Partial" &&
    node.typeArguments?.params.length === 1
  ) {
    return dependencyReference(node.typeArguments.params[0], true);
  }

  return null;
};

export const dependencyReferences = (typeNode) => {
  if (!typeNode) return [];

  if (typeNode.type === "TSIntersectionType") {
    return typeNode.types.flatMap(dependencyReferences);
  }

  const reference = dependencyReference(typeNode);
  return reference ? [reference] : [];
};

export const parameterType = (parameter) => {
  if (parameter?.type === "TSParameterProperty") {
    return parameterType(parameter.parameter);
  }
  return parameter?.typeAnnotation?.typeAnnotation ?? null;
};

export const dependencyParameter = (node) => {
  for (const parameter of node.params) {
    const references = dependencyReferences(parameterType(parameter));
    if (references.length > 0) return { parameter, references };
  }
  return null;
};
