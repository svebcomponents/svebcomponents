---
"@svebcomponents/ssr": patch
---

Fix SSR breakage with svelte >= 5.36 and a chunk-ordering crash in production SvelteKit builds:

- `SvelteCustomElementRenderer.renderShadow` now recognizes svelte's lazily-evaluated `RenderOutput` (always thenable since svelte 5.36) and renders synchronous components through its sync `head`/`body` getters. This un-breaks the sync wrapper (`collectResultSync` previously threw `Promises not supported in collectResultSync` for every component); only genuinely asynchronous components now require the async wrapper.
- The generated SSR entry (`dist/server/ssr.js`) now installs the DOM shim via the new `@svebcomponents/ssr/shim` subpath export **before** loading the client custom-element bundle, and loads that bundle with a dynamic import. Previously, bundlers that code-split (e.g. rollup in a SvelteKit `adapter-node` build) could hoist the client bundle into a shared chunk that evaluated before the shim installed, crashing at startup with `Class extends value undefined is not a constructor or null` (svelte's `SvelteElement` captures `HTMLElement` at module-evaluation time). Dev mode was unaffected, which made the crash easy to miss.
