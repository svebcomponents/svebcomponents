# @svebcomponents/build

## 0.6.0

### Minor Changes

- a1f71ad: Describe properties as well as attributes in the Svelte template types.

  A custom element's public surface is both, and the generated
  `svelte/elements` augmentation only ever described attributes. So a Svelte
  template could not pass anything that does not survive being turned into a
  string — an object, an array — because the only member offered was the
  kebab-cased attribute:

  ```svelte
  <!-- the element's own documented integration path -->
  <atproto-comments thread={uri} threadData={data.thread}></atproto-comments>
  ```

  ```
  '"threadData"' does not exist in type
  'HTMLAttributes<AtprotoCommentsElement> & { thread?: string; "thread-data"?: any; … }'
  ```

  `thread-data={obj}` is not the workaround it looks like: with no property of
  that name, Svelte writes an attribute and the object is stringified. The
  camelCase form is the only way to pass one, and it was the one form the types
  did not admit — so opting into template types broke the integration it was
  meant to check.

  Each prop now also appears under its camelCase name with its real type, rather
  than the attribute's widened `T | string`. Two are left out: props whose
  attribute name already equals the prop name (`count`), which the attribute
  member covers and which would otherwise be a duplicate key; and `on`-prefixed
  props, which Svelte reads as event-handler syntax rather than a property
  assignment.

  ## The attribute surface was over-promising too

  `XAttributes` typed that same prop as `"thread-data"?: CommentTree | string`,
  so both broken forms type-checked: passing the object stringifies it to
  `"[object Object]"`, and passing a string hands the component a string where it
  declared a `CommentTree`.

  An attribute is a string. It now says so — except where the attribute name is
  also the prop name (`count`), the one case where a framework assigns the
  property rather than writing an attribute, and where `number | string` is
  therefore right.

  **This is a breaking change** for anyone passing a rich value through a
  kebab-cased attribute. That code did not work; it now fails to compile instead
  of silently stringifying.

  ## `XProps` for every framework

  The property surface is exported per element as `XProps` — camelCase names,
  real types — so the React, Vue and Svelte recipes can all compose it. React,
  Vue and Svelte resolve a template binding the same way: assign a property when
  the element has one, write an attribute otherwise, which is why none of them
  could pass an object before.

  Function and snippet props stay out of both surfaces: in a template
  `onSelect={fn}` is event-handler syntax rather than a property assignment. They
  remain typed on `XElement`, to be set through a DOM reference, and the docs now
  say so explicitly rather than leaving it implied.

## 0.5.0

### Minor Changes

- 039d2ed: Inline every bare specifier into the browser output, instead of inferring what
  to bundle from `dependencies` vs `devDependencies`.

  `dist/client` is a final-form browser artifact — loaded from a URL, or from a
  bundle that already resolved everything. There is no module resolver at that
  point. tsdown's default is to externalize whatever `package.json` lists as a
  `dependency` or `peerDependency`, which answers a different question: what a
  consumer must install. The two coincide most of the time, and every time they
  did not, the build wrote a file no browser could load and reported success.

  Three separate ways to hit it, all found while migrating two real projects:

  - A component importing a package it declares as a `dependency` — which it must
    declare, if its published element types name a type from that package.
  - Declaring `svelte`, which is the documented way to register element types with
    Svelte's template types. The standalone bundle went from ~38 kB with the
    runtime to ~4 kB with a bare `svelte` import.
  - `@svebcomponents/ssr`'s hydration entries, when a component declares that
    package as the optional peer dependency it is meant to be. That one had a
    targeted workaround; the other two did not.

  The browser builds now state the contract rather than infer it. Left external:
  Node builtins (a browser bundle importing `node:fs` is broken either way, and
  inlining one turns a dependency's dead branch into a build error), relative and
  absolute paths, virtual modules, and protocol imports. A specifier that is
  inlined but cannot be resolved now fails the build, so this class of mistake is
  loud rather than silent.

  Server output is unchanged: Node resolves declared dependencies at runtime, so
  it keeps ordinary externalization. The Svelte-aware build (`svelteOutDir`, the
  `svelte` export condition) still externalizes `svelte` — sharing the host
  application's runtime is that output's entire purpose.

  ## Migration

  Nothing to do in most packages, and several can delete a workaround: a
  dependency that had to be a `devDependency` to stay in the bundle can now be
  declared for what it is.

  Bundles grow for anyone who was relying on `dependencies` being externalized
  from `dist/client`. That output was not loadable as documented, but if you were
  depending on it deliberately — a package the host provides, say — opt out:

  ```json
  {
    "svebcomponents": { "neverBundle": ["@acme/design-system"] }
  }
  ```

  `defineConfig` takes the same list as a `neverBundle` option. Entries are
  matched against the whole import specifier, so cover subpaths too if the package
  has them.

- 039d2ed: Write the Svelte template types to their own file, so shipping them no longer
  requires declaring `svelte`.

  The `svelte/elements` augmentation can only be loaded where svelte exists — it
  augments that module, and augmenting requires resolving it. That was handled by
  emitting it into the entry's declarations only when the package declared
  `svelte` as a required dependency of its consumers.

  Which made "I want Svelte template types" mean "every one of my consumers must
  install svelte", including the ones on a plain HTML page. For a toolchain whose
  standalone build exists precisely to run without Svelte, that is the wrong
  trade to force.

  The augmentation is now always written, beside the entry's declarations:

  ```
  dist/client/FavoriteNumber.svelte-types.d.ts
  ```

  A package that requires svelte of its consumers has it referenced from those
  declarations automatically, exactly as before — no setup for Svelte consumers.
  Any other package exposes it and its Svelte consumers opt in with one line:

  ```json
  {
    "exports": {
      "./svelte": { "types": "./dist/client/FavoriteNumber.svelte-types.d.ts" }
    }
  }
  ```

  ```ts
  // the consumer's app.d.ts — a .d.ts, so it never reaches runtime
  import "my-components/svelte";
  ```

  The build prints that wiring when it writes types nothing can reach.

  ## Migration

  Nothing to do for packages that declare `svelte`. Packages that avoided
  declaring it — and therefore had no template types — can now ship them by
  adding the export above.

- 039d2ed: Depend on `tsdown` instead of asking consumers to install it.

  `@svebcomponents/build` runs tsdown — `svebcomponents` imports `build()` and
  calls it. A peer dependency says the opposite: that the host provides it. Every
  consumer therefore had to install a build tool they never invoke, and pick a
  version.

  That is also what produced a whole class of silent breakage. The declared range
  was `>=0.15.0` while the code depended on `deps.alwaysBundle`, which tsdown
  introduced in 0.21.0. Package managers that auto-install peers resolve the
  bottom of a range, so consumers got 0.15.x — which accepts the config, ignores
  the option, and externalizes everything the build meant to inline. `dist/client`
  then shipped bare specifiers no browser could resolve, and the build reported
  success throughout.

  tsdown is now an ordinary dependency, pinned to the version this repository
  builds and tests against. There is no range for a consumer to get wrong, and
  nothing to install.

  `@svebcomponents/ssr` keeps `tsdown` and `rolldown` as optional peers — it only
  imports their types, and `@svebcomponents/build` supplies them.

  ## Migration

  Remove `tsdown` from your package if you added it only for this:

  ```diff
  -  "devDependencies": { "tsdown": "^0.22.0" }
  ```

  Keep it if you use tsdown directly for something else.

### Patch Changes

- Updated dependencies [039d2ed]
  - @svebcomponents/ssr@0.6.0

## 0.4.0

### Minor Changes

- 86e6596: Infer custom elements directly from same-basename `.svelte` source files and
  build same-basename `.ts`/`.js` sources as ordinary modules. Mixed packages can
  ship helpers without running them through the custom-element pipeline.

  ## Migration

  Rename each component to match its declared JavaScript output. Given this
  export:

  ```json
  {
    "exports": {
      ".": {
        "types": "./dist/client/ExampleComponent.d.ts",
        "default": "./dist/client/ExampleComponent.js"
      }
    }
  }
  ```

  use `src/ExampleComponent.svelte` as the source entry.

  When upgrading, delete any entry module that only exported the component. If
  the module also contains runtime logic or additional exports, keep it as an
  ordinary module or move to an explicit `svebcomponents.config.ts`.

  The source convention is strict:

  - `<name>.svelte` is a svebcomponent entry.
  - `<name>.ts` or `<name>.js` is an ordinary module entry.
  - More than one matching source is an error; use an explicit
    `svebcomponents.config.ts` for non-conventional layouts.

  For SSR preparation, place `<name>.ssr.ts` or `<name>.ssr.js` next to
  `<name>.svelte`.

  Direct component declarations are now generated from component analysis and
  include the module's default custom-element constructor together with the
  element, attribute, event, and template types.

- a4e45b7: Emit a custom elements manifest and TypeScript types for the elements a package
  ships, so editors and consuming templates know the tags and what they accept.

  `custom-elements.json` (custom elements manifest 2.1.0) describes attributes,
  property-only members, events with their detail type, slots and CSS custom
  properties. The build points out the `package.json` wiring it needs
  (`customElements`, `files`) when that is missing.

  The TypeScript half is appended to the declaration file each entry already
  emits — the one its `types` condition points at — so `import "my-components"`
  is enough to type `document.querySelector("my-el")`. Per element it exports:

  - `XElement` — the DOM element, with a narrowed `addEventListener`
  - `XAttributes` — what markup may set, each attribute also accepting its
    string form
  - `XEventHandlers` — `onname`-style handler props for dispatched events
  - `XEventMap` — event name to `CustomEvent<Detail>`

  Svelte template types are registered automatically when the package declares
  `svelte` as a required dependency of its consumers (a `dependency`, or a
  `peerDependency` not marked optional). That gate matters: the augmentation
  imports from `svelte/elements`, and a package whose standalone build bundles
  Svelte may be consumed by an application with no `svelte` installed, which
  would then fail to resolve it under `skipLibCheck: false`.

  Vue and React augmentations are **not** generated. They have to name types
  from frameworks this package neither depends on nor tests against, and those
  conventions change between major versions, so a subtly wrong generated
  augmentation would be worse than a few lines the consumer controls. The docs'
  Types section carries verified recipes built from the exported types.

  Property-only props (functions, snippets) appear on the element interface but
  never among the attributes: in a template `onPick={fn}` is event-handler syntax
  rather than a property assignment, so listing it there would type-check a
  handler that never runs. Dispatched custom events are exposed instead.

### Patch Changes

- 86e6596: Resolve a source entry for exports whose target carries no file extension.

  `exports` may legally point at an extensionless path. Entry inference stripped
  the extension by slicing `-extension.length` off the end, which for an empty
  extension is `slice(0, -0)` — the empty string rather than the whole path. Every
  candidate source then collapsed to a bare extension, so inference failed even
  when the component was sitting right there, and reported it as:

  ```
  [svebcomponents]: could not find a source for ./dist/client/index.
    Expected exactly one of .svelte, .ts, or .js.
  ```

  Such an export now resolves against `src/` like any other.

- e7267f8: Documentation pass across the package READMEs ahead of the beta launch.

  - `@svebcomponents/ssr`, `ssr-vue`, `ssr-react` and `ssr-astro` gained the
    install command they were missing.
  - `@svebcomponents/build`'s options table was missing `hydratable`,
    `ssrEntryFileName` and `svelteConfig`, and did not show how a package with
    several components composes `defineConfig` calls.
  - `@svebcomponents/ssr`'s package-author example used `import` without `types`
    where every other example in the docs uses `default` with them, and the
    `enable-async` opt-in for non-Svelte hosts was undocumented.
  - The three integration READMEs each restated the shared SSR layer's
    behaviour — the Lit renderer registry, the server-side `svelte` requirement,
    the declarative shadow DOM contract, the definition of an asynchronous
    component. Each now links to the canonical explanation and keeps only what
    is specific to its framework.
  - Removed references to internal `e2e/*` directories, which readers cannot
    run, and normalised the product name to lowercase `svebcomponents`.

- e7267f8: Point the CLI and runtime messages at the documentation's new URLs.

  The docs site moved its concept pages to paths that match how the sidebar is
  organised, so the two links printed from package code moved with them:

  - the manifest hint in `@svebcomponents/build` now points at
    `/guides/build/#element-types--manifest`
  - the slotted-component hydration notice in `@svebcomponents/ssr` now points at
    `/server-rendering/hydration/#limitations`

  The old paths are redirected, so messages printed by already-released versions
  keep resolving.

- 86e6596: Build `.ts`/`.js` module entries for the browser rather than for Node.

  An ordinary module export is written into `dist/client/`, beside the compiled
  components, and is loaded by browsers. Its tsdown config did not set
  `platform`, so it took tsdown's default of `"node"` and resolved the `node` key
  of a dependency's `exports` map — shipping a dependency's Node build in a bundle
  served to the browser. Module entries now resolve the same conditions the
  component build does, including `production`, so `esm-env`-style dev branches
  are eliminated instead of surviving as runtime checks.

- 86e6596: Declare `license`, `description` and `homepage`, and ship the license text in
  the published tarball.

  Every package was published without a `license` field and without a license
  file of its own. npm only includes `LICENSE*` from the package directory, so the
  repository's MIT license never reached consumers and automated license scanners
  had nothing to read. Each package now carries its own copy of `LICENSE.md`
  alongside `"license": "MIT"`.

  `description` is what npm shows on the package page and in search results, and
  `homepage` now points at each package's reference page on the documentation
  site.

- 86e6596: Stop corrupting literal types that spell one of a component's local type names.

  Generated declarations prefix a component's local types so several components
  can share one declaration file (`Detail` becomes `Button$Detail`). The rewrite
  matched names anywhere in the declaration's source text, including inside string
  literals, so a literal type whose value happened to match a local type name was
  rewritten too:

  ```ts
  // source
  interface Detail {
    id: string;
  }
  type Mode = "Detail" | "summary";

  // generated, before
  type MyWidget$Mode = "MyWidget$Detail" | "summary";
  ```

  Consumers writing `mode="Detail"` — the value the element actually accepts — got
  a type error, while the bogus `"MyWidget$Detail"` type-checked and failed at
  runtime. Literals are now stepped over.

  Two adjacent defects went with it: names are matched in a single alternation, so
  a name introduced by an earlier rewrite can no longer be rewritten again; and
  names are escaped when built into the pattern, so a local type containing `$`
  no longer silently fails to match.

- Updated dependencies [86e6596]
- Updated dependencies [86e6596]
- Updated dependencies [e7267f8]
- Updated dependencies [e7267f8]
- Updated dependencies [a4e45b7]
- Updated dependencies [86e6596]
  - @svebcomponents/auto-options@0.3.0
  - @svebcomponents/ssr@0.5.0

## 0.3.7

### Patch Changes

- Updated dependencies [e858eca]
- Updated dependencies [ab7d1cd]
- Updated dependencies [567aef3]
- Updated dependencies [0d1077f]
  - @svebcomponents/ssr@0.4.0
  - @svebcomponents/auto-options@0.2.1

## 0.3.6

### Patch Changes

- Updated dependencies [117c5ba]
  - @svebcomponents/ssr@0.3.3

## 0.3.5

### Patch Changes

- 1ca557a: Update the build integrations for tsdown 0.22 while preserving the existing
  `.js` and `.d.ts` output contract.
- Updated dependencies [1ca557a]
  - @svebcomponents/ssr@0.3.2

## 0.3.4

### Patch Changes

- 513dea0: Bundle the `hydratable` wrapper into a hydratable component's client build, so the Svelte-bundled `dist/client` stays loadable straight from a URL.

  auto-options injects `import { hydratable } from "@svebcomponents/ssr/hydration"`, and only its sibling `@svebcomponents/ssr/hydration-host` was forced non-external. A component that declares `@svebcomponents/ssr` as the optional _peer_ dependency it is meant to be therefore shipped a bare specifier in an otherwise self-contained bundle — which a browser cannot resolve without an import map, so the custom element never registered. Resolving it via an import map would not have been a fix either: the module imports `svelte`, so it would pull a second Svelte runtime in alongside the one already bundled.

  Adds ~2 kB raw to `dist/client` for hydratable components, which is the cost of the bundle actually being self-contained.

## 0.3.3

### Patch Changes

- 3b2e7c7: Resolve browser bundles against the `production` export condition, so Svelte's dev-only code no longer ships to the browser.

  Without it, `esm-env` resolved `DEV` through its `dev-fallback` — a runtime `process.env.NODE_ENV` check rather than a literal — so no `if (DEV)` branch in Svelte's runtime could be eliminated and the full dev-only error and warning message texts ended up in the published bundle. Cross-module const inlining is enabled alongside it, since rolldown otherwise emits the resolved `DEV` as a module-level `var` that the minifier will not fold into its use sites.

  The e2e `basic` component's client bundle drops from 42.3 kB to 32.6 kB raw (15.9 kB to 12.7 kB gzipped).

## 0.3.2

### Patch Changes

- Updated dependencies [821e5df]
  - @svebcomponents/ssr@0.3.1

## 0.3.1

### Patch Changes

- d714a97: The client build of a hydratable component now bundles `@svebcomponents/ssr`'s `HydrationHost` (compiled by the component's own toolchain, exactly like the server-side host) instead of leaving `import ... from "@svebcomponents/ssr/hydration-host"` as an external runtime import. That subpath ships as raw `.svelte`, so an external import resolved to an uncompiled `.svelte` at runtime — which a consuming app's SSR could only load by adding every such component to `ssr.noExternal`. Bundling the host removes that raw-`.svelte` reason for a per-component entry; consumers also need an `@svebcomponents/ssr` version whose wrapper recognizes renderers across bundled and external module instances before removing the entry entirely. Hydration markers still match by construction because both the client and server host are compiled by the same (component author's) build.

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

  Known limitations (fall back to mount): components with slots (expected to become hydratable with Svelte 6, when slots are no longer compiled through the legacy transformation — a dev-mode `console.info` makes the fallback visible); legacy `createEventDispatcher` events on hydrated elements (native `$host()` events are unaffected); component `export`s are not exposed on hydrated hosts. See the new [Hydration docs](https://svebcomponents.dev/server-rendering/hydration/) for details.

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
