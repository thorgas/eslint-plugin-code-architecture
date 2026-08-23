import {
  functionName,
  readPropsParameter,
  referencedPropName,
  walkNodes,
} from "./composition-helpers.js";
import { jsxAttributeExpression, jsxAttributeName } from "./design-system-helpers.js";

const stringArray = {
  type: "array",
  minItems: 1,
  uniqueItems: true,
  items: { type: "string", minLength: 1 },
};

const configuredContract = (options) => ({
  componentNames: new Set(options.componentNames),
  contentProps: new Set(options.contentProps ?? ["children"]),
  disabledAttributes: new Set(
    options.disabledAttributes ?? ["disabled", "aria-disabled"],
  ),
  disabledProps: new Set(options.disabledProps ?? ["disabled"]),
  feedbackAttributes: new Set(
    options.feedbackAttributes ?? ["android_ripple", "data-pressed"],
  ),
  feedbackStateNames: new Set(
    options.feedbackStateNames ?? ["pressed", "active"],
  ),
  roleAttributes: new Set(
    options.roleAttributes ?? ["accessibilityRole", "role"],
  ),
  stateAttributes: new Set(
    options.stateAttributes ?? ["accessibilityState", "aria-disabled"],
  ),
});

const inspectAttribute = (node, state, props, sourceCode, contract) => {
  const attribute = jsxAttributeName(node);
  if (!attribute) return;
  if (contract.roleAttributes.has(attribute)) state.hasRole = true;
  if (contract.stateAttributes.has(attribute)) state.hasState = true;
  if (contract.feedbackAttributes.has(attribute)) state.hasFeedback = true;

  const expression = jsxAttributeExpression(node);
  if (!expression) return;
  walkNodes(expression, sourceCode, (current) => {
    if (
      current.type === "Identifier" &&
      contract.feedbackStateNames.has(current.name)
    ) {
      state.hasFeedback = true;
    }
    const isPropertyKey =
      current.parent?.type === "Property" &&
      current.parent.key === current &&
      !current.parent.computed &&
      !current.parent.shorthand;
    const prop = isPropertyKey ? undefined : referencedPropName(current, props);
    if (
      prop &&
      contract.disabledProps.has(prop) &&
      (contract.disabledAttributes.has(attribute) ||
        contract.stateAttributes.has(attribute))
    ) {
      state.hasDisabledBehavior = true;
    }
  });
};

const analyzeComponent = (node, sourceCode, contract) => {
  const props = readPropsParameter(node.params[0]);
  const state = {
    acceptedProps: new Set(props.bindings.values()),
    hasContent: false,
    hasDisabledBehavior: false,
    hasFeedback: false,
    hasRole: false,
    hasState: false,
  };

  walkNodes(node.body, sourceCode, (current) => {
    const referenced = referencedPropName(current, props);
    if (referenced) state.acceptedProps.add(referenced);
    if (current.type === "JSXAttribute") {
      inspectAttribute(current, state, props, sourceCode, contract);
    }
    if (
      current.type === "JSXExpressionContainer" &&
      current.parent.type === "JSXElement"
    ) {
      walkNodes(current.expression, sourceCode, (expressionNode) => {
        const content = referencedPropName(expressionNode, props);
        if (content && contract.contentProps.has(content)) {
          state.hasContent = true;
        }
      });
    }
  }, { skipFunctions: true });
  return state;
};

const missingContractParts = (state, contract) => {
  const acceptsContent = [...contract.contentProps].some((name) =>
    state.acceptedProps.has(name),
  );
  const acceptsDisabled = [...contract.disabledProps].some((name) =>
    state.acceptedProps.has(name),
  );
  return [
    !state.hasRole && "accessibility role",
    !state.hasState && "accessibility state",
    !(state.hasDisabledBehavior && acceptsDisabled) && "disabled behavior",
    !state.hasFeedback && "press feedback",
    !(state.hasContent && acceptsContent) && "configurable content",
  ].filter(Boolean);
};

const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require configured interactive components to expose an accessible behavioral contract",
    },
    messages: {
      incompleteContract:
        "Interactive component '{{component}}' is missing: {{missing}}.",
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        required: ["componentNames"],
        properties: {
          componentNames: stringArray,
          contentProps: stringArray,
          disabledAttributes: stringArray,
          disabledProps: stringArray,
          feedbackAttributes: stringArray,
          feedbackStateNames: stringArray,
          roleAttributes: stringArray,
          stateAttributes: stringArray,
        },
      },
    ],
  },
  create(context) {
    const contract = configuredContract(context.options[0]);
    const sourceCode = context.sourceCode;

    return {
      ":function:exit"(node) {
        const component = functionName(node);
        if (!component || !contract.componentNames.has(component)) return;
        const state = analyzeComponent(node, sourceCode, contract);
        const missing = missingContractParts(state, contract);
        if (missing.length === 0) return;

        context.report({
          node,
          messageId: "incompleteContract",
          data: { component, missing: missing.join(", ") },
        });
      },
    };
  },
};

export default rule;
