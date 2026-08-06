# @svebcomponents/ssr-vue

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
