# @svebcomponents/ssr-vue

## 0.2.1

### Patch Changes

- Updated dependencies [039d2ed]
  - @svebcomponents/ssr@0.6.0

## 0.2.0

### Minor Changes

- e7267f8: Promote the Vue, React and Astro host integrations from experimental to beta.

  They now carry the same status as the rest of the toolchain: ready for
  real-world evaluation and early production adoption, with APIs that may still
  change before 1.0. Each integration's known constraints are unchanged and stay
  documented under its Current Limitations.

### Patch Changes

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

- Updated dependencies [86e6596]
- Updated dependencies [e7267f8]
- Updated dependencies [e7267f8]
- Updated dependencies [86e6596]
- Updated dependencies [86e6596]
- Updated dependencies [86e6596]
  - @svebcomponents/ssr@0.5.0
  - @svebcomponents/utils@0.3.0

## 0.1.0

### Minor Changes

- 567aef3: Add `@svebcomponents/ssr-vue`, a Vue host integration for server-rendering Svelte-built custom elements.

  A Vite plugin rewrites custom element tags in SFC templates to a wrapper component, which drives the element's registered `ElementRenderer` on the server and emits declarative shadow DOM. Vue's `renderToString` awaits async `setup()`, so async element renderers work through the same wrapper as synchronous ones — no sync/async split.

  Documented on the site under Core Concepts → Framework Integrations, with a package reference page for the new integration.

  Supporting changes:

  - `@svebcomponents/ssr` gains `shadowContent` on `RenderedCustomElement`, for hosts that build the `<template>` element themselves rather than emitting raw markup.
  - The custom-element tag-name predicates move to `@svebcomponents/utils` so host integrations can share the detection without importing the Svelte-bound SSR runtime. `@svebcomponents/ssr` re-exports them from their previous path.

### Patch Changes

- Updated dependencies [e858eca]
- Updated dependencies [ab7d1cd]
- Updated dependencies [567aef3]
- Updated dependencies [0d1077f]
  - @svebcomponents/ssr@0.4.0
  - @svebcomponents/utils@0.2.0
