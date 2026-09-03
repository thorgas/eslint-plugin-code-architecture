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

## Production-derived example

In a redacted synchronization service, one long function fetched remote rows,
normalized them, reconciled local state, and persisted a checkpoint. A test had
to construct every dependency just to exercise normalization:

```ts
async function synchronizeAccount(accountId: string): Promise<SyncSummary> {
  const checkpoint = await checkpointStore.load(accountId);
  const response = await remoteApi.pull({ accountId, checkpoint });
  const normalized = response.rows.map((row) => ({
    id: normalizeId(row.external_id),
    title: row.title.trim(),
    updatedAt: new Date(row.updated_at),
  }));
  const changes = reconcile(localStore.snapshot(accountId), normalized);
  await localStore.apply(accountId, changes);
  await checkpointStore.save(accountId, response.checkpoint);
  return summarize(changes);
  // The production function continued with retries, telemetry, cleanup, and
  // several branches, pushing it beyond the configured physical-line limit.
}
```

The line limit forced the pure decision work behind a small interface:

```ts
export function normalizeRemoteRows(
  rows: ReadonlyArray<RemoteRow>,
): ReadonlyArray<LocalRecord> {
  return rows.map((row) => ({
    id: normalizeId(row.external_id),
    title: row.title.trim(),
    updatedAt: new Date(row.updated_at),
  }));
}

async function synchronizeAccount(accountId: string): Promise<SyncSummary> {
  const checkpoint = await checkpointStore.load(accountId);
  const response = await remoteApi.pull({ accountId, checkpoint });
  const remoteRecords = normalizeRemoteRows(response.rows);
  const changes = reconcile(localStore.snapshot(accountId), remoteRecords);

  await localStore.apply(accountId, changes);
  await checkpointStore.save(accountId, response.checkpoint);
  return summarize(changes);
}
```

`normalizeRemoteRows` can now be tested with plain values, while orchestration
tests can focus on ordering and failures. This is also an agent-speed rule:
short functions expose responsibility boundaries, require less context to edit,
and make generated patches easier to verify without weakening test coverage.

Reference: TigerBeetle, [TigerStyle](https://github.com/tigerbeetle/tigerbeetle/blob/main/docs/TIGER_STYLE.md), which specifies the 70-line physical limit.
