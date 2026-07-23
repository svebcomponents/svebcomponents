# @svebcomponents/build

## 0.3.1

### Patch Changes

- d714a97: The client build of a hydratable component now bundles `@svebcomponents/ssr`'s `HydrationHost` (compiled by the component's own toolchain, exactly like the server-side host) instead of leaving `import ... from "@svebcomponents/ssr/hydration-host"` as an external runtime import. That subpath ships as raw `.svelte`, so an external import resolved to an uncompiled `.svelte` at runtime — which a consuming app's SSR could only load by adding every such component to `ssr.noExternal`. With the host bundled, consuming apps no longer need a per-component `ssr.noExternal` entry. Hydration markers still match by construction because both the client and server host are compiled by the same (component author's) build.

## 0.3.0

### Minor Changes

- fe3e191: - The generated SSR renderer entry now self-registers with `ElementRendererRegistry` when the component's tag name can be determined at build time (read from its `defineElement("tag", Component)` call, which every component entry point already makes). Consuming apps no longer need to import `ElementRendererRegistry` and call `.set()` by hand — a bare `import "my-component-package/ssr"` is enough. Falls back to today's manual registration when the tag can't be determined statically (e.g. a dynamically computed tag).
  - Components with an SSR build now get a runtime-guarded shim install (`if (typeof window === "undefined") { await import("@svebcomponents/ssr/shim"); }`) prepended ahead of all bundled client code, so a custom element's compiled class can never evaluate before the shim installs — regardless of which import path reaches it first (a generated SSR entry's controlled dynamic import, or a consuming app's own static import needed for browser registration, which frameworks like SvelteKit compile into the server bundle too). Scoped to SSR-enabled components only: referencing the optional `@svebcomponents/ssr` peer at all, even behind a runtime check, makes dev-server tooling (Vite's import analysis) try to resolve it — so browser-only components never get this guard and are unaffected.
- fe3e191: Components can now declare their custom element tag with Svelte's own string-shorthand syntax, and never need a manual registration call:

  ```svelte
  <svelte:options customElement="my-component" />
  ```

  `@svebcomponents/auto-options` expands this into the object form, merging in the inferred `props` (previously this form was rejected outright — `<svelte:options customElement="tag-name"/>` bailed with a warning and skipped prop inference entirely). The object form (`customElement={{ tag: "..." }}`) is unaffected.

  `@svebcomponents/build`'s browser build now guards Svelte's own auto-generated `customElements.define(...)` call against being run more than once — the actual reason component entrypoints previously had to hand-write a guarded registration via `@svebcomponents/utils`'s `defineElement`. That's no longer necessary: a package entrypoint can simply re-export its component, with no registration call at all. `defineElement` remains available as a manual escape hatch for tags that can't be a literal in `<svelte:options>` (e.g. computed at build time).

  `@svebcomponents/ssr`'s generated SSR entry now reads a component's tag from its `<svelte:options customElement>` declaration (via `svelte/compiler`'s normalized `parse()` output, which resolves both syntax forms identically) instead of regexing a `defineElement(...)` call out of the entry file — no behavior change for consumers, just a more direct source now that the tag no longer needs to live in a separate manual call.

### Patch Changes

- Updated dependencies [7164bd3]
- Updated dependencies [fe3e191]
- Updated dependencies [fe3e191]
- Updated dependencies [6a8034f]
  - @svebcomponents/ssr@0.3.0
  - @svebcomponents/auto-options@0.2.0

## 0.2.1

### Patch Changes

- db1bec7: Fix the CLI entry point on Windows by converting its absolute path to a file URL before importing it. Align `tsdown` with consumer installations through a peer dependency and make the `defineConfig` return type explicit so exported configs have portable declaration types.

## 0.2.0

### Minor Changes

- bb1ca02: Add automatically discovered, server-only `entry.ssr.ts` preparation hooks for
  setting component properties before SSR and serializing the results for
  hydration.

### Patch Changes

- Updated dependencies [bb1ca02]
  - @svebcomponents/ssr@0.2.0

## 0.1.0

### Minor Changes

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
- c2f1b6c: Declare `vite`, `tsdown`, and `rolldown` as optional peer dependencies of `@svebcomponents/ssr`.

  The `./vite` and `./tsdown` entries type against these packages, but they were only devDependencies — under pnpm's isolated layout a consumer's TypeScript resolves the emitted declarations against a _different_ installation than the consumer's own, so the plugin's `Plugin` type never unifies with the consumer's `PluginOption` and every consumer needs an `as unknown as PluginOption` cast. Declaring them as optional peers makes the package resolve the consumer's copies, so the types unify. Optional because the runtime entries (`.`, `/shim`, `/hydration`) need none of them.

  `@svebcomponents/build`: `createTsdownConfig` now has an explicit `Options` return type — the inferred type referenced rollup's plugin types through non-portable `.pnpm` paths (TS2742) in the emitted declarations.

- Updated dependencies [c2f1b6c]
- Updated dependencies [c2f1b6c]
- Updated dependencies [8bceff0]
- Updated dependencies [8bceff0]
- Updated dependencies [c2f1b6c]
- Updated dependencies [c2f1b6c]
- Updated dependencies [c2f1b6c]
- Updated dependencies [c2f1b6c]
  - @svebcomponents/ssr@0.1.0
  - @svebcomponents/auto-options@0.1.0

## 0.0.9

### Patch Changes

- 257e5b0: Load package Svelte config during builds and support async SSR when that config enables Svelte's experimental async compiler mode. Host apps can opt into the async Vite wrapper for Svelte async SSR.
- 257e5b0: Share the Svelte build config helpers (`SvelteBuildConfig`, `mergeCompilerOptions`) from a single home in `@svebcomponents/ssr` via a new `@svebcomponents/ssr/svelte-config` export, instead of duplicating them in `@svebcomponents/build`. This removes the risk of the two copies drifting apart.
- fd39f2c: Fix the CLI silently exiting with no output when no component exports could be inferred, and fix the error handler so build failures are reported and exit with a non-zero code.
- 4efae18: Remove a duplicate `import type { Options } from "tsdown"` in `inferComponents.test.ts` that broke `tsc` for the package (introduced by a merge conflict resolution in #79).
- a6370a2: Remove conflicting peerDependency on `@svebcomponents/ssr`, keeping only the regular workspace dependency since it is imported directly and unconditionally.
- 2c2510b: Generate the SSR renderer entry filename from the declared package export instead of hardcoding `ssr.js`.

  Previously every SSR build wrote `<ssrOutDir>/ssr.js` regardless of the declared export. This meant the multi-component setup documented in the build README (e.g. `"./button/ssr": "./dist/server/button-ssr.js"`) produced a dangling export, and two SSR components sharing an output directory overwrote each other's generated entry.

  `inferComponents` now derives the entry basename from the declared ssr export path, and a new `ssrEntryFileName` option on `defineConfig` (defaulting to `"ssr"`) threads it through `svebcomponentsSsr` into `pluginGenerateSsrEntry`. Single-component behavior is unchanged.

- 724f00a: Declare supported Node versions (`engines.node: ">=20.19.0"`) so consumers get a clear error instead of an opaque runtime failure on unsupported Node versions.
- e7e4adf: Fix publint compliance: put the `types` export condition first so TypeScript resolves declarations as published, add `files` fields so tarballs only ship `dist` (and `bin.js` for the build package), and run publint as part of every publishable package's build.
- 8913436: Drop test and build tooling from runtime dependencies: `vitest`, `rolldown`, `typescript`, and `tslib` are no longer installed when consuming `@svebcomponents/ssr`, and `typescript`/`tslib` are no longer installed when consuming `@svebcomponents/build`. These were only used for tests, type-only imports, or package builds and are now devDependencies (or removed entirely).
- ac6e095: Fix Windows portability issues:

  - `@svebcomponents/build` now uses `path.posix` consistently in
    `inferComponents`. The values flowing through it come from package.json
    `exports` (always posix) and become generated import specifiers, which must
    stay posix. Previously `path.normalize` could flip them to backslashes on
    win32. `existsSync` filesystem checks remain safe because Node's fs APIs
    accept forward slashes on Windows.
  - `@svebcomponents/auto-options` build script no longer relies on `rm -rf`,
    which fails on Windows cmd/PowerShell. It now uses a portable `node -e`
    `fs.rmSync` call to clean stale `dist` output before `tsc`.

- Updated dependencies [257e5b0]
- Updated dependencies [257e5b0]
- Updated dependencies [f02d6ee]
- Updated dependencies [cefe6cb]
- Updated dependencies [bea7309]
- Updated dependencies [742c433]
- Updated dependencies [2c2510b]
- Updated dependencies [724f00a]
- Updated dependencies [e7e4adf]
- Updated dependencies [303541d]
- Updated dependencies [0d74921]
- Updated dependencies [94530d0]
- Updated dependencies [4ca91b2]
- Updated dependencies [8913436]
- Updated dependencies [d51f92b]
- Updated dependencies [2f11d81]
- Updated dependencies [f8970a8]
- Updated dependencies [4c038c3]
- Updated dependencies [5c8d636]
- Updated dependencies [ac6e095]
- Updated dependencies [e4fe34f]
- Updated dependencies [1e14cc5]
- Updated dependencies [f75af70]
- Updated dependencies [3a4d68e]
  - @svebcomponents/ssr@0.0.8
  - @svebcomponents/auto-options@0.0.5

## 0.0.8

### Patch Changes

- 1719c09: svebcomponent consumers who use svelte themselves don't necessarily need the svelte runtime included with their webcomponents as they could share the runtime with the host app.
  note that this comes with risks, as the svelte runtime is an implementation detail and as such does not guarantee compatibility even between patch & minor versions.
  if both your web components and your host were built with the same version of svelte you can shave off the cost of including the runtime though

## 0.0.7

### Patch Changes

- 776bbbc: fix: ensure tsdown is a regular dependency

## 0.0.6

### Patch Changes

- b282163: fix: migrate to tsdown to emit types again
- Updated dependencies [b282163]
  - @svebcomponents/ssr@0.0.7

## 0.0.5

### Patch Changes

- 1c5b92f: refactor!: migrate to rolldown

  since the minification logic of rolldown is different than rollup & rolldown is also still in beta, this is a breaking change

- 2d11175: feat: add 'svebcomponents' cli tool & 'svebcomponents.config.ts' configuration
- Updated dependencies [1c5b92f]
- Updated dependencies [1b1aea0]
  - @svebcomponents/auto-options@0.0.4
  - @svebcomponents/ssr@0.0.6

## 0.0.4

### Patch Changes

- Updated dependencies [a1bc248]
  - @svebcomponents/ssr@0.0.5

## 0.0.3

### Patch Changes

- 6fd10e7: fix: add @rollup/plugin-typescript peer deps
- Updated dependencies [6fd10e7]
  - @svebcomponents/ssr@0.0.4

## 0.0.2

### Patch Changes

- Updated dependencies [8aa8512]
  - @svebcomponents/auto-options@0.0.3
  - @svebcomponents/ssr@0.0.3

## 0.0.1

### Patch Changes

- 5cedd02: fix: set dependencies correctly
- Updated dependencies [5cedd02]
  - @svebcomponents/auto-options@0.0.2
  - @svebcomponents/ssr@0.0.2
