---
"@svebcomponents/ssr": patch
---

Use `attr` from `svelte/internal/server` instead of `svelte/internal/client` in the SSR slot override virtual module, so server bundles no longer directly depend on Svelte's client-internal entry point. Rendered output is unchanged: both entries re-export the same shared `attr` implementation.
