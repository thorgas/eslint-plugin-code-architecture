const readonlyCollectionNames = new Map([
  ["Array", "ReadonlyArray"],
  ["Map", "ReadonlyMap"],
  ["Record", "Readonly<Record<K, V>>"],
  ["Set", "ReadonlySet"],
]);

const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require readonly interface properties and readonly collection types",
      url: "https://www.evolu.dev/docs/conventions",
    },
    messages: {
      readonlyArray: "Use ReadonlyArray<T> instead of mutable T[].",
      readonlyCollection:
        "Use {{readonlyName}} instead of mutable {{name}}.",
      readonlyProperty: "Prefix interface property '{{name}}' with readonly.",
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
          collectionScope: {
            enum: ["all", "contracts"],
            default: "all",
          },
        },
      },
    ],
  },
  create(context) {
    const collectionScope = context.options[0]?.collectionScope ?? "all";
    const isContractType = (node) => {
      if (collectionScope === "all") return true;
      for (let current = node.parent; current; current = current.parent) {
        if (
          current.type === "TSInterfaceDeclaration" ||
          current.type === "TSTypeAliasDeclaration"
        ) return true;
        if (
          current.type === "VariableDeclarator" ||
          current.type === "FunctionDeclaration" ||
          current.type === "FunctionExpression" ||
          current.type === "ArrowFunctionExpression"
        ) return false;
      }
      return false;
    };
    return {
      TSArrayType(node) {
        if (!isContractType(node)) return;
        context.report({ messageId: "readonlyArray", node });
      },
      TSInterfaceDeclaration(node) {
        for (const member of node.body.body) {
          if (member.type !== "TSPropertySignature" || member.readonly) {
            continue;
          }
          const name =
            member.key.type === "Identifier"
              ? member.key.name
              : context.sourceCode.getText(member.key);
          context.report({
            data: { name },
            messageId: "readonlyProperty",
            node: member,
          });
        }
      },
      TSTypeReference(node) {
        if (!isContractType(node)) return;
        if (node.typeName.type !== "Identifier") return;
        const readonlyName = readonlyCollectionNames.get(node.typeName.name);
        if (!readonlyName) return;
        context.report({
          data: { name: node.typeName.name, readonlyName },
          messageId: "readonlyCollection",
          node,
        });
      },
    };
  },
};

export default rule;
