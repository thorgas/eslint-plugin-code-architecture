import path from "node:path";
import { minimatch } from "minimatch";

const normalizePath = (value) => value.split(path.sep).join("/");

const resolveImport = (filename, source) => {
  if (!source.startsWith(".")) return source;
  return normalizePath(
    path.relative(process.cwd(), path.resolve(path.dirname(filename), source)),
  );
};

// Matched against both the resolved path and the raw specifier, so a package
// barrel can be allowed by its own name ("@scope/core") as well as by path.
const isAllowedBarrel = (allowedBarrels, resolved, source) =>
  allowedBarrels.some(
    (pattern) =>
      minimatch(resolved, pattern, { dot: true, matchBase: false }) ||
      minimatch(source, pattern, { dot: true, matchBase: false }),
  );

const isIndexImport = (source) =>
  /(?:^|\/)index(?:\.[cm]?[jt]sx?)?$/u.test(source);

const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require direct module imports instead of package or local index barrels",
      url: "https://marvinh.dev/blog/speeding-up-javascript-ecosystem-part-7/",
    },
    messages: {
      localBarrel:
        "Do not import an index barrel. Import the concrete module file directly.",
      packageBarrel:
        "Do not import the '{{packageName}}' barrel. Import its documented submodule directly.",
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
          checkLocalIndex: { type: "boolean", default: true },
          allowedBarrels: { type: "array", items: { type: "string" } },
          packages: { type: "array", items: { type: "string" } },
        },
      },
    ],
  },
  create(context) {
    const options = context.options[0] ?? {};
    const packages = new Set(options.packages ?? []);
    const allowedBarrels = options.allowedBarrels ?? [];

    const inspectSource = (node, sourceNode) => {
      if (typeof sourceNode?.value !== "string") return;
      const source = sourceNode.value;

      if (allowedBarrels.length > 0) {
        const resolved = resolveImport(context.filename, source);
        if (isAllowedBarrel(allowedBarrels, resolved, source)) return;
      }

      if (packages.has(source)) {
        context.report({
          node,
          messageId: "packageBarrel",
          data: { packageName: source },
        });
        return;
      }

      if (options.checkLocalIndex !== false && isIndexImport(source)) {
        context.report({ node, messageId: "localBarrel" });
      }
    };

    return {
      ExportAllDeclaration: (node) => inspectSource(node, node.source),
      ExportNamedDeclaration: (node) => inspectSource(node, node.source),
      ImportDeclaration: (node) => inspectSource(node, node.source),
      ImportExpression: (node) => inspectSource(node, node.source),
    };
  },
};

export default rule;
