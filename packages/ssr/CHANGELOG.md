# @svebcomponents/ssr

## 0.1.0

### Minor Changes

- c2f1b6c: Auto-detect the async SSR wrapper from the host app's svelte config.

  `svebcomponents({ async: true })` duplicated a fact the build already knows: an app compiled with `compilerOptions.experimental.async` needs the async wrapper, and an app without it cannot compile the async wrapper. Keeping the two in sync manually was an easy way to produce wrapper-mismatch hydration bugs.

  The vite plugin now reads `experimental.async` from vite-plugin-svelte's resolved options and picks the wrapper variant automatically. The explicit `async` option remains as an override.

- c2f1b6c: Support Svelte's `$host()` rune in hydratable components.

  Previously `$host()` was unusable in svebcomponents components: the SSR build compiles with `customElement: false`, where Svelte hard-errors on `$host()` (`host_invalid_placement`), and even on the client the hydrated path never supplied a host — Svelte compiles `$host()` to `$props.$host`, which only Svelte's own fresh-mount custom-element wrapper passed. Component authors had to fall back to dispatching `composed: true` events from an inner node and hoping they retarget.

  Now:

  - **Server**: the SSR source transform replaces `$host()` calls with `undefined` — behavior-identical to Svelte's own server transform (`$host()` → `void 0`). Components using `$host()` compile for SSR whether or not they declare `<svelte:options customElement>`.
  - **Client**: the hydration host passes the custom element through as `$host`, so `$host()` returns the upgraded element after hydration — exactly as it does in Svelte's fresh-mount path.

  `$host()` returns `undefined` during SSR (there is no host element), so guard uses that can run server-side (`$host()?.dispatchEvent(...)`) — event handlers, `onMount`, and `$effect` bodies never run during SSR and need no guard.

  Note for editor tooling: Svelte's language server still reports `host_invalid_placement` unless the component declares `<svelte:options customElement>` in source. Declaring it is safe — the SSR build strips it (and since the reflect-defaults change, a bare `customElement="tag-name"` needs no prop overrides).

- c2f1b6c: Hydratable custom elements: server-rendered declarative shadow DOM is now **hydrated** instead of being wiped and re-rendered when the element upgrades.

  Previously, svelte's generated custom element always called `attachShadow` (clearing the declarative shadow root per spec) and then `mount`ed the component from scratch — losing the server-rendered DOM, transient state, and re-creating every node. Now, `@svebcomponents/build` compiles components as hydratable by default:

  - `@svebcomponents/auto-options` injects svelte's official `customElement.extend` hook wired to the new `hydratable` wrapper from `@svebcomponents/ssr/hydration`.
  - The wrapper claims the declarative shadow root before svelte can clear it and hydrates it via svelte's public `hydrate()` API — the server-rendered nodes are adopted in place, styles are deduped by svelte itself, and the component is fully reactive afterwards.
  - On the server, the generated SSR entry renders through a `HydrationHost` component (also used on the client) so the markup structure matches by construction.
  - Anything non-hydratable — no declarative shadow root, slotted components, reconnection after teardown — falls back to svelte's untouched mount path, and svelte's own hydration mismatch recovery re-mounts, so a failed hydration degrades to exactly the previous behavior.

  Opt out per package with `defineConfig({ hydratable: false })` (or per component by declaring your own `extend`). Client custom-element bundles are now built with `platform: "browser"`, so browser export conditions resolve correctly.

  Known limitations (fall back to mount): components with slots (expected to become hydratable with Svelte 6, when slots are no longer compiled through the legacy transformation — a dev-mode `console.info` makes the fallback visible); legacy `createEventDispatcher` events on hydrated elements (native `$host()` events are unaffected); component `export`s are not exposed on hydrated hosts. See the new [Hydration docs](https://svebcomponents.dev/core-concepts/hydration/) for details.

### Patch Changes

- 8bceff0: Fix a race that could corrupt build output when several components share an output directory (e.g. multiple components inferred from package.json `exports` writing to `dist/client`): component configs are built in parallel and tsdown's default per-build `clean` deleted sibling builds' output. The config factories now set `clean: false` and the `svebcomponents` CLI cleans each distinct output directory once before building.
- 8bceff0: Fix SSR breakage with svelte >= 5.36 and a chunk-ordering crash in production SvelteKit builds:

  - `SvelteCustomElementRenderer.renderShadow` now recognizes svelte's lazily-evaluated `RenderOutput` (always thenable since svelte 5.36) and renders synchronous components through its sync `head`/`body` getters. This un-breaks the sync wrapper (`collectResultSync` previously threw `Promises not supported in collectResultSync` for every component); only genuinely asynchronous components now require the async wrapper.
  - The generated SSR entry (`dist/server/ssr.js`) now installs the DOM shim via the new `@svebcomponents/ssr/shim` subpath export **before** loading the client custom-element bundle, and loads that bundle with a dynamic import. Previously, bundlers that code-split (e.g. rollup in a SvelteKit `adapter-node` build) could hoist the client bundle into a shared chunk that evaluated before the shim installed, crashing at startup with `Class extends value undefined is not a constructor or null` (svelte's `SvelteElement` captures `HTMLElement` at module-evaluation time). Dev mode was unaffected, which made the crash easy to miss.

- c2f1b6c: Fix a flash of unstyled content (FOUC) when a component declares an explicit `<svelte:options customElement={{ ... }}>`.

  The SSR build compiles components with `customElement: false` (it renders the shadow _content_, not a custom element). But when the source declares `<svelte:options customElement>`, Svelte treats the component's `<style>` as belonging to a custom element's shadow root and drops it entirely from the server render — the compiler emits no `css.add`, so the server output carries scoped class names with no `<style>`. The result is server-rendered shadow DOM that stays unstyled until the client bundle injects the styles at hydration.

  A new build step (`pluginStripCustomElementOptions`) removes the `customElement` option from `<svelte:options>` before the server compile, so the CSS is emitted and placed inside the declarative shadow root — styled at first paint, no flash. The client build keeps `customElement` (where the element is defined), so only SSR output changes. Components without an explicit `<svelte:options customElement>` (the common case, where auto-options injects it into the client build only) were already unaffected.

- c2f1b6c: Declare `vite`, `tsdown`, and `rolldown` as optional peer dependencies of `@svebcomponents/ssr`.

  The `./vite` and `./tsdown` entries type against these packages, but they were only devDependencies — under pnpm's isolated layout a consumer's TypeScript resolves the emitted declarations against a _different_ installation than the consumer's own, so the plugin's `Plugin` type never unifies with the consumer's `PluginOption` and every consumer needs an `as unknown as PluginOption` cast. Declaring them as optional peers makes the package resolve the consumer's copies, so the types unify. Optional because the runtime entries (`.`, `/shim`, `/hydration`) need none of them.

  `@svebcomponents/build`: `createTsdownConfig` now has an explicit `Options` return type — the inferred type referenced rollup's plugin types through non-portable `.pnpm` paths (TS2742) in the emitted declarations.

- Updated dependencies [c2f1b6c]
  - @svebcomponents/utils@0.1.0

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
