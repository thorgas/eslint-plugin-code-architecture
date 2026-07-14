# max-function-lines

Enforces a physical function line limit. The default is TigerStyle's hard limit of 70 lines, including the signature and braces.

```js
"code-architecture/max-function-lines": ["error", { max: 70 }]
```

Set `skipBlankLines` only when blank lines should not count. Prefer keeping control flow in a parent function and extracting focused, low-branch leaf logic.

Reference: TigerBeetle, [TigerStyle](https://github.com/tigerbeetle/tigerbeetle/blob/main/docs/TIGER_STYLE.md), which specifies the 70-line physical limit.
