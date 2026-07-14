# max-function-parameters

Bounds positional inputs to keep interfaces low-dimensional. The default limit is five; destructured options count as one input.

```js
"code-architecture/max-function-parameters": ["error", { max: 3 }]
```

TypeScript's explicit `this` parameter is ignored unless `countThisParameter` is true. When inputs are cohesive, prefer an options object. Otherwise split the function responsibility.

Reference: [TigerStyle](https://tigerstyle.dev/), especially logical interfaces and dimensionality.
