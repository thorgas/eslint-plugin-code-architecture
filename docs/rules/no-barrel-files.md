# no-barrel-files

Disallows `export * from` and named re-exports from another module. This applies to any filename, not only `index.ts`, because renamed barrels still hide dependency edges.

Invalid: `export { PaymentService } from "./payment.service.js"`. Valid: import the service directly at its use site.

Use `allowFiles` only for unavoidable generated or package-boundary files. Patterns are project-relative minimatch globs.

Reference: Marvin Hagemeister, [Speeding up the JavaScript ecosystem - The barrel file debacle](https://marvinh.dev/blog/speeding-up-javascript-ecosystem-part-7/).
