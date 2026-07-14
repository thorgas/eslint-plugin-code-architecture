import path from "node:path";
import { minimatch } from "minimatch";

const normalizePath = (value) => value.split(path.sep).join("/");

const resolveRoot = (configuredRoot) => {
  if (!configuredRoot) return process.cwd();
  if (path.isAbsolute(configuredRoot)) return configuredRoot;
  return path.resolve(process.cwd(), configuredRoot);
};

const resolveImport = ({ aliases, filename, source }) => {
  if (source.startsWith(".")) {
    return path.resolve(path.dirname(filename), source);
  }

  const alias = aliases.find(({ prefix }) => source.startsWith(prefix));
  if (!alias) return undefined;

  return path.resolve(alias.target, source.slice(alias.prefix.length));
};

const findModule = (modules, projectPath) =>
  modules.find(({ pattern }) =>
    minimatch(projectPath, pattern, { dot: true, matchBase: false }),
  );

const isPublicImport = (targetModule, targetPath) => {
  if (targetModule.public === undefined) return true;

  const modulePrefix = targetModule.pattern.replace(/\/\*\*.*$/u, "");
  const modulePath = targetPath.slice(modulePrefix.length).replace(/^\//u, "");
  return targetModule.public.some((pattern) =>
    minimatch(modulePath, pattern, { dot: true, matchBase: false }),
  );
};

const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Enforce dependency direction and public entry points between vertical modules",
      url: "https://tkdodo.eu/blog/the-vertical-codebase",
    },
    messages: {
      forbiddenDependency:
        "Module '{{source}}' may not depend on module '{{target}}'. Add an explicit dependency or move the shared code into its own vertical.",
      privateImport:
        "Import from private path '{{path}}' in module '{{target}}'. Import through a configured public module file instead.",
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        required: ["modules"],
        properties: {
          root: { type: "string" },
          allowPrivateImportsFrom: {
            type: "array",
            items: { type: "string" },
          },
          aliases: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["prefix", "target"],
              properties: {
                prefix: { type: "string" },
                target: { type: "string" },
              },
            },
          },
          modules: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["name", "pattern"],
              properties: {
                name: { type: "string" },
                pattern: { type: "string" },
                allow: { type: "array", items: { type: "string" } },
                public: { type: "array", items: { type: "string" } },
              },
            },
          },
        },
      },
    ],
  },
  create(context) {
    const options = context.options[0];
    const root = resolveRoot(options.root);
    const aliases = (options.aliases ?? []).map((alias) => ({
      ...alias,
      target: path.resolve(root, alias.target),
    }));
    const filename = path.resolve(context.filename);
    const sourcePath = normalizePath(path.relative(root, filename));
    const sourceModule = findModule(options.modules, sourcePath);
    const mayImportPrivate = (options.allowPrivateImportsFrom ?? []).some(
      (pattern) =>
        minimatch(sourcePath, pattern, { dot: true, matchBase: false }),
    );

    if (!sourceModule) return {};

    const inspectImport = (node) => {
      if (typeof node.source?.value !== "string") return;

      const resolvedImport = resolveImport({
        aliases,
        filename,
        source: node.source.value,
      });
      if (!resolvedImport) return;

      const targetPath = normalizePath(path.relative(root, resolvedImport));
      const targetModule = findModule(options.modules, targetPath);
      if (!targetModule || targetModule.name === sourceModule.name) return;

      if (
        sourceModule.allow !== undefined &&
        !sourceModule.allow.includes(targetModule.name)
      ) {
        context.report({
          node,
          messageId: "forbiddenDependency",
          data: { source: sourceModule.name, target: targetModule.name },
        });
        return;
      }

      if (!mayImportPrivate && !isPublicImport(targetModule, targetPath)) {
        context.report({
          node,
          messageId: "privateImport",
          data: { path: node.source.value, target: targetModule.name },
        });
      }
    };

    return {
      ExportAllDeclaration: inspectImport,
      ExportNamedDeclaration: inspectImport,
      ImportDeclaration: inspectImport,
    };
  },
};

export default rule;
