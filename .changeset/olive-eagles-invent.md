---
"@svebcomponents/ssr": minor
---

Make the SSR runtime agnostic to how a custom element's renderer is implemented, and make svebcomponents' own renderers usable by other SSR pipelines.

`renderCustomElement` previously rejected any renderer that was not a `SvelteCustomElementRenderer`, because it read host attributes through `getSsrAttributes()` — a svebcomponents-specific method added when the Svelte wrapper switched to `<svelte:element {...attributes}>` for hydration, which needs a name→value record rather than the serialized string Lit's `renderAttributes()` returns.

The renderer now keeps host attributes on Lit's `ElementRenderer.element` (svelte's generated custom element class is itself an SSR-shim element), so the record comes from `element.attributes` — the same standard surface `@lit-labs/ssr-react` reads. The guard and `getSsrAttributes()` are both gone, and any conforming `ElementRenderer` can be registered and rendered.

Compatibility now runs in both directions.

Generated SSR entry points implement Lit's static `matchesClass` hook, so they can be passed straight to `@lit-labs/ssr`'s `render()` in `elementRenderers` with no adapter.

And `ElementRendererRegistry` gains `use()`, which registers a renderer that selects its own elements through `matchesClass` — `ElementRendererRegistry.use(LitElementRenderer)` makes every LitElement in the app server-renderable through any svebcomponents host integration. Renderers now also receive a fully-formed Lit `RenderInfo` rather than a stub, which is what lets a renderer whose shadow content is itself a template (LitElementRenderer calls `renderValue(value, renderInfo)`) work at all, and lets nested custom elements resolve through the same registry.

`e2e/lit-ssr` covers both directions: svebcomponents components rendered through Lit's pipeline, and a plain Lit element rendered through svebcomponents'.

Also adds a `./enable-async` entry point. Svelte gates async SSR behind a module-global flag normally flipped by a Svelte app compiled with `experimental.async`; a non-Svelte host has to opt in explicitly or async components throw `await_invalid`.

Breaking for anyone who called `getSsrAttributes()` or `isSvelteCustomElementRenderer()` directly; both are removed. Neither was part of a documented workflow.
