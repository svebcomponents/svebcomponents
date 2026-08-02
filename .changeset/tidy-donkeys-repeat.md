---
"@svebcomponents/ssr": minor
---

Extract a host-framework-neutral `renderCustomElement` / `renderCustomElementSync` from the Svelte SSR wrappers.

Both wrappers previously carried an identical copy of the "look up the renderer, apply props, collect declarative shadow DOM" logic, differing only in whether they collected the shadow result synchronously. That logic now lives in `runtime/renderCustomElement.ts` and is exported from the package root, so host integrations for other frameworks can reuse it.

No behavior change for Svelte hosts.
