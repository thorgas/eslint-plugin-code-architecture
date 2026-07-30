import { execFileSync, spawnSync } from "node:child_process";
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

const lintJson = (cwd, filename) => {
  const result = spawnSync(
    npmCommand,
    ["exec", "--", "eslint", filename, "--format", "json"],
    { cwd, encoding: "utf8" },
  );
  return {
    messages: JSON.parse(result.stdout)[0]?.messages ?? [],
    status: result.status,
  };
};

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

if (
  !architecture.configs.agentReadiness ||
  !architecture.configs.composition ||
  !architecture.configs.lego ||
  !architecture.configs.evoluDependencyInjection ||
  !architecture.configs.evoluConventions
) {
  throw new Error("optional architecture presets must be public");
}
for (const ruleName of [
  "prefer-design-system-components",
  "no-raw-design-properties",
  "require-interactive-component-contract",
  "require-dismissible-modal-backdrop",
  "no-design-identity-overrides",
]) {
  if (!architecture.rules[ruleName]) {
    throw new Error("missing public design-system rule: " + ruleName);
  }
}

export default [
  ...architecture.configs.recommended,
  ...architecture.configs.effect,
  ...architecture.configs.composition,
  ...architecture.configs.lego,
  ...architecture.configs.agentReadiness.map((config) => ({
    ...config,
    files: ["src/agent-*.ts"],
  })),
  {
    ...architecture.configs.evoluDependencyInjection[0],
    files: ["src/evolu-*.ts"],
    rules: {
      ...architecture.configs.evoluDependencyInjection[0].rules,
      ...architecture.configs.evoluConventions[0].rules,
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { parser: tseslint.parser },
    rules: {
      "code-architecture/no-raw-design-values": [
        "error",
        {
          allowedFiles: ["src/tokens/**"],
          values: [
            {
              properties: ["color", "tintColor"],
              replacement: "tokens.color.surface",
              value: "#EDF0EB",
            },
          ],
        },
      ],
      "code-architecture/prefer-design-system-components": [
        "error",
        {
          consumers: ["src/**"],
          replacements: [
            {
              from: "react-native",
              imported: ["Pressable"],
              replacement: "@/components/ui/button",
            },
          ],
        },
      ],
      "code-architecture/no-raw-design-properties": [
        "error",
        {
          properties: [
            { names: ["color"], replacement: "theme.colors" },
          ],
        },
      ],
      "code-architecture/no-design-identity-overrides": [
        "error",
        {
          components: [
            { names: ["Button"], identityProperties: ["color"] },
          ],
        },
      ],
    },
  },
];
`,
  );
  await writeFile(
    join(consumerRoot, "src/evolu-valid.ts"),
    `interface Logger {
  readonly log: (message: string) => void;
}
interface LoggerDep {
  readonly logger: Logger;
}
interface Time {
  readonly now: () => number;
}
interface TimeDep {
  readonly time: Time;
}

const run = (deps: LoggerDep & TimeDep) => {
  deps.logger.log(String(deps.time.now()));
};

run;
`,
  );
  await writeFile(
    join(consumerRoot, "src/evolu-invalid.ts"),
    `import Logger from "./logger.js";

type LoggerDep = { logger: Logger };

export const logger = createLogger();
export const currentTime = Date.now();
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
  await writeFile(
    join(consumerRoot, "src/invalid-design-values.tsx"),
    `export const Spinner = () => (
  <ActivityIndicator color="#EDF0EB" />
);
`,
  );
  await writeFile(
    join(consumerRoot, "src/invalid-settings.tsx"),
    `export function Settings({ items, FooterComponent }) {
  return <section>
    {items.filter(Boolean).map((item) => <Row item={item} />)}
    <FooterComponent />
  </section>;
}
`,
  );
  await writeFile(
    join(consumerRoot, "src/invalid-design-system.tsx"),
    `import { Pressable } from "react-native";

export const Example = () => (
  <><Pressable /><Button color="#8A3D35" /></>
);
`,
  );
  await writeFile(
    join(consumerRoot, "src/valid-counter.tsx"),
    `type RootProps = { children: unknown };

const CounterContext = { Provider: ({ children }) => children };
const CounterProvider = ({ children }: RootProps) => (
  <CounterContext.Provider>{children}</CounterContext.Provider>
);
const CounterDisplay = () => <output />;
const CounterIncrement = () => <button />;

export const Counter = {
  Provider: CounterProvider,
  Display: CounterDisplay,
  Increment: CounterIncrement,
};

export const Example = () => (
  <Counter.Provider>
    <Counter.Display />
    <Counter.Increment />
  </Counter.Provider>
);
`,
  );
  await writeFile(
    join(consumerRoot, "src/agent-valid.ts"),
    `declare const assert: (condition: boolean) => void;

export const normalize = (value: string): string => {
  assert(value.length > 0);
  const result = value.trim();
  assert(result.length > 0);
  return result;
};
`,
  );
  await writeFile(
    join(consumerRoot, "src/agent-invalid.ts"),
    `export const normalize = (value: string): string => value.trim();
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
  const invalid = lintJson(consumerRoot, "src/invalid-settings.tsx");
  if (invalid.status !== 1) {
    throw new Error(`invalid consumer exited with ${invalid.status}`);
  }
  const invalidRuleIds = new Set(
    invalid.messages.map(({ ruleId }) => ruleId),
  );
  const expectedRule =
    "code-architecture/prefer-composition-over-configuration";
  if (!invalidRuleIds.has(expectedRule)) {
    throw new Error(`invalid consumer did not report ${expectedRule}`);
  }

  const invalidDesignValues = lintJson(
    consumerRoot,
    "src/invalid-design-values.tsx",
  );
  const expectedDesignRule = "code-architecture/no-raw-design-values";
  const designMessages = invalidDesignValues.messages.filter(
    ({ ruleId }) => ruleId === expectedDesignRule,
  );
  if (
    invalidDesignValues.status !== 1 ||
    designMessages.length !== 1 ||
    !designMessages[0]?.message.includes("tokens.color.surface")
  ) {
    throw new Error(
      `invalid consumer did not report ${expectedDesignRule}: ${JSON.stringify(invalidDesignValues.messages)}`,
    );
  }

  const invalidDesignSystem = lintJson(
    consumerRoot,
    "src/invalid-design-system.tsx",
  );
  const designSystemRuleIds = new Set(
    invalidDesignSystem.messages.map(({ ruleId }) => ruleId),
  );
  for (const expectedRule of [
    "code-architecture/prefer-design-system-components",
    "code-architecture/no-raw-design-properties",
    "code-architecture/no-design-identity-overrides",
  ]) {
    if (!designSystemRuleIds.has(expectedRule)) {
      throw new Error(
        `invalid consumer did not report ${expectedRule}: ${JSON.stringify(invalidDesignSystem.messages)}`,
      );
    }
  }

  const valid = lintJson(consumerRoot, "src/valid-counter.tsx");
  if (valid.status !== 0 || valid.messages.length > 0) {
    throw new Error(
      `valid LEGO consumer failed: ${JSON.stringify(valid.messages)}`,
    );
  }

  const invalidEvolu = lintJson(consumerRoot, "src/evolu-invalid.ts");
  const invalidEvoluRuleIds = new Set(
    invalidEvolu.messages.map(({ ruleId }) => ruleId),
  );
  for (const expectedEvoluRule of [
    "code-architecture/dependency-wrapper-shape",
    "code-architecture/named-imports",
    "code-architecture/no-exported-dependency-instances",
    "code-architecture/no-implicit-external-dependencies",
  ]) {
    if (!invalidEvoluRuleIds.has(expectedEvoluRule)) {
      throw new Error(
        `invalid Evolu consumer did not report ${expectedEvoluRule}`,
      );
    }
  }

  const invalidAgent = lintJson(consumerRoot, "src/agent-invalid.ts");
  if (invalidAgent.status !== 1) {
    throw new Error(
      `invalid agent readiness consumer exited with ${invalidAgent.status}`,
    );
  }
  const invalidAgentRuleIds = new Set(
    invalidAgent.messages.map(({ ruleId }) => ruleId),
  );
  for (const expectedAgentRule of [
    "code-architecture/require-assertions",
    "code-architecture/require-contract-assertions",
  ]) {
    if (!invalidAgentRuleIds.has(expectedAgentRule)) {
      throw new Error(
        `invalid agent readiness consumer did not report ${expectedAgentRule}`,
      );
    }
  }

  const validEvolu = lintJson(consumerRoot, "src/evolu-valid.ts");
  if (validEvolu.status !== 0 || validEvolu.messages.length > 0) {
    throw new Error(
      `valid Evolu consumer failed: ${JSON.stringify(validEvolu.messages)}`,
    );
  }

  const validAgent = lintJson(consumerRoot, "src/agent-valid.ts");
  if (validAgent.status !== 0 || validAgent.messages.length > 0) {
    throw new Error(
      `valid agent readiness consumer failed: ${JSON.stringify(validAgent.messages)}`,
    );
  }
} finally {
  await rm(temporaryRoot, { force: true, recursive: true });
}
