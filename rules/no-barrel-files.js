import path from "node:path";
import { minimatch } from "minimatch";

const normalizePath = (value) => value.split(path.sep).join("/");

const findVariable = (scope, name) => {
  let current = scope;

  while (current) {
    const variable = current.set.get(name);
    if (variable) return variable;
    current = current.upper;
  }

  return undefined;
};

const isImportBinding = (scope, name) => {
  const variable = findVariable(scope, name);
  return variable?.defs.some((def) => def.type === "ImportBinding") ?? false;
};

const isTypeOnlySpecifier = (declarationExportKind, specifier) =>
  declarationExportKind === "type" || specifier?.exportKind === "type";

const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow re-export barrels that hide dependency edges and inflate module graphs",
      url: "https://marvinh.dev/blog/speeding-up-javascript-ecosystem-part-7/",
    },
    messages: {
      barrelReExport:
        "Do not re-export another module. Import its concrete file directly so dependency edges remain explicit.",
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
          allowFiles: { type: "array", items: { type: "string" } },
          allowTypeExports: { type: "boolean", default: false },
        },
      },
    ],
  },
  create(context) {
    const options = context.options[0] ?? {};
    const allowTypeExports = options.allowTypeExports === true;
    const filename = normalizePath(
      path.relative(process.cwd(), context.filename),
    );
    const isAllowed = (options.allowFiles ?? []).some((pattern) =>
      minimatch(filename, pattern, { dot: true, matchBase: false }),
    );
    if (isAllowed) return {};

    const reportSourcedReExport = (node) => {
      if (!node.source) return;
      if (allowTypeExports && node.exportKind === "type") return;

      if (node.type === "ExportNamedDeclaration" && node.specifiers.length > 0) {
        for (const specifier of node.specifiers) {
          if (allowTypeExports && isTypeOnlySpecifier(node.exportKind, specifier)) {
            continue;
          }
          context.report({ node: specifier, messageId: "barrelReExport" });
        }
        return;
      }

      context.report({ node, messageId: "barrelReExport" });
    };

    const reportImportedBindingReExport = (node) => {
      if (node.source) return;
      if (!node.specifiers || node.specifiers.length === 0) return;

      const scope = context.sourceCode.getScope(node);

      for (const specifier of node.specifiers) {
        if (specifier.type !== "ExportSpecifier") continue;
        if (allowTypeExports && isTypeOnlySpecifier(node.exportKind, specifier)) {
          continue;
        }
        if (!isImportBinding(scope, specifier.local.name)) continue;
        context.report({ node: specifier, messageId: "barrelReExport" });
      }
    };

    return {
      ExportAllDeclaration: reportSourcedReExport,
      ExportNamedDeclaration: (node) => {
        reportSourcedReExport(node);
        reportImportedBindingReExport(node);
      },
    };
  },
};

export default rule;
