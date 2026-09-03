# declarative-components

> Optional React integration. Enable the `react` preset only when the project uses React and these component conventions.

Keeps components on two paths: read/display data and send events. By default it:

- bans `useState`, `useReducer`, `useEffect`, and `useLayoutEffect`;
- permits at most one `useMachine`, `useActor`, or `useActorRef` call;
- bans nested function declarations and `try` statements inside components.

Functions whose names match `^[A-Z]` are treated as components. Configure `componentNamePattern`, `forbiddenHooks`, `actorHooks`, `maximumActorHooks`, `forbidInlineFunctions`, or `forbidTryStatements` for another UI convention.

Invalid: `function Screen() { const [open] = useState(false) }`. Valid: a component that reads a machine snapshot and calls `send`.

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
