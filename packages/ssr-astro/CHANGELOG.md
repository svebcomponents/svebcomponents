# @svebcomponents/ssr-astro

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

- 8b18d71: Add `@svebcomponents/ssr-astro`, an Astro host integration for server-rendering custom elements.

  A Vite plugin rewrites custom element tags in `.astro` templates to a wrapper component, which drives the element's registered `ElementRenderer` and emits declarative shadow DOM. Setup is a single integration entry; there is no client-side counterpart, because Astro ships no JavaScript for these elements — the browser parses the shadow root and the element hydrates itself.

  Astro frontmatter is an async module scope, so asynchronous element renderers work through the same wrapper as synchronous ones, with no sync/async split.

  Two implementation notes, both non-obvious:

  - The rewrite runs in Vite's `load` hook rather than `transform`. Astro compiles `.astro` to JavaScript in its own `transform`, from a plugin that is `enforce: "pre"` and registered ahead of integration-supplied plugins, so a `transform` here would only ever see compiled output.
  - The wrapper closes its `<template>` explicitly; a self-closing `<template />` is not treated as void by Astro's compiler and swallows the `<slot />` into the shadow content.

  Detection needs no heuristics — Astro's parser classifies dashed tags as a dedicated `custom-element` AST node, so there is no "contains a dash" rule and no reserved SVG/MathML exclusion list.

### Patch Changes

- Updated dependencies [e858eca]
- Updated dependencies [ab7d1cd]
- Updated dependencies [567aef3]
- Updated dependencies [0d1077f]
  - @svebcomponents/ssr@0.4.0
  - @svebcomponents/utils@0.2.0
