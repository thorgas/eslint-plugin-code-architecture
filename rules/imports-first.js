const isImport = (node) =>
  node.type === "ImportDeclaration" ||
  node.type === "TSImportEqualsDeclaration";

const isDirective = (node) =>
  node.type === "ExpressionStatement" && typeof node.directive === "string";

const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Require static imports at the top of each module",
      url: "https://github.com/tigerbeetle/tigerbeetle/blob/main/docs/TIGER_STYLE.md",
    },
    messages: {
      lateImport:
        "Move this import above declarations and executable statements so dependencies are visible at the top of the module.",
    },
    schema: [],
  },
  create(context) {
    return {
      Program(node) {
        let codeSeen = false;

        for (const statement of node.body) {
          if (isDirective(statement)) continue;
          if (isImport(statement)) {
            if (codeSeen) {
              context.report({ node: statement, messageId: "lateImport" });
            }
            continue;
          }
          codeSeen = true;
        }
      },
    };
  },
};

export default rule;
