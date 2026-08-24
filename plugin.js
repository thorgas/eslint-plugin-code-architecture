import centralizeDomainLiterals from "./rules/centralize-domain-literals.js";
import declarativeComponents from "./rules/declarative-components.js";
import effectErrorHandling from "./rules/effect-error-handling.js";
import enforceModuleBoundaries from "./rules/enforce-module-boundaries.js";
import importsFirst from "./rules/imports-first.js";
import maxFunctionLines from "./rules/max-function-lines.js";
import maxFunctionParameters from "./rules/max-function-parameters.js";
import noBarrelFiles from "./rules/no-barrel-files.js";
import noBarrelImports from "./rules/no-barrel-imports.js";
import noDesignIdentityOverrides from "./rules/no-design-identity-overrides.js";
import noRawDesignProperties from "./rules/no-raw-design-properties.js";
import noRawDesignValues from "./rules/no-raw-design-values.js";
import noRootOwnedCompoundParts from "./rules/no-root-owned-compound-parts.js";
import noUnsafeTypeAssertions from "./rules/no-unsafe-type-assertions.js";
import noUnvalidatedJsonParse from "./rules/no-unvalidated-json-parse.js";
import preferCompositionOverConfiguration from "./rules/prefer-composition-over-configuration.js";
import preferDesignSystemComponents from "./rules/prefer-design-system-components.js";
import requireAssertions from "./rules/require-assertions.js";
import requireComposableRootChildren from "./rules/require-composable-root-children.js";
import requireCompoundComponentApi from "./rules/require-compound-component-api.js";
import requireConsumerOwnedCompoundUsage from "./rules/require-consumer-owned-compound-usage.js";
import requireDismissibleModalBackdrop from "./rules/require-dismissible-modal-backdrop.js";
import requireInteractiveComponentContract from "./rules/require-interactive-component-contract.js";
import packageMetadata from "./package.json" with { type: "json" };

const namespace = "code-architecture";

const plugin = {
  meta: {
    name: packageMetadata.name,
    namespace,
    version: packageMetadata.version,
  },
  configs: {},
  rules: {
    "centralize-domain-literals": centralizeDomainLiterals,
    "declarative-components": declarativeComponents,
    "effect-error-handling": effectErrorHandling,
    "enforce-module-boundaries": enforceModuleBoundaries,
    "imports-first": importsFirst,
    "max-function-lines": maxFunctionLines,
    "max-function-parameters": maxFunctionParameters,
    "no-barrel-files": noBarrelFiles,
    "no-barrel-imports": noBarrelImports,
    "no-design-identity-overrides": noDesignIdentityOverrides,
    "no-raw-design-properties": noRawDesignProperties,
    "no-raw-design-values": noRawDesignValues,
    "no-root-owned-compound-parts": noRootOwnedCompoundParts,
    "no-unsafe-type-assertions": noUnsafeTypeAssertions,
    "no-unvalidated-json-parse": noUnvalidatedJsonParse,
    "prefer-composition-over-configuration":
      preferCompositionOverConfiguration,
    "prefer-design-system-components": preferDesignSystemComponents,
    "require-assertions": requireAssertions,
    "require-composable-root-children": requireComposableRootChildren,
    "require-compound-component-api": requireCompoundComponentApi,
    "require-consumer-owned-compound-usage":
      requireConsumerOwnedCompoundUsage,
    "require-dismissible-modal-backdrop": requireDismissibleModalBackdrop,
    "require-interactive-component-contract":
      requireInteractiveComponentContract,
  },
};

const flatConfig = (name, rules) => [
  {
    name: `code-architecture/${name}`,
    plugins: { [namespace]: plugin },
    rules,
  },
];

const recommendedRules = {
  [`${namespace}/imports-first`]: "error",
  [`${namespace}/max-function-lines`]: [
    "error",
    { ignoreJSX: true, max: 70 },
  ],
  [`${namespace}/max-function-parameters`]: ["error", { max: 5 }],
  [`${namespace}/no-barrel-files`]: "error",
  [`${namespace}/no-barrel-imports`]: "error",
  [`${namespace}/no-unsafe-type-assertions`]: "error",
  [`${namespace}/no-unvalidated-json-parse`]: "error",
};

const tigerstyleRules = {
  [`${namespace}/max-function-lines`]: [
    "error",
    { ignoreJSX: true, max: 70 },
  ],
  [`${namespace}/max-function-parameters`]: ["error", { max: 5 }],
  [`${namespace}/require-assertions`]: [
    "error",
    {
      ignoreDirectCallbacks: true,
      ignoreJSXCallbacks: true,
      ignoreJSXComponents: true,
      ignoreNoInputClosures: true,
      ignoreTrivialConstructors: true,
      minimum: 2,
    },
  ],
};

const effectRules = {
  [`${namespace}/effect-error-handling`]: "error",
  [`${namespace}/no-barrel-imports`]: [
    "error",
    { packages: ["effect", "@effect/platform"] },
  ],
};

const reactRules = {
  [`${namespace}/declarative-components`]: "error",
};

const compositionRules = {
  [`${namespace}/no-root-owned-compound-parts`]: "error",
  [`${namespace}/prefer-composition-over-configuration`]: "error",
  [`${namespace}/require-composable-root-children`]: "error",
};

const legoRules = {
  ...compositionRules,
  [`${namespace}/require-compound-component-api`]: "error",
  [`${namespace}/require-consumer-owned-compound-usage`]: "error",
};

Object.assign(plugin.configs, {
  recommended: flatConfig("recommended", recommendedRules),
  tigerstyle: flatConfig("tigerstyle", tigerstyleRules),
  strict: flatConfig("strict", {
    ...recommendedRules,
    ...tigerstyleRules,
  }),
  effect: flatConfig("effect", effectRules),
  react: flatConfig("react", reactRules),
  composition: flatConfig("composition", compositionRules),
  lego: flatConfig("lego", legoRules),
});

export default plugin;
