import path from "node:path";
import { minimatch } from "minimatch";

const normalizePath = (value) => value.split(path.sep).join("/");

const isStructuralLiteral = (node) => {
  const parent = node.parent;
  if (!parent) return false;
  if (parent.type === "ImportDeclaration" || parent.type.startsWith("Export")) {
    return true;
  }
  if (parent.type === "TSLiteralType") return true;
  if (
    (parent.type === "Property" || parent.type === "MethodDefinition") &&
    parent.key === node &&
    !parent.computed
  ) {
    return true;
  }
  return false;
};

const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Keep configured domain vocabulary and magic configuration in designated constants files",
    },
    messages: {
      domainLiteral:
        "Domain literal '{{value}}' belongs in a constants module. Use {{replacement}} instead.",
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        required: ["constantsFiles", "literals"],
        properties: {
          constantsFiles: {
            type: "array",
            minItems: 1,
            items: { type: "string" },
          },
          literals: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["value"],
              properties: {
                value: { anyOf: [{ type: "string" }, { type: "number" }] },
                replacement: { type: "string" },
              },
            },
          },
        },
      },
    ],
  },
  create(context) {
    const options = context.options[0];
    const filename = normalizePath(
      path.relative(process.cwd(), context.filename),
    );
    const isConstantsFile = options.constantsFiles.some((pattern) =>
      minimatch(filename, pattern, { dot: true, matchBase: false }),
    );
    if (isConstantsFile) return {};

    const literals = new Map(
      options.literals.map(({ replacement, value }) => [
        value,
        replacement ?? "the exported domain constant",
      ]),
    );

    return {
      Literal(node) {
        if (isStructuralLiteral(node) || !literals.has(node.value)) return;

        context.report({
          node,
          messageId: "domainLiteral",
          data: {
            replacement: literals.get(node.value),
            value: String(node.value),
          },
        });
      },
    };
  },
};

export default rule;
