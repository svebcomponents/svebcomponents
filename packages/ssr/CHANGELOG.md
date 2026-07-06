# @svebcomponents/ssr

## 0.0.8

### Patch Changes

- 257e5b0: Load package Svelte config during builds and support async SSR when that config enables Svelte's experimental async compiler mode. Host apps can opt into the async Vite wrapper for Svelte async SSR.
- 257e5b0: Share the Svelte build config helpers (`SvelteBuildConfig`, `mergeCompilerOptions`) from a single home in `@svebcomponents/ssr` via a new `@svebcomponents/ssr/svelte-config` export, instead of duplicating them in `@svebcomponents/build`. This removes the risk of the two copies drifting apart.
- f02d6ee: document DOM-shim import-order requirement
- 742c433: Fix `installShim` unconditionally overwriting existing `Element`, `HTMLElement`, and `customElements` globals, which silently dropped custom elements already registered by another DOM shim or jsdom-based test setup.
- 2c2510b: Generate the SSR renderer entry filename from the declared package export instead of hardcoding `ssr.js`.

  Previously every SSR build wrote `<ssrOutDir>/ssr.js` regardless of the declared export. This meant the multi-component setup documented in the build README (e.g. `"./button/ssr": "./dist/server/button-ssr.js"`) produced a dangling export, and two SSR components sharing an output directory overwrote each other's generated entry.

  `inferComponents` now derives the entry basename from the declared ssr export path, and a new `ssrEntryFileName` option on `defineConfig` (defaulting to `"ssr"`) threads it through `svebcomponentsSsr` into `pluginGenerateSsrEntry`. Single-component behavior is unchanged.

- 724f00a: Declare supported Node versions (`engines.node: ">=20.19.0"`) so consumers get a clear error instead of an opaque runtime failure on unsupported Node versions.
- 303541d: Fix `ElementRendererRegistry.has()` to correctly walk the element prototype chain, matching the behavior of `get()`.
- 0d74921: Clean up `SvelteCustomElementRenderer.setAttribute` by removing the dead non-string branch (all callers honor the string contract; non-string values go through `setProperty`), and add a `removeAttribute` method that deletes the attribute from the internal SSR attribute map and notifies the client element via `attributeChangedCallback(name, oldValue, null)`, mirroring browser semantics.
- 94530d0: Pass the resolved tag name through generated SSR renderer entries so the base `ElementRenderer` receives a defined `tagName`.
- 4ca91b2: Fix the Vite transform mistakenly wrapping spec-reserved SVG/MathML tag names (`font-face`, `font-face-src`, `font-face-uri`, `font-face-format`, `font-face-name`, `annotation-xml`, `color-profile`, `missing-glyph`) as custom elements just because they contain a dash. These names are explicitly excluded from valid custom element names by the HTML spec, and wrapping them corrupted otherwise-valid SVG/MathML markup.
- 8913436: Drop test and build tooling from runtime dependencies: `vitest`, `rolldown`, `typescript`, and `tslib` are no longer installed when consuming `@svebcomponents/ssr`, and `typescript`/`tslib` are no longer installed when consuming `@svebcomponents/build`. These were only used for tests, type-only imports, or package builds and are now devDependencies (or removed entirely).
- d51f92b: Fix the SSR Vite plugin corrupting self-closing custom elements (`<my-widget />`), which silently dropped the `_tagName` prop and broke SSR.
- 2f11d81: Use `attr` from `svelte/internal/server` instead of `svelte/internal/client` in the SSR slot override virtual module, so server bundles no longer directly depend on Svelte's client-internal entry point. Rendered output is unchanged: both entries re-export the same shared `attr` implementation.
- f8970a8: Escape slot names via JSON.stringify in the vite plugin's slot attribute transform, preventing syntax errors from slot names containing quotes.
- 5c8d636: Export `createElementRendererRegistry` factory for creating isolated renderer registry instances (e.g. in tests), alongside the unchanged global `ElementRendererRegistry` accessor.
- e4fe34f: Add a `types` condition to the `./wrapper-component` export so TypeScript and svelte-check can resolve the wrapper component's types in consuming projects.
- 1e14cc5: Remove leftover debug markers (`<p>server</p>` / `<p>client</p>`) from the SSR wrapper components that were leaking into consumer apps' SSR output and breaking hydration matching.
- f75af70: Render SSR host attributes for Svelte custom elements, including reflected props, while using Svelte's SSR attribute serializer for escaped attribute values and boolean attributes.
- 3a4d68e: docs: make SSR security/limitations statements precise and current
- Updated dependencies [9be6326]
- Updated dependencies [724f00a]
- Updated dependencies [e7e4adf]
- Updated dependencies [d2094d2]
  - @svebcomponents/utils@0.0.3

## 0.0.7

### Patch Changes

- b282163: fix: migrate to tsdown to emit types again

## 0.0.6

### Patch Changes

- 1c5b92f: refactor!: migrate to rolldown

  since the minification logic of rolldown is different than rollup & rolldown is also still in beta, this is a breaking change

- 1b1aea0: fix: imrpove faulty ctor lookup logic

## 0.0.5

### Patch Changes

- a1bc248: fix: consider that component children might be undefined

## 0.0.4

### Patch Changes

- 6fd10e7: fix: add @rollup/plugin-typescript peer deps

## 0.0.3

### Patch Changes

- 8aa8512: fix: publish private utils dependency
- Updated dependencies [8aa8512]
  - @svebcomponents/utils@0.0.2

## 0.0.2

### Patch Changes

- 5cedd02: fix: set dependencies correctly
