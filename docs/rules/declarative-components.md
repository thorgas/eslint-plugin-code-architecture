# declarative-components

> Optional React integration. Enable the `react` preset only when the project uses React and these component conventions.

Keeps components on two paths: read/display data and send events. By default it:

- bans `useState`, `useReducer`, `useEffect`, and `useLayoutEffect`;
- permits at most one `useMachine`, `useActor`, or `useActorRef` call;
- bans nested function declarations and `try` statements inside components.

A function is treated as a component only when it both matches `componentNamePattern` (default `^[A-Z]`) and actually returns JSX. A capitalized function that never renders JSX — a selector, a plain computation, a hook-like helper — is not a component and is left alone, even if it calls a forbidden hook. Configure `componentNamePattern`, `forbiddenHooks`, `actorHooks`, `maximumActorHooks`, `forbidInlineFunctions`, or `forbidTryStatements` for another UI convention.

`forbidInlineFunctions` only reports a nested function that is itself declared as a statement or bound to a local variable inside a component — a function declaration, or `const handler = () => ...`. A function passed directly as a JSX attribute value (`onPress={() => send("x")}`), as a call argument (`items.map((item) => <Row />)`, `useCallback(() => {...}, [])`), or in any other expression position is not independently named or reused, so it is not reported.

Invalid: `function Screen() { const [open] = useState(false); return <div>{open}</div>; }`. Valid: a component that reads a machine snapshot and calls `send`.

Known limits: JSX detection walks the function's own body (including nested functions), so a component that only returns JSX conditionally deep inside a callback is still recognized; a function that builds and returns a JSX-typed value without a literal `<Tag>` or `<>` in its own source is not.

## Production-derived example

This redacted startup screen renders machine state and forwards user intent; transitions and asynchronous work remain testable outside React:

```tsx
export function SplashScreen({ children }: PropsWithChildren) {
  const reduceMotion = useReducedMotion();
  const [snapshot, , actor] = useMachine(splashMachine);
  const fading = snapshot.matches(SPLASH_STATES.fading);

  return (
    <SplashLayout
      fading={fading}
      onReady={() =>
        actor.send({ type: reduceMotion ? "reducedMotion.ready" : "layout.ready" })
      }
    >
      {children}
    </SplashLayout>
  );
}
```

Machine tests can cover retries, failures, and race conditions without mounting the component. Coding agents can see that the component's responsibility is rendering state and sending events, instead of tracing local effects and nested callbacks to reconstruct its lifecycle. This convention is opt-in through the `react` preset or direct configuration; teams using ordinary React local state should not enable it unchanged.

Reference: Sandro Maglione, [Components take care of themselves](https://www.sandromaglione.com/newsletter/components-take-care-of-themselves).
