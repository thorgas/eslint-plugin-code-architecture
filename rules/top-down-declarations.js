const typeDeclaration = (node) =>
  node?.type === "TSInterfaceDeclaration" ||
  node?.type === "TSTypeAliasDeclaration";

const declarationRank = (statement) => {
  if (statement.type === "ImportDeclaration") return null;
  if (statement.type === "ExportNamedDeclaration" && statement.declaration) {
    return typeDeclaration(statement.declaration) ? 0 : 2;
  }
  if (typeDeclaration(statement)) return 1;
  if (
    statement.type.endsWith("Declaration") ||
    statement.type === "VariableDeclaration"
  ) {
    return 3;
  }
  return null;
};

const labels = [
  "exported interfaces and types",
  "supporting interfaces and types",
  "exported implementations",
  "private implementation details",
];

const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Order module declarations from public contract to implementation details",
      url: "https://www.evolu.dev/docs/conventions",
    },
    messages: {
      declarationOrder:
        "Move {{current}} above {{previous}} for top-down readability.",
    },
    schema: [],
  },
  create(context) {
    return {
      Program(node) {
        let highestRank = -1;
        for (const statement of node.body) {
          const rank = declarationRank(statement);
          if (rank === null) continue;
          if (rank < highestRank) {
            context.report({
              data: {
                current: labels[rank],
                previous: labels[highestRank],
              },
              messageId: "declarationOrder",
              node: statement,
            });
            continue;
          }
          highestRank = rank;
        }
      },
    };
  },
};

export default rule;
