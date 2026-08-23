import { spawnSync } from "node:child_process";
import packageMetadata from "../package.json" with { type: "json" };

const mode = process.argv[2];
if (mode !== "--dry-run" && mode !== "--publish") {
  throw new Error("Expected --dry-run or --publish");
}

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const tag = packageMetadata.version.includes("-") ? "alpha" : "latest";
const arguments_ = [
  "publish",
  ...(mode === "--dry-run" ? ["--dry-run"] : ["--provenance"]),
  "--access",
  "public",
  "--tag",
  tag,
];
const result = spawnSync(npmCommand, arguments_, { stdio: "inherit" });

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
