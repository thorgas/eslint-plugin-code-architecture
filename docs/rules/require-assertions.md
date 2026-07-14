# require-assertions

Requires a minimum number of runtime assertions per function. The TigerStyle preset uses two.

Default assertion names are `assert`, `assertDefined`, `nodeAssert`, and `nodeAssert.ok`. Configure `assertionNames` for application helpers, `minimum` for density, `minimumStatements` for trivial-function handling, and `checkExpressionBodies` for concise arrows.

Assertions inside a nested function count only toward that nested function. Assert inputs, return values, invariants, and both positive and negative space; do not add meaningless assertions to satisfy the count.

Reference: TigerBeetle, [TigerStyle](https://github.com/tigerbeetle/tigerbeetle/blob/main/docs/TIGER_STYLE.md), including assertion density, paired assertions, and positive/negative space.
