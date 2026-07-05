---
"@svebcomponents/build": patch
---

Remove a duplicate `import type { Options } from "tsdown"` in `inferComponents.test.ts` that broke `tsc` for the package (introduced by a merge conflict resolution in #79).
