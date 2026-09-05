import { expect, test } from "bun:test";
import rule from "../rules/require-interactive-component-contract.js";
import { lintRule } from "./rule-tester.js";

const options = [{ componentNames: ["Button", "IconButton"] }];

const lint = (code, ruleOptions = options) =>
  lintRule({
    code,
    filename: "src/components/ui/button.tsx",
    options: ruleOptions,
    rule,
    ruleName: "require-interactive-component-contract",
  });

test("require-interactive-component-contract accepts a complete contract", () => {
  const messages = lint(`function Button({ children, disabled }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        style={({ pressed }) => [styles.root, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }`);

  expect(messages).toHaveLength(0);
});

test("require-interactive-component-contract reports missing contract parts", () => {
  const messages = lint(`function Button({ id }) {
    return <Pressable onPress={save} testID={id} />;
  }`);

  expect(messages).toHaveLength(1);
  expect(messages[0]?.message).toContain("accessibility role");
  expect(messages[0]?.message).toContain("disabled behavior");
  expect(messages[0]?.message).toContain("press feedback");
  expect(messages[0]?.message).toContain("configurable content");
});

test("require-interactive-component-contract requires disabled wiring", () => {
  const messages = lint(`function Button({ children, disabled }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: false }}
        android_ripple={{ color: theme.ripple }}
      >
        {children}
      </Pressable>
    );
  }`);

  expect(messages).toHaveLength(1);
  expect(messages[0]?.message).toContain("disabled behavior");
});

test("require-interactive-component-contract ignores other components", () => {
  expect(lint("function Card() { return <View />; }")).toHaveLength(0);
});

// (a) JSXSpreadAttribute forwarding
test("require-interactive-component-contract treats spreading the props identifier as forwarding role/state/disabled", () => {
  const messages = lint(`function Button(props) {
    return <TouchableOpacity {...props} testID={String(props.disabled)} style={({ pressed }) => [pressed]}>{props.children}</TouchableOpacity>;
  }`);

  expect(messages).toHaveLength(0);
});

test("require-interactive-component-contract treats spreading a destructured rest element as forwarding role/state/disabled", () => {
  const messages = lint(`function Button({ onPress, children, disabled, ...rest }) {
    return <button {...rest} style={({ pressed }) => [pressed]}>{children}</button>;
  }`);

  expect(messages).toHaveLength(0);
});

test("require-interactive-component-contract follows one level of aliasing when tracing a spread argument", () => {
  const messages = lint(`function Button({ children, disabled, ...rest }) {
    const forwarded = rest;
    return <button {...forwarded} style={({ pressed }) => [pressed]}>{children}</button>;
  }`);

  expect(messages).toHaveLength(0);
});

// (b) defaults / componentNames optional
test("require-interactive-component-contract works with an empty options object using shipped defaults", () => {
  const messages = lintRule({
    code: `function Button({ children, disabled }) {
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          disabled={disabled}
          style={({ pressed }) => [styles.root, pressed && styles.pressed]}
        >
          {children}
        </Pressable>
      );
    }`,
    filename: "src/components/ui/button.tsx",
    options: [{ componentNames: ["Button"] }],
    rule,
    ruleName: "require-interactive-component-contract",
  });

  expect(messages).toHaveLength(0);
});

test("require-interactive-component-contract detects interactive components without a componentNames allow-list", () => {
  const messages = lintRule({
    code: `function Weird({ children }) {
      return <View onPress={fn}>{children}</View>;
    }`,
    filename: "src/components/ui/weird.tsx",
    options: [{}],
    rule,
    ruleName: "require-interactive-component-contract",
  });

  expect(messages).toHaveLength(1);
  expect(messages[0]?.message).toContain("accessibility role");
});

test("require-interactive-component-contract ignores screens that merely contain pressable elements", () => {
  const messages = lintRule({
    code: `function CheckInScreen({ onSave, onCancel, title }) {
      return (
        <View>
          <Text>{title}</Text>
          <Pressable onPress={onSave}><Text>Save</Text></Pressable>
          <Pressable onPress={onCancel}><Text>Cancel</Text></Pressable>
        </View>
      );
    }
    const Wrapped = ({ children, onPress }) => (
      <View style={styles.wrapper}>
        <Pressable onPress={onPress}>{children}</Pressable>
      </View>
    );`,
    filename: "src/features/check-in/ui/check-in-screen.tsx",
    options: [],
    rule,
    ruleName: "require-interactive-component-contract",
  });

  expect(messages.map(({ message }) => /component '(\w+)'/u.exec(message)?.[1])).toEqual([
    "Wrapped",
  ]);
});

test("require-interactive-component-contract runs with bare 'error' and no options object", () => {
  const messages = lintRule({
    code: `function Button({ children }) {
      return <Pressable onPress={fn}>{children}</Pressable>;
    }`,
    filename: "src/components/ui/button.tsx",
    options: [],
    rule,
    ruleName: "require-interactive-component-contract",
  });

  expect(messages).toHaveLength(1);
});

// (c) Pressable-style function feedback
test("require-interactive-component-contract recognizes a pressed-destructuring style function as feedback", () => {
  const messages = lint(`function Button({ children, disabled }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }`);

  expect(messages).toHaveLength(0);
});

// (d) one-level disabled aliasing
test("require-interactive-component-contract follows one level of aliasing for the disabled prop", () => {
  const messages = lint(`function Button({ children, disabled }) {
    const isDisabled = disabled;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
        disabled={isDisabled}
        style={({ pressed }) => [pressed]}
      >
        {children}
      </Pressable>
    );
  }`);

  expect(messages).toHaveLength(0);
});

test("require-interactive-component-contract trusts declared contract components without excusing wrapper props", () => {
  const complete = lintRule({
    code: `function ActionButton({ children, disabled, label, onPress }) {
      return <Button.Root disabled={disabled} label={label} onPress={onPress}>{children}</Button.Root>;
    }`,
    filename: "src/features/reminders/ui/action-button.tsx",
    options: [{ contractComponents: ["Button.Root"] }],
    rule,
    ruleName: "require-interactive-component-contract",
  });
  const incomplete = lintRule({
    code: `function ActionButton({ label, onPress }) {
      return <Button.Root label={label} onPress={onPress}>{label}</Button.Root>;
    }`,
    filename: "src/features/reminders/ui/action-button.tsx",
    options: [{ contractComponents: ["Button.Root"] }],
    rule,
    ruleName: "require-interactive-component-contract",
  });
  const missingContent = lintRule({
    code: `function ActionButton({ disabled, onPress }) {
      return <Button.Root disabled={disabled} label="Save" onPress={onPress}>Save</Button.Root>;
    }`,
    filename: "src/features/reminders/ui/action-button.tsx",
    options: [{ contractComponents: ["Button.Root"] }],
    rule,
    ruleName: "require-interactive-component-contract",
  });

  expect(complete).toHaveLength(0);
  expect(incomplete).toHaveLength(1);
  expect(incomplete[0]?.message).toContain("disabled behavior");
  expect(missingContent).toHaveLength(1);
  expect(missingContent[0]?.message).toContain("configurable content");
});

test("require-interactive-component-contract requires disabled wiring on the interactive primitive", () => {
  const messages = lint(`function Button({ children, disabled, onPress }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        onPress={onPress}
        style={({ pressed }) => pressed && styles.pressed}
      >
        {children}
      </Pressable>
    );
  }`);

  expect(messages).toHaveLength(1);
  expect(messages[0]?.message).toContain("disabled behavior");
});

test("require-interactive-component-contract does not treat static style as feedback", () => {
  const messages = lint(`function Button({ children, disabled, onPress }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={{ padding: 8 }}
      >
        {children}
      </Pressable>
    );
  }`);

  expect(messages).toHaveLength(1);
  expect(messages[0]?.message).toContain("press feedback");
});

test("require-interactive-component-contract does not combine evidence across return paths", () => {
  const messages = lint(`function Button({ children, disabled, onPress, primary }) {
    if (primary) {
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={onPress}
          style={({ pressed }) => pressed && styles.pressed}
        >
          {children}
        </Pressable>
      );
    }
    return <Pressable disabled={disabled} onPress={onPress}>{children}</Pressable>;
  }`);

  expect(messages).toHaveLength(1);
  expect(messages[0]?.message).toContain("accessibility role");
  expect(messages[0]?.message).toContain("press feedback");
});

test("require-interactive-component-contract follows single-child provider nesting for configured components", () => {
  const messages = lint(`function Button({ children, disabled, loading, onPress }) {
    return (
      <SizeContext.Provider value="regular">
        <VariantContext.Provider value="primary">
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: loading, disabled: disabled || loading }}
            disabled={disabled || loading}
            onPress={onPress}
            style={({ pressed }) => pressed && styles.pressed}
          >
            {loading ? <Spinner /> : children}
          </Pressable>
        </VariantContext.Provider>
      </SizeContext.Provider>
    );
  }`, [{ componentNames: ["Button"], disabledProps: ["disabled", "loading"] }]);

  expect(messages).toHaveLength(0);
});

test("require-interactive-component-contract wires every configured unavailable prop", () => {
  const messages = lint(`function Button({ children, disabled, loading, onPress }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ busy: loading, disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => pressed && styles.pressed}
      >
        {loading ? <Spinner /> : children}
      </Pressable>
    );
  }`, [{ componentNames: ["Button"], disabledProps: ["disabled", "loading"] }]);

  expect(messages).toHaveLength(1);
  expect(messages[0]?.message).toContain("disabled behavior");
});

test("require-interactive-component-contract trusts configured feedback components only for feedback", () => {
  const messages = lint(`function Button({ children, disabled, onPress }) {
    return (
      <PressableScale
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={styles.button}
      >
        {children}
      </PressableScale>
    );
  }`, [{
    componentNames: ["Button"],
    feedbackComponents: ["PressableScale"],
  }]);

  expect(messages).toHaveLength(0);
});

test("require-interactive-component-contract ignores noninteractive paths of auto-detected components", () => {
  const messages = lintRule({
    code: `function Notice({ children, disabled, onPress }) {
      if (!onPress) return <Text>{children}</Text>;
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={onPress}
          style={({ pressed }) => pressed && styles.pressed}
        >
          {children}
        </Pressable>
      );
    }`,
    filename: "src/components/ui/notice.tsx",
    rule,
    ruleName: "require-interactive-component-contract",
  });

  expect(messages).toHaveLength(0);
});
