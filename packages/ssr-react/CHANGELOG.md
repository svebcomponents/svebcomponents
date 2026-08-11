# @svebcomponents/ssr-react

## 0.3.1

### Patch Changes

- Updated dependencies [039d2ed]
  - @svebcomponents/ssr@0.6.0

## 0.3.0

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

## 0.2.0

### Minor Changes

- b93afbf: Add `@svebcomponents/ssr-react/rsc`, an async `CustomElement` for React Server Components that server-renders asynchronous custom elements instead of degrading to client-only rendering.

  The default `CustomElement` stays synchronous-only: it's what the automatic JSX routing uses, and it's the only option for hosts that can't await a component at all (`renderToString`, or `renderToPipeableStream` without an RSC runtime). The RSC entry point only helps where the element is rendered from a Server Component, since an async function component can't be imported into a Client Component — an app rendering its custom elements from client components keeps the default's degrade behavior regardless of whether the framework supports RSC.

  This removes the exploratory async-SSR investigation (`packages/ssr-react/docs/async-ssr.md` and `e2e/ssr-react/test/experiments/`) now that one of its candidate designs has shipped.

## 0.1.0

### Minor Changes

- e858eca: Add `@svebcomponents/ssr-react`, a React host integration for server-rendering Svelte-built custom elements.

  A `CustomElement` component drives the element's registered `ElementRenderer` on the server and emits declarative shadow DOM; a drop-in JSX runtime routes any dashed tag through it, so no bundler plugin is involved and the integration works outside Vite too.

  Synchronous element renderers only. React's `renderToString` cannot await, so an asynchronous renderer degrades to client-only rendering for that element with a one-time warning rather than failing the page.

  `@svebcomponents/ssr` gains `AsyncRendererError`, thrown by `renderCustomElementSync` when the element's renderer turns out to be asynchronous, so a non-awaiting host can degrade deliberately while genuine render errors still propagate.

  Documented on the site under Core Concepts → Framework Integrations, with a package reference page for the new integration.

### Patch Changes

- bb5d47a: Document the investigation into async SSR under React's streaming renderer, and correct the README's explanation of why the integration is synchronous-only.

  React's streaming renderer does preserve declarative shadow DOM: suspended content is delivered as ordinary HTML that the parser processes in a hidden staging container, so the shadow root attaches at parse time, and React's relocation script moves the element rather than the template. The remaining obstacle to async support is a wrapper design problem — `use()` needs a promise that is stable across render attempts — not a platform limitation.

  The findings are asserted by browser tests in `e2e/ssr-react/test/experiments/` so a change in React's behavior fails rather than silently invalidating the note.

  The documentation site's React integration section links to the findings rather than restating them.

- Updated dependencies [e858eca]
- Updated dependencies [ab7d1cd]
- Updated dependencies [567aef3]
- Updated dependencies [0d1077f]
  - @svebcomponents/ssr@0.4.0
  - @svebcomponents/utils@0.2.0
