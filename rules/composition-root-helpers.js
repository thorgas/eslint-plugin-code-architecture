import path from "node:path";
import { minimatch } from "minimatch";

const normalizePath = (value) => value.split(path.sep).join("/");

const resolveRoot = (configuredRoot) => {
  if (!configuredRoot) return process.cwd();
  if (path.isAbsolute(configuredRoot)) return configuredRoot;
  return path.resolve(process.cwd(), configuredRoot);
};

export const compositionRootSchema = {
  compositionRoots: { type: "array", items: { type: "string" } },
  root: { type: "string" },
};

export const isCompositionRoot = (context, options) => {
  const patterns = options.compositionRoots ?? [];
  if (patterns.length === 0) return false;
  const filename = normalizePath(
    path.relative(resolveRoot(options.root), path.resolve(context.filename)),
  );
  return patterns.some((pattern) =>
    minimatch(filename, pattern, { dot: true, matchBase: false }),
  );
};
