---
"@svebcomponents/ssr": minor
"@svebcomponents/build": minor
---

Fixes the real gap behind "customElements not defined" / "renderer not found" errors: nothing in this package ever called `ElementRendererRegistry.set()` — it was a fully manual, documented step, and doing it the natural way (a static top-level import in `hooks.server.ts`) could reintroduce the exact chunk-hoisting hazard the generated SSR entry was designed to dodge, breaking production prerender builds.

- The generated SSR renderer entry now self-registers with `ElementRendererRegistry` when the component's tag name can be determined at build time (read from its `defineElement("tag", Component)` call, which every component entry point already makes). Consuming apps no longer need to import `ElementRendererRegistry` and call `.set()` by hand — a bare `import "my-component-package/ssr"` is enough. Falls back to today's manual registration when the tag can't be determined statically (e.g. a dynamically computed tag).
- Components with an SSR build now get a runtime-guarded shim install (`if (typeof window === "undefined") { await import("@svebcomponents/ssr/shim"); }`) prepended ahead of all bundled client code, so a custom element's compiled class can never evaluate before the shim installs — regardless of which import path reaches it first (a generated SSR entry's controlled dynamic import, or a consuming app's own static import needed for browser registration, which frameworks like SvelteKit compile into the server bundle too). Scoped to SSR-enabled components only: referencing the optional `@svebcomponents/ssr` peer at all, even behind a runtime check, makes dev-server tooling (Vite's import analysis) try to resolve it — so browser-only components never get this guard and are unaffected.
