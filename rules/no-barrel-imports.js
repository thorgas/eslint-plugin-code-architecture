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
          packages: { type: "array", items: { type: "string" } },
        },
      },
    ],
  },
  create(context) {
    const options = context.options[0] ?? {};
    const packages = new Set(options.packages ?? []);

    const inspectSource = (node, sourceNode) => {
      if (typeof sourceNode?.value !== "string") return;
      const source = sourceNode.value;

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
