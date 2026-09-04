import {
  dependencyParameter,
  dependencyReferences,
  parameterType,
} from "./dependency-helpers.js";

const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require functions to accept dependencies as one argument named deps",
      url: "https://www.evolu.dev/docs/dependency-injection",
    },
    messages: {
      nameDeps: "Name the dependency argument 'deps'.",
      singleDepsArgument:
        "Keep dependencies in one outer argument named 'deps'; curry regular function arguments separately.",
    },
    schema: [],
  },
  create(context) {
    const inspect = (node) => {
      const dependency = dependencyParameter(node);
      if (!dependency) return;

      const dependencyArguments = node.params.filter(
        (parameter) =>
          dependencyReferences(parameterType(parameter)).length > 0,
      );
      if (node.params.length !== 1 || dependencyArguments.length !== 1) {
        context.report({
          messageId: "singleDepsArgument",
          node: dependency.parameter,
        });
        return;
      }

      if (
        dependency.parameter.type !== "Identifier" ||
        dependency.parameter.name !== "deps"
      ) {
        context.report({ messageId: "nameDeps", node: dependency.parameter });
      }
    };

    return { ":function": inspect };
  },
};

export default rule;
