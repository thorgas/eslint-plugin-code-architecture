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

const interactiveHandlerAttributes = new Set([
  "onPress",
  "onClick",
  "onPressIn",
]);

const unwrapReturned = (expression) => {
  let current = expression;
  while (current) {
    if (current.type === "TSAsExpression" || current.type === "TSNonNullExpression") {
      current = current.expression;
    } else if (current.type === "ConditionalExpression") {
      return [
        ...unwrapReturned(current.consequent),
        ...unwrapReturned(current.alternate),
      ];
    } else if (current.type === "LogicalExpression") {
      current = current.right;
    } else {
      break;
    }
  }
  return current ? [current] : [];
};

const returnedJsxRoots = (node, sourceCode) => {
  if (node.body.type !== "BlockStatement") return unwrapReturned(node.body);
  const roots = [];
  walkNodes(
    node.body,
    sourceCode,
    (current) => {
      if (current.type === "ReturnStatement" && current.argument) {
        roots.push(...unwrapReturned(current.argument));
      }
    },
    { skipFunctions: true },
  );
  return roots;
};

const hasInteractiveAttribute = (element) =>
  element.type === "JSXElement" &&
  element.openingElement.attributes.some(
    (attribute) =>
      attribute.type === "JSXAttribute" &&
      interactiveHandlerAttributes.has(jsxAttributeName(attribute)),
  );

const jsxElementChildren = (element) =>
  element.children.filter(
    (child) =>
      child.type === "JSXElement" ||
      (child.type === "JSXText" && child.value.trim() !== "") ||
      child.type === "JSXExpressionContainer",
  );

// A component is an interactive primitive when the element it renders is
// itself pressable, or when it is a single layout wrapper around one pressable
// element. Screens and sections that merely contain buttons are not
// interactive primitives and are left to the primitives they compose.
const rendersInteractiveRoot = (node, sourceCode) =>
  returnedJsxRoots(node, sourceCode).some((root) => {
    if (hasInteractiveAttribute(root)) return true;
    if (root.type !== "JSXElement") return false;
    const children = jsxElementChildren(root);
    return children.length === 1 && hasInteractiveAttribute(children[0]);
  });

const configuredContract = (options = {}) => ({
  componentNames: new Set(options.componentNames ?? []),
  contentProps: new Set(
    options.contentProps ?? ["children", "label", "title", "text"],
  ),
  disabledAttributes: new Set(
    options.disabledAttributes ?? ["disabled", "isDisabled"],
  ),
  disabledProps: new Set(options.disabledProps ?? ["disabled", "isDisabled"]),
  feedbackAttributes: new Set(
    options.feedbackAttributes ?? [
      "style",
      "rippleColor",
      "android_ripple",
      "activeOpacity",
      "underlayColor",
    ],
  ),
  feedbackStateNames: new Set(
    options.feedbackStateNames ?? ["pressed", "hovered", "focused", "active"],
  ),
  roleAttributes: new Set(
    options.roleAttributes ?? ["accessibilityRole", "role"],
  ),
  stateAttributes: new Set(
    options.stateAttributes ?? [
      "accessibilityState",
      "aria-disabled",
      "aria-pressed",
      "aria-checked",
      "aria-selected",
    ],
  ),
});

// Identifiers that a JSXSpreadAttribute's argument can resolve to (one level
// of aliasing) and still count as forwarding role/state/disabled props: the
// props identifier itself, a rest element pulled from destructured props, or
// a local const/let bound directly to one of those.
const collectSpreadableIdentifiers = (node, sourceCode, props) => {
  const names = new Set();
  if (props.propsIdentifier) names.add(props.propsIdentifier);

  const params = node.params[0];
  if (params?.type === "ObjectPattern") {
    const rest = params.properties.find((p) => p.type === "RestElement");
    if (rest?.argument.type === "Identifier") names.add(rest.argument.name);
  }

  walkNodes(
    node.body,
    sourceCode,
    (current) => {
      if (current.type !== "VariableDeclarator") return;
      if (
        current.id.type === "Identifier" &&
        current.init?.type === "Identifier" &&
        names.has(current.init.name)
      ) {
        names.add(current.id.name);
      }
    },
    { skipFunctions: true },
  );
  return names;
};

// Builds a map of local identifier -> prop name for one level of `const x =
// <propRef>` aliasing, so e.g. `const isDisabled = disabled` lets attributes
// referencing `isDisabled` still resolve back to the `disabled` prop.
const collectPropAliases = (node, sourceCode, props) => {
  const aliases = new Map();
  walkNodes(
    node.body,
    sourceCode,
    (current) => {
      if (current.type !== "VariableDeclarator") return;
      if (current.id.type !== "Identifier") return;
      const prop = referencedPropName(current.init, props);
      if (prop) aliases.set(current.id.name, prop);
    },
    { skipFunctions: true },
  );
  return aliases;
};

const inspectAttribute = (node, state, props, sourceCode, extra) => {
  const { contract, propAliases } = extra;
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
    const directProp = isPropertyKey
      ? undefined
      : referencedPropName(current, props);
    const prop =
      directProp ??
      (current.type === "Identifier" ? propAliases.get(current.name) : undefined);
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
  const spreadableIdentifiers = collectSpreadableIdentifiers(
    node,
    sourceCode,
    props,
  );
  const propAliases = collectPropAliases(node, sourceCode, props);
  const state = {
    acceptedProps: new Set(props.bindings.values()),
    hasContent: false,
    hasDisabledBehavior: false,
    hasFeedback: false,
    hasInteractiveHandler: false,
    hasRole: false,
    hasState: false,
  };

  state.hasInteractiveHandler = rendersInteractiveRoot(node, sourceCode);

  walkNodes(node.body, sourceCode, (current) => {
    const referenced = referencedPropName(current, props);
    if (referenced) state.acceptedProps.add(referenced);
    if (current.type === "JSXAttribute") {
      inspectAttribute(current, state, props, sourceCode, {
        contract,
        propAliases,
      });
    }
    if (
      current.type === "JSXSpreadAttribute" &&
      current.argument.type === "Identifier" &&
      spreadableIdentifiers.has(current.argument.name)
    ) {
      state.hasRole = true;
      state.hasState = true;
      state.hasDisabledBehavior = true;
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
        if (!component) return;
        const hasAllowList = contract.componentNames.size > 0;
        if (hasAllowList && !contract.componentNames.has(component)) return;
        const state = analyzeComponent(node, sourceCode, contract);
        if (!hasAllowList && !state.hasInteractiveHandler) return;
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
