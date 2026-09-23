import { dependencyPropertyName } from "./dependency-helpers.js";

const docsUrl = "https://www.evolu.dev/docs/dependency-injection";

const wrapperName = (node) =>
  node.id?.type === "Identifier" && node.id.name.endsWith("Dep")
    ? node.id.name
    : null;

const wrapperMembers = (node) => {
  if (node.type === "TSInterfaceDeclaration") return node.body.body;
  if (
    node.type === "TSTypeAliasDeclaration" &&
    node.typeAnnotation.type === "TSTypeLiteral"
  ) {
    return node.typeAnnotation.members;
  }
  return null;
};

const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require Evolu-style dependency wrappers with one readonly, distinctly named member",
      url: docsUrl,
    },
    messages: {
      noGenericWrapper:
        "Dependency wrapper '{{name}}' must not declare generic type parameters.",
      propertyName:
        "Dependency wrapper '{{name}}' must expose one readonly property named '{{property}}'.",
      propertyType:
        "Dependency wrapper '{{name}}' must wrap the '{{typeName}}' dependency type.",
      singleProperty:
        "Dependency wrapper '{{name}}' must contain exactly one property to avoid dependency name clashes.",
    },
    schema: [],
  },
  create(context) {
    const inspect = (node) => {
      const name = wrapperName(node);
      if (!name) return;

      if (node.typeParameters?.params.length > 0) {
        context.report({
          data: { name },
          messageId: "noGenericWrapper",
          node: node.typeParameters,
        });
      }

      const members = wrapperMembers(node);
      if (!members) return;
      if (members.length !== 1) {
        context.report({ data: { name }, messageId: "singleProperty", node });
        return;
      }

      const [member] = members;
      const property = dependencyPropertyName(name);
      const typeName = name.slice(0, -"Dep".length);
      if (
        member.type !== "TSPropertySignature" ||
        member.computed ||
        member.key.type !== "Identifier" ||
        member.key.name !== property ||
        !member.readonly
      ) {
        context.report({
          data: { name, property },
          messageId: "propertyName",
          node: member,
        });
        return;
      }

      const memberType = member.typeAnnotation?.typeAnnotation;
      if (
        memberType?.type !== "TSTypeReference" ||
        memberType.typeName.type !== "Identifier" ||
        memberType.typeName.name !== typeName
      ) {
        context.report({
          data: { name, typeName },
          messageId: "propertyType",
          node: member,
        });
      }
    };

    return {
      TSInterfaceDeclaration: inspect,
      TSTypeAliasDeclaration: inspect,
    };
  },
};

export default rule;
