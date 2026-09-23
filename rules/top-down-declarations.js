import { minimatch } from "minimatch";

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

const contains = (ancestor, node) =>
  ancestor.range[0] <= node.range[0] && ancestor.range[1] >= node.range[1];

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
    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
          allowedFiles: { type: "array", items: { type: "string" } },
          preserveRuntimeDependencies: { type: "boolean", default: true },
        },
      },
    ],
  },
  create(context) {
    const options = context.options[0] ?? {};
    const preserveRuntimeDependencies =
      options.preserveRuntimeDependencies !== false;
    return {
      Program(node) {
        if (
          (options.allowedFiles ?? []).some((pattern) =>
            minimatch(context.getFilename(), pattern, { matchBase: true }),
          )
        ) return;
        const programScope = context.sourceCode.getScope(node);
        const scope =
          programScope.type === "global"
            ? programScope.childScopes.find(({ type }) => type === "module") ??
              programScope
            : programScope;
        let highestRank = -1;
        for (const statement of node.body) {
          const rank = declarationRank(statement);
          if (rank === null) continue;
          if (rank < highestRank) {
            const dependsOnEarlierRuntimeValue =
              preserveRuntimeDependencies &&
              scope.variables.some((variable) => {
                const definition = variable.defs[0]?.node;
                if (!definition || definition.range[0] >= statement.range[0]) {
                  return false;
                }
                return variable.references.some(({ identifier }) =>
                  contains(statement, identifier),
                );
              });
            if (dependsOnEarlierRuntimeValue) continue;
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
