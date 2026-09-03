# eslint-plugin-code-architecture

Portable ESLint rules that turn architectural decisions into fast, local feedback for humans and coding agents.

## See architectural drift before review

The plugin makes important design decisions executable:

- Framework-agnostic TypeScript rules work equally well in backend services, libraries, CLIs, and frontend applications.
- Unsafe casts and raw `JSON.parse` calls fail where they are written.
- Oversized functions, positional parameter growth, and missing invariants get immediate feedback.
- Cross-feature imports must follow declared dependency direction and public entry points.
- Explicit dependency injection and top-down module conventions make ownership searchable.
- Effect failures remain typed and visible instead of being silently erased.
- Optional React and React Native rules keep components declarative, accessible, tokenized, and consumer-composable.

> I use this plugin to keep coding agents fast. Small functions, explicit boundaries, runtime evidence, and direct imports reduce the context an agent must reconstruct before it can make a safe change. The same constraints make code easier to isolate and test for humans.

Every rule has a passing example in [Rule reference and examples](#rule-reference-and-examples), with detailed invalid cases and options on its linked rule page.

The design draws from [TigerStyle](https://tigerstyle.dev/), [The Vertical Codebase](https://tkdodo.eu/blog/the-vertical-codebase), [Evolu's TypeScript guides](https://www.evolu.dev/docs/dependency-injection), [Components take care of themselves](https://www.sandromaglione.com/newsletter/components-take-care-of-themselves), and [Composition is all you need](https://www.youtube.com/watch?v=4KvbVq3Eg5w). See [References and attribution](docs/references.md) for the policy sources.

It is ESM-only, supports ESLint flat config, and does not require type-aware linting.

## Install

```sh
npm install --save-dev eslint eslint-plugin-code-architecture typescript typescript-eslint
```

## Quick start

```js
// eslint.config.js
import architecture from "eslint-plugin-code-architecture";
import tseslint from "typescript-eslint";

const integrations = [
  // Add only when Effect is installed and used:
  // ...architecture.configs.effect,
  // Add when adopting Evolu's dependency-injection convention:
  // ...architecture.configs.evoluDependencyInjection,
  // Add when adopting Evolu's broader TypeScript conventions:
  // ...architecture.configs.evoluConventions,
  // Add for compound components whose consumers should own layout:
  // ...architecture.configs.composition,
  // Add only to files that implement or consume strict LEGO object APIs:
  // ...architecture.configs.lego,
  // Add only when React is installed and used:
  // ...architecture.configs.react,
];

export default tseslint.config(
  ...architecture.configs.strict,
  ...integrations,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { parser: tseslint.parser },
  },
);
```

Presets are flat-config arrays and fall into two groups:

- Library-agnostic: `recommended`, `tigerstyle`, `strict`, and `agentReadiness`. The `strict` preset combines `recommended` and `tigerstyle`; `agentReadiness` strengthens `strict` with per-function runtime contracts.
- Optional library and architecture integrations: `effect`, `react`, `composition`, `lego`, `evoluDependencyInjection`, and `evoluConventions`. These are deliberately excluded from `strict`; enable them only when the corresponding library and conventions are used.

## Production patterns

These patterns are adapted from two production applications that enable the rules as errors. Both are private, so product-specific names and domain details are redacted. The examples progress from TypeScript, through frontend/backend libraries and JSX composition, to React, and finally React Native. The complete rule index follows the same order.

### TypeScript: keep logic small enough to test in isolation

`max-function-lines` prevents a workflow from becoming a context-heavy mini-application. This redacted production helper has one decision, explicit preconditions and postconditions, and a focused test surface.

```ts
export function maximumPayloadBytes(kind: PayloadKind, mimeType: string): number {
  assert(mimeType.length > 0, "maximumPayloadBytes requires a MIME type");

  const result = kind === "thumbnail" ? LIMITS.thumbnail : LIMITS.original;

  assert(Number.isInteger(result), "payload limit must be a whole number");
  assert(result > 0, "payload limit must be positive");
  return result;
}
```

An agent can understand and test this function without loading upload orchestration, storage, or UI code. When logic approaches the configured line limit, extract a named decision with its own contract instead of disabling the rule.

### TypeScript: replace confident casts with runtime evidence

`no-unsafe-type-assertions` stops an agent from silencing uncertainty with `as` or `!`. A production event boundary replaced a double cast with a discriminated runtime schema:

```ts
const streamEventSchema: z.ZodType<StreamEvent> = z.discriminatedUnion("type", [
  z.object({ type: z.literal("started"), id: idSchema }),
  z.object({ type: z.literal("delta"), text: z.string() }),
  z.object({ type: z.literal("completed"), result: resultSchema }),
]);

const event = streamEventSchema.parse(input);
```

Tests can now prove rejection behavior for malformed input. Agents see the accepted variants in executable code instead of guessing whether a cast was justified.

### Frontend/backend library: validate JSON at the boundary

An Effect Schema boundary validates parsed JSON immediately. The same pattern works in browser clients, Node.js services, workers, and CLIs.

```ts
const StreamEvent = Schema.Union(
  Schema.Struct({ type: Schema.Literal("started"), id: Id }),
  Schema.Struct({ type: Schema.Literal("delta"), text: Schema.String }),
  Schema.Struct({ type: Schema.Literal("completed"), result: Result }),
);

const event = Schema.decodeUnknownSync(StreamEvent)(JSON.parse(message));
```

### JSX component composition: let the consumer choose the parts

The owner exports an open root and independent parts. The consumer—not the root—decides whether the optional label exists and where each part appears.

```tsx
const HeadingRoot = ({ children }: PropsWithChildren) => <View>{children}</View>;
const HeadingLabel = ({ children }: PropsWithChildren) => <Text>{children}</Text>;
const HeadingTitle = ({ children }: PropsWithChildren) => <Text>{children}</Text>;

export const Heading = {
  Root: HeadingRoot,
  Label: HeadingLabel,
  Title: HeadingTitle,
};

<Heading.Root>
  {label && <Heading.Label>{label}</Heading.Label>}
  <Heading.Title>{title}</Heading.Title>
</Heading.Root>;
```

### React: render state and send events

The optional React rule keeps state-machine components on a declarative path: read the snapshot, pass events outward, and keep orchestration out of the render function.

```tsx
function StatusScreen() {
  const [snapshot, send] = useMachine(statusMachine);
  return <StatusView status={snapshot.value} onEvent={send} />;
}
```

### React Native: make an interactive primitive carry its contract

The React Native adoption rules add UI-specific guarantees. In this redacted button primitive, `require-interactive-component-contract` keeps accessibility and disabled behavior together, while the configured design-value rules require semantic tokens instead of raw colors or spacing.

```tsx
function Action({ label, disabled, loading, onPress, children }: ActionProps) {
  assert(label.trim().length > 0, "Action requires an accessible label");
  const unavailable = disabled || loading;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: unavailable, busy: loading }}
      disabled={unavailable}
      onPress={onPress}
      style={styles.root}
    >
      {loading ? <ActivityIndicator color={tokens.color.actionContent} /> : children}
    </Pressable>
  );
}
```

These are representative patterns, not additional conventions imposed by the plugin. Each rule page linked below defines the exact syntax the rule can and cannot prove.

## Adopt incrementally in an existing codebase

The presets describe a target state and intentionally report every violation. On an established codebase, enable a small baseline first, repair its findings, and then promote additional rules one at a time. Library integrations remain opt-in throughout the rollout.

```js
import architecture from "eslint-plugin-code-architecture";
import tseslint from "typescript-eslint";

export default tseslint.config({
  files: ["src/**/*.{ts,tsx}"],
  languageOptions: { parser: tseslint.parser },
  plugins: { "code-architecture": architecture },
  rules: {
    "code-architecture/no-unsafe-type-assertions": "error",
    "code-architecture/no-unvalidated-json-parse": "warn",
  },
});
```

Once warnings are resolved, change them to errors and add the next rule. Apply `effect`, `react`, or `composition` only to files that use the corresponding library or architecture. Project-specific rules such as `enforce-module-boundaries`, `centralize-domain-literals`, and `no-raw-design-values` still require explicit consumer configuration.

## Using Biome and Oxlint alongside the plugin

[Biome](https://biomejs.dev/guides/getting-started/) and [Oxlint](https://oxc.rs/docs/guide/usage/linter/quickstart) can handle formatting and broad, high-speed linting while ESLint runs only the architectural rules that remain specific to this plugin. Teams can use either tool or both; this example uses both:

```sh
npm install --save-dev --save-exact @biomejs/biome
npm install --save-dev oxlint eslint eslint-plugin-code-architecture typescript typescript-eslint
```

Create `biome.json` using the [Biome configuration guide](https://biomejs.dev/guides/getting-started/#configuration). Keep library domains opt-in as well; for example, Biome's [React domain](https://biomejs.dev/linter/domains/#react) should only be enabled in a React project:

```json
{
  "formatter": { "enabled": true },
  "linter": {
    "enabled": true,
    "domains": { "project": "recommended" }
  }
}
```

Oxlint works without configuration. If a committed config is preferred, initialize one with `npx oxlint --init`; see the official [Oxlint configuration documentation](https://oxc.rs/docs/guide/usage/linter/config.html).

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json"
}
```

Use separate commands so each tool has a clear responsibility:

```json
{
  "scripts": {
    "lint": "npm run lint:biome && npm run lint:oxlint && npm run lint:architecture",
    "lint:biome": "biome check .",
    "lint:oxlint": "oxlint .",
    "lint:architecture": "eslint .",
    "format": "biome check --write ."
  }
}
```

Oxlint also has an [alpha JavaScript-plugin compatibility layer](https://oxc.rs/docs/guide/usage/linter/js-plugins.html). This example intentionally keeps `eslint-plugin-code-architecture` on ESLint's stable plugin API and follows Oxlint's documented [incremental migration approach](https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint.html): run fast general checks first, then ESLint for custom rules.

## Project-specific rules

These rules need the consuming application's module names, vocabulary, or design-system contract. They are not enabled by a preset.

### TypeScript: architecture boundaries

Verticals are deliberately configured by the consuming application because domain names and dependency direction are project-specific:

```js
import architecture from "eslint-plugin-code-architecture";

export default [
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { architecture },
    rules: {
      "architecture/enforce-module-boundaries": [
        "error",
        {
          modules: [
            {
              name: "checkout",
              pattern: "src/checkout/**",
              allow: ["catalog"],
            },
            {
              name: "catalog",
              pattern: "src/catalog/**",
              public: ["**/*.api.*", "**/*.service.*"],
            },
          ],
          allowPrivateImportsFrom: ["src/runtime/**"],
        },
      ],
    },
  },
];
```

This supports relative imports and configurable aliases. Cross-vertical imports must follow each source vertical's `allow` list and each target vertical's `public` patterns. Composition roots can be granted explicit private access.

### TypeScript: domain vocabulary

ESLint visits files independently, so a reliable “literal appears in two files” rule cannot aggregate whole-program state. `centralize-domain-literals` instead requires the project to declare its fixed vocabulary and approved constants files. This deterministically enforces the stronger rule from the first use.

```js
"architecture/centralize-domain-literals": [
  "error",
  {
    constantsFiles: ["src/constants.ts"],
    literals: [
      { value: "completed", replacement: "JOB_STATUS.COMPLETED" },
      { value: "ollama", replacement: "AI_PROVIDERS.OLLAMA" },
    ],
  },
]
```

### TypeScript: agent-ready runtime contracts

`agentReadiness` is the most mechanically strict library-agnostic preset. It includes every `strict` rule and configures assertion enforcement for code produced or maintained by coding agents:

- Every function, including concise arrows and otherwise trivial functions, contains at least two recognized runtime assertions.
- Every runtime parameter binding is referenced by at least one semantic assertion.
- Every nontrivial returned value is covered by a semantic assertion that dominates that return path.
- Preconditions must precede use, and mutating a result after its postcondition invalidates that postcondition.
- Obvious checks already expressed by an explicit TypeScript annotation do not satisfy the parameter or return contract.

```js
export default [
  ...architecture.configs.agentReadiness,
];
```

This preset is intentionally demanding. A computed return should normally be assigned to a local binding, checked with a postcondition, and then returned. Statically evident returns such as literals, JSX, and function values do not need a separate return assertion, but the function still needs the two assertions required by `require-assertions`. For production applications, configure `require-contract-assertions` with the shared eligibility options documented on its rule page so framework callbacks and rendering glue do not receive low-value contract assertions.

### React: design tokens, including React Native

`no-raw-design-values` prohibits explicitly configured string or numeric values only when they appear in configured object properties. Consumers provide the semantic meaning: which values and properties belong together, their approved token replacements, token files, and narrow exceptions.

```js
"architecture/no-raw-design-values": [
  "error",
  {
    allowedFiles: ["src/ui/tokens/**"],
    values: [
      {
        properties: ["color", "backgroundColor"],
        replacement: "tokens.color.surface",
        value: "#edf0eb",
      },
      {
        properties: ["gap", "padding"],
        replacement: "tokens.space.md",
        value: 16,
      },
    ],
    exceptions: [
      {
        files: ["src/charts/**"],
        properties: ["color"],
        values: ["#edf0eb"],
      },
    ],
  },
]
```

The rule is deliberately excluded from every preset. It does not assume React, React Native, CSS-in-JS, a token API, or that an arbitrary repeated number is a design value. See [`no-raw-design-values`](docs/rules/no-raw-design-values.md) for its syntax-only limits.

Design-system adoption rules are also opt-in. Activate a rule only after the matching primitive, token family, interaction contract, dismissal pattern, or component variants exist and their intended consumers have migrated. Enabling them earlier would turn architectural feedback into suppressions rather than adoption.

The Evolu-derived presets are also opt-in and syntax-only. `evoluConventions` deliberately conflicts with namespace-object APIs, including files governed by `lego`; scope those presets to different files.

## Rule reference and examples

Every rule has a compact passing example here, ordered from TypeScript to libraries, JSX composition, React, and React Native. Follow its link for failing examples, options, scope, and static-analysis limits. “Configure” means the rule needs project-specific vocabulary or component names; optional presets are never included by `strict`.

### 1. TypeScript

These rules have no UI or framework dependency. Use them in backend services, libraries, CLIs, workers, or frontend TypeScript.

The Evolu-derived presets are opt-in. `no-implicit-external-dependencies` maps `Date.now` to `TimeDep` and `console.*` to `LoggerDep`; configure project-specific service locators explicitly rather than relying on naming guesses.

| Rule | Immediate benefit | Passing shape | Preset |
| --- | --- | --- | --- |
| [`centralize-domain-literals`](docs/rules/centralize-domain-literals.md) | Fixed vocabulary has one owner | `if (job.status === JOB_STATUS.COMPLETED) {}` | Configure |
| [`dependency-parameter-convention`](docs/rules/dependency-parameter-convention.md) | Dependencies enter through one explicit argument | `const load = (deps: DbDep) => (id: Id) => deps.db.load(id);` | `evoluDependencyInjection` |
| [`dependency-wrapper-shape`](docs/rules/dependency-wrapper-shape.md) | Dependencies have distinct, collision-free contracts | `interface TimeDep { readonly time: Time; }` | `evoluDependencyInjection` |
| [`enforce-module-boundaries`](docs/rules/enforce-module-boundaries.md) | Features use declared public edges | `import { findProduct } from "../catalog/product.api.js";` | Configure |
| [`imports-first`](docs/rules/imports-first.md) | Dependencies stay visible | `import { parse } from "./parse.js";` before executable code | `recommended` |
| [`max-function-lines`](docs/rules/max-function-lines.md) | Logic stays reviewable | `function total(items) { return items.reduce(sum, 0); }` | `recommended`, `tigerstyle` |
| [`max-function-parameters`](docs/rules/max-function-parameters.md) | APIs resist positional growth | `function search({ query, limit, cursor }) {}` | `recommended`, `tigerstyle` |
| [`named-imports`](docs/rules/named-imports.md) | Imports name exact dependencies | `import { parseUser } from "./user.js";` | `evoluConventions` |
| [`no-barrel-files`](docs/rules/no-barrel-files.md) | Dependency edges stay direct | Define `export function charge() {}` in `charge.js` | `recommended` |
| [`no-barrel-imports`](docs/rules/no-barrel-imports.md) | Imports reveal their owner | `import { charge } from "./charge.js";` | `recommended`, `effect` |
| [`no-exported-dependency-instances`](docs/rules/no-exported-dependency-instances.md) | Composition roots own service instances | `const logger = createLogger();` | `evoluDependencyInjection` |
| [`no-implicit-external-dependencies`](docs/rules/no-implicit-external-dependencies.md) | Hidden time and logging access becomes injectable | `const now = deps.time.now();` | `evoluDependencyInjection` |
| [`no-namespace-exports`](docs/rules/no-namespace-exports.md) | Exports remain unique and searchable | `export const parseUser = () => {};` | `evoluConventions` |
| [`no-over-depending`](docs/rules/no-over-depending.md) | Functions request only what they use | `const log = (deps: LoggerDep) => deps.logger.log("ready");` | `evoluDependencyInjection` |
| [`no-unasserted-return`](docs/rules/no-unasserted-return.md) | Returned call results carry evidence | `const user = await loadUser(); assert(user.id); return user;` | Configure |
| [`no-unsafe-type-assertions`](docs/rules/no-unsafe-type-assertions.md) | Unknown data cannot bypass checks | `Schema.decodeUnknownSync(User)(input)` | `recommended` |
| [`no-unvalidated-json-parse`](docs/rules/no-unvalidated-json-parse.md) | Parsed JSON is validated immediately | `Schema.decodeUnknownSync(Config)(JSON.parse(text))` | `recommended` |
| [`prefer-arrow-functions`](docs/rules/prefer-arrow-functions.md) | Function syntax stays consistent | `export const createUser = (data) => ({ data });` | `evoluConventions` |
| [`prefer-interface-over-type`](docs/rules/prefer-interface-over-type.md) | Object contracts remain extensible | `interface User { readonly id: string; }` | `evoluConventions` |
| [`prefer-readonly-types`](docs/rules/prefer-readonly-types.md) | Contracts make mutation explicit | `interface User { readonly roles: ReadonlyArray<Role>; }` | `evoluConventions` |
| [`require-assertions`](docs/rules/require-assertions.md) | Function invariants become executable | `assert(result.length <= input.length); return result;` | `tigerstyle` |
| [`require-contract-assertions`](docs/rules/require-contract-assertions.md) | Every input and computed return has runtime evidence | `assert(userId.length > 0); const user = load(userId); assert(user.id === userId); return user;` | `agentReadiness` |
| [`sort-dependency-types`](docs/rules/sort-dependency-types.md) | Dependency contracts stay predictable | `type AppDeps = LoggerDep & TimeDep;` | `evoluDependencyInjection` |
| [`top-down-declarations`](docs/rules/top-down-declarations.md) | Public contracts appear before details | `export interface User { readonly id: string; }` before private helpers | `evoluConventions` |

### 2. Frontend and backend libraries

Library integrations remain opt-in and can apply on either side of the network.

| Rule | Immediate benefit | Passing shape | Preset |
| --- | --- | --- | --- |
| [`effect-error-handling`](docs/rules/effect-error-handling.md) | Effect failures remain typed and visible | `program.pipe(Effect.catchTag("NotFound", recover))` | `effect` |

### 3. JSX component composition

These opt-in rules keep compound layout decisions with consumers. They analyze JSX structure without requiring React-specific hooks or state APIs.

| Rule | Immediate benefit | Passing shape | Preset |
| --- | --- | --- | --- |
| [`prefer-composition-over-configuration`](docs/rules/prefer-composition-over-configuration.md) | Callers assemble collections and optional parts | `<List.Root>{items.map((item) => <List.Item key={item.id} />)}</List.Root>` | `composition` |
| [`require-composable-root-children`](docs/rules/require-composable-root-children.md) | Every root leaves its hierarchy open | `function ListRoot({ children }) { return <ListContext.Provider>{children}</ListContext.Provider>; }` | `composition` |
| [`no-root-owned-compound-parts`](docs/rules/no-root-owned-compound-parts.md) | Roots provide infrastructure, not fixed parts | `function ListRoot({ children }) { return <View>{children}</View>; }` | `composition` |
| [`require-compound-component-api`](docs/rules/require-compound-component-api.md) | Compound APIs expose a boundary and reusable parts | `export const Counter = { Provider, Display, Increment };` | `lego` |
| [`require-consumer-owned-compound-usage`](docs/rules/require-consumer-owned-compound-usage.md) | Consumers visibly choose compound parts | `<Counter.Provider><Counter.Display /><Counter.Increment /></Counter.Provider>` | `lego` |

#### How the `composition` preset combines these rules

The `composition` preset provides portable architectural guardrails: a root may coordinate state and infrastructure, but the consumer owns the child hierarchy. It catches statically visible prop-driven hierarchy assembly, requires every top-level boundary return to reference children, and prevents a boundary from rendering its own public parts.

Invalid:

```tsx
function Accordion({ items, showFooter, renderFooter }) {
  return (
    <section>
      {items.map((item) => <AccordionItem item={item} />)}
      {showFooter && renderFooter()}
    </section>
  );
}
```

Valid:

```tsx
<Accordion.Root open={open} setOpen={setOpen}>
  {items.map((item) => (
    <Accordion.Item key={item.id}>
      <Accordion.Trigger>{item.title}</Accordion.Trigger>
      <Accordion.Content>{item.content}</Accordion.Content>
    </Accordion.Item>
  ))}
</Accordion.Root>
```

Passing `composition` does not prove a complete LEGO architecture. The preset deliberately does not mandate dot-notation object exports, barrel files, React `useState`, or a `state/actions/meta` context shape. Module namespace exports are equally composable, and context organization is a separate convention rather than proof that consumers control structure.

#### How the `lego` preset adds a public compound API

The opt-in `lego` preset combines `composition` with positive, convention-oriented checks. Apply it only to files that define or consume compound APIs; ordinary screens and components are not required to become compounds.

```tsx
const CounterProvider = ({ children }) => (
  <CounterContext.Provider value={actor}>{children}</CounterContext.Provider>
);
const CounterDisplay = () => <output />;
const CounterIncrement = () => <button />;

export const Counter = {
  Provider: CounterProvider,
  Display: CounterDisplay,
  Increment: CounterIncrement,
};

<Counter.Provider>
  <Counter.Display />
  <Counter.Increment />
</Counter.Provider>
```

By default, an identified compound object must be exported, expose `Provider` or `Root`, expose at least two additional component-valued parts, and avoid duplicate bindings. Imported or same-file compound boundaries must be open and contain a consumer-selected part from the same namespace. Configure `boundaryMembers`, `minimumParts`, `compoundNamePattern`, or `headlessCompounds` for other conventions and intentional actor/store-backed headless boundaries.

The rules use deterministic same-file syntax analysis. They can validate bindings declared or imported in the current file, but they do not resolve re-export graphs, prove that a component consumes a particular context across files, or prove shared state semantics. No shared-state rule is shipped because naming a hook is not reliable evidence that state is shared. Actor and store implementations are supported without requiring React local state; teams may scope the preset and configure their boundary names without adopting `state/actions/meta`.

### 4. React

React integration is opt-in. These rules keep components declarative and enforce an adopted design system. The design-system rules support both web and native component contracts.

| Rule | Immediate benefit | Passing shape | Preset |
| --- | --- | --- | --- |
| [`declarative-components`](docs/rules/declarative-components.md) | Components render state and send events | `const [snapshot, send] = useMachine(machine); return <Button onPress={send}>{snapshot.value}</Button>;` | `react` |
| [`no-design-identity-overrides`](docs/rules/no-design-identity-overrides.md) | Consumers cannot restyle component identity | `<Button style={{ marginTop: 12 }} />` | Configure |
| [`no-raw-design-properties`](docs/rules/no-raw-design-properties.md) | New raw design literals fail immediately | `{ color: theme.color.danger, gap: theme.space.md }` | Configure |
| [`no-raw-design-values`](docs/rules/no-raw-design-values.md) | Known raw values point to their token | `<Spinner color={tokens.color.surface} />` | Configure |
| [`prefer-design-system-components`](docs/rules/prefer-design-system-components.md) | Screens reuse adopted primitives | `<Button>Save</Button>` instead of a configured platform primitive | Configure |

### 5. React Native interactions

These interaction rules are listed last because the examples use React Native modal and pressable conventions. Both rules can also be configured for web React elements and attributes.

| Rule | Immediate benefit | Passing shape | Preset |
| --- | --- | --- | --- |
| [`require-dismissible-modal-backdrop`](docs/rules/require-dismissible-modal-backdrop.md) | Transparent modals have both close paths | `<Modal transparent onRequestClose={close}><Pressable onPress={close} /></Modal>` | Configure |
| [`require-interactive-component-contract`](docs/rules/require-interactive-component-contract.md) | Shared controls expose accessibility, disabled state, feedback, and content | `<Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} style={({ pressed }) => pressed && styles.pressed}>{children}</Pressable>` | Configure |

## Publishing

See [PUBLISHING.md](PUBLISHING.md) for first-release and automated publishing instructions.

## Development

```sh
bun install
bun run check
bun run test:coverage
npm pack --dry-run
```

Every rule change should start with one observable failing test, followed by the smallest implementation and a refactor pass.

`npm run smoke:package` additionally packs the publishable tarball, installs it into a clean temporary project, and runs ESLint through the package's public export.

## License

MIT
