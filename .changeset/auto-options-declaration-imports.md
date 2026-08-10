---
"@svebcomponents/auto-options": patch
---

Fix the emitted declarations' relative imports so they resolve under
`moduleResolution: "node16"` and `"nodenext"`.

Four modules imported their types from `"./types"` without the `.js` extension.
The imports are type-only, so the compiled JavaScript was unaffected — but the
extensionless specifier survived into the emitted `.d.ts`, where it is invalid
under Node's ESM resolution. A consumer type-checking with `node16` and
`skipLibCheck: false` saw "Cannot find module './types'".

This mainly affected `@svebcomponents/auto-options/analyze`, whose declarations
reach `metadata.d.ts`. The repository did not catch it because its own tsconfig
resolves modules as a bundler would, where extensionless relative imports are
legal.
