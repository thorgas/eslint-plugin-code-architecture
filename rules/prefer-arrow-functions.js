import { minimatch } from "minimatch";

const functionName = (node) =>
  node.id?.name ??
  (node.parent?.type === "VariableDeclarator" &&
  node.parent.id.type === "Identifier"
    ? node.parent.id.name
    : undefined);

const isExportedAs = (node, kind) => {
  const parent = node.parent;
  if (kind === "default") return parent?.type === "ExportDefaultDeclaration";
  return parent?.type === "ExportNamedDeclaration";
};

const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Prefer arrow functions while permitting TypeScript overload declarations",
      url: "https://www.evolu.dev/docs/conventions",
    },
    messages: {
      useArrow:
        "Use an arrow function instead of the function keyword. TypeScript overload sets are the documented exception.",
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
          allowDefaultExports: { type: "boolean", default: false },
          allowGenerators: { type: "boolean", default: false },
          allowHoisted: { type: "boolean", default: false },
          allowNamedExports: { type: "boolean", default: false },
          allowRecursive: { type: "boolean", default: false },
          allowedFiles: { type: "array", items: { type: "string" } },
          allowedNames: { type: "array", items: { type: "string" } },
        },
      },
    ],
  },
  create(context) {
    const options = context.options[0] ?? {};
    const declarations = [];
    const overloadedNames = new Set();
    const fileAllowed = (options.allowedFiles ?? []).some((pattern) =>
      minimatch(context.getFilename(), pattern, { matchBase: true }),
    );
    const isAllowed = (node) => {
      if (fileAllowed) return true;
      if (options.allowGenerators && node.generator) return true;
      if (options.allowDefaultExports && isExportedAs(node, "default")) {
        return true;
      }
      if (options.allowNamedExports && isExportedAs(node, "named")) return true;
      const name = functionName(node);
      if (
        name &&
        (options.allowedNames ?? []).some((pattern) => minimatch(name, pattern))
      ) return true;
      const variable = name
        ? context.sourceCode.getScope(node).upper?.set.get(name)
        : null;
      if (
        options.allowRecursive &&
        variable?.references.some(({ identifier }) =>
          identifier.range[0] >= node.range[0] && identifier.range[1] <= node.range[1],
        )
      ) return true;
      return options.allowHoisted && variable?.references.some(
        ({ identifier }) => identifier.range[0] < node.range[0],
      );
    };

    return {
      FunctionDeclaration(node) {
        declarations.push(node);
      },
      TSDeclareFunction(node) {
        if (node.id) overloadedNames.add(node.id.name);
      },
      "Program:exit"() {
        for (const declaration of declarations) {
          if (declaration.id && overloadedNames.has(declaration.id.name)) {
            continue;
          }
          if (isAllowed(declaration)) continue;
          context.report({ messageId: "useArrow", node: declaration });
        }
      },
      FunctionExpression(node) {
        const parentType = node.parent?.type;
        if (
          parentType === "MethodDefinition" ||
          parentType === "TSAbstractMethodDefinition" ||
          (parentType === "Property" &&
            (node.parent.method || node.parent.kind === "get" || node.parent.kind === "set"))
        ) {
          return;
        }
        if (isAllowed(node)) return;
        context.report({ messageId: "useArrow", node });
      },
    };
  },
};

export default rule;
