# no-barrel-files

Disallows `export * from` and named re-exports from another module. This applies to any filename, not only `index.ts`, because renamed barrels still hide dependency edges.

Invalid: `export { PaymentService } from "./payment.service.js"`. Valid: import the service directly at its use site.

Use `allowFiles` only for unavoidable generated or package-boundary files. Patterns are project-relative minimatch globs.

## Production-derived example

A redacted service feature exposed its internals through a convenient barrel:

```ts
// billing/index.ts
export { chargeInvoice } from "./charge-invoice.js";
export { loadPaymentMethod } from "./load-payment-method.js";
export type { Invoice } from "./invoice.js";
```

The barrel was removed and each module remained its own explicit boundary:

```ts
// jobs/collect-overdue-invoices.ts
import { chargeInvoice } from "../billing/charge-invoice.js";
import type { Invoice } from "../billing/invoice.js";

export async function collectOverdueInvoice(invoice: Invoice): Promise<void> {
  await chargeInvoice(invoice);
}
```

Tests and agents can now see the actual dependency edge at the call site, so
changing `charge-invoice.ts` has a smaller, more searchable impact surface.

Reference: Marvin Hagemeister, [Speeding up the JavaScript ecosystem - The barrel file debacle](https://marvinh.dev/blog/speeding-up-javascript-ecosystem-part-7/).
