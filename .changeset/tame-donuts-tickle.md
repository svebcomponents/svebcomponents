---
"@svebcomponents/build": patch
---

Resolve browser bundles against the `production` export condition, so Svelte's dev-only code no longer ships to the browser.

Without it, `esm-env` resolved `DEV` through its `dev-fallback` — a runtime `process.env.NODE_ENV` check rather than a literal — so no `if (DEV)` branch in Svelte's runtime could be eliminated and the full dev-only error and warning message texts ended up in the published bundle. Cross-module const inlining is enabled alongside it, since rolldown otherwise emits the resolved `DEV` as a module-level `var` that the minifier will not fold into its use sites.

The e2e `basic` component's client bundle drops from 42.3 kB to 32.6 kB raw (15.9 kB to 12.7 kB gzipped).
