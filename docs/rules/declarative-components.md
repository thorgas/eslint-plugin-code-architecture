# declarative-components

Keeps components on two paths: read/display data and send events. By default it:

- bans `useState`, `useReducer`, `useEffect`, and `useLayoutEffect`;
- permits at most one `useMachine`, `useActor`, or `useActorRef` call;
- bans nested function declarations and `try` statements inside components.

Functions whose names match `^[A-Z]` are treated as components. Configure `componentNamePattern`, `forbiddenHooks`, `actorHooks`, `maximumActorHooks`, `forbidInlineFunctions`, or `forbidTryStatements` for another UI convention.

Invalid: `function Screen() { const [open] = useState(false) }`. Valid: a component that reads a machine snapshot and calls `send`.

Reference: Sandro Maglione, [Components take care of themselves](https://www.sandromaglione.com/newsletter/components-take-care-of-themselves).
