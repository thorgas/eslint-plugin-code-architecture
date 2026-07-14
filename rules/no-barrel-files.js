import path from "node:path";
import { minimatch } from "minimatch";

const normalizePath = (value) => value.split(path.sep).join("/");

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
        },
      },
    ],
  },
  create(context) {
    const options = context.options[0] ?? {};
    const filename = normalizePath(
      path.relative(process.cwd(), context.filename),
    );
    const isAllowed = (options.allowFiles ?? []).some((pattern) =>
      minimatch(filename, pattern, { dot: true, matchBase: false }),
    );
    if (isAllowed) return {};

    const reportReExport = (node) => {
      if (!node.source) return;
      context.report({ node, messageId: "barrelReExport" });
    };

    return {
      ExportAllDeclaration: reportReExport,
      ExportNamedDeclaration: reportReExport,
    };
  },
};

export default rule;
