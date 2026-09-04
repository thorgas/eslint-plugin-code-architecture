import { dependencyReferences } from "./dependency-helpers.js";

const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Sort combined Evolu dependency wrapper types alphabetically",
      url: "https://www.evolu.dev/docs/dependency-injection",
    },
    messages: {
      sortDependencies:
        "Sort dependency types alphabetically: {{expected}}.",
    },
    schema: [],
  },
  create(context) {
    return {
      TSIntersectionType(node) {
        const references = node.types.map((type) => {
          const matches = dependencyReferences(type);
          return matches.length === 1 ? matches[0] : null;
        });
        if (references.some((reference) => reference === null)) return;

        const names = references.map(({ name }) => name);
        const expected = [...names].sort((left, right) =>
          left.localeCompare(right),
        );
        if (names.every((name, index) => name === expected[index])) return;

        context.report({
          data: { expected: expected.join(" & ") },
          messageId: "sortDependencies",
          node,
        });
      },
    };
  },
};

export default rule;
