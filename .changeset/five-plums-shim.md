---
"@svebcomponents/ssr": patch
---

`Server.svelte`/`AsyncServer.svelte` now install the DOM shim themselves as their first import, instead of depending on the consuming app happening to import `@svebcomponents/ssr` before anything else renders. These wrapper components — the ones Vite's dev-time transform and the generated production SSR entry actually load on every custom-element render — previously imported runtime modules directly and never triggered the package's own shim-install side effect, relying entirely on the consuming app's own import order. `installShim`'s effects are idempotent, so this is safe to run alongside any existing manual shim import too.
