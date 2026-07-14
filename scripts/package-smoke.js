import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const packageRoot = fileURLToPath(new URL("../", import.meta.url));

const run = (command, arguments_, cwd) =>
  execFileSync(command, arguments_, {
    cwd,
    encoding: "utf8",
    stdio: "pipe",
  });

const temporaryRoot = await mkdtemp(join(tmpdir(), "code-architecture-"));
const consumerRoot = join(temporaryRoot, "consumer");

try {
  run(
    npmCommand,
    ["pack", "--pack-destination", temporaryRoot],
    packageRoot,
  );

  const archiveName = (await readdir(temporaryRoot)).find((file) =>
    file.endsWith(".tgz"),
  );
  if (!archiveName) {
    throw new Error("npm pack did not create a package archive");
  }

  await mkdir(join(consumerRoot, "src"), { recursive: true });
  await writeFile(
    join(consumerRoot, "package.json"),
    `${JSON.stringify({ name: "package-smoke", private: true, type: "module" }, null, 2)}\n`,
  );
  await writeFile(
    join(consumerRoot, "eslint.config.js"),
    `import architecture from "eslint-plugin-code-architecture";
import tseslint from "typescript-eslint";

export default [
  ...architecture.configs.recommended,
  ...architecture.configs.effect,
  {
    files: ["src/**/*.ts"],
    languageOptions: { parser: tseslint.parser },
  },
];
`,
  );
  await writeFile(
    join(consumerRoot, "src/example.ts"),
    `import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

const Config = Schema.Struct({ enabled: Schema.Boolean });

export const decodeConfig = (content: string) =>
  Schema.decodeUnknownSync(Config)(JSON.parse(content));

export const recover = Effect.catchAll((error) => Effect.fail(error));
`,
  );

  run(
    npmCommand,
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      join(temporaryRoot, archiveName),
      "eslint@^9.39.2",
      "typescript@^5.9.3",
      "typescript-eslint@^8.48.1",
    ],
    consumerRoot,
  );
  run(npmCommand, ["exec", "--", "eslint", "src"], consumerRoot);
} finally {
  await rm(temporaryRoot, { force: true, recursive: true });
}
