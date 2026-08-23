# max-function-lines

Enforces a physical function line limit. The default is TigerStyle's hard limit of 70 lines, including the signature and braces.

```js
"code-architecture/max-function-lines": [
  "error",
  { ignoreJSX: true, max: 70 },
]
```

The built-in presets set `ignoreJSX: true`, so the limit applies to logic functions while JSX UI functions remain unrestricted. JSX is assigned to its nearest containing function, so a long logic helper is still checked even when a nested render helper contains JSX. Direct rule configurations retain the previous behavior unless they enable this option.

Set `skipBlankLines` only when blank lines should not count. Prefer keeping control flow in a parent function and extracting focused, low-branch leaf logic.

Reference: TigerBeetle, [TigerStyle](https://github.com/tigerbeetle/tigerbeetle/blob/main/docs/TIGER_STYLE.md), which specifies the 70-line physical limit.
