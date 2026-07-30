---
"@svebcomponents/ssr-vue": minor
"@svebcomponents/ssr": minor
"@svebcomponents/utils": minor
---

Add `@svebcomponents/ssr-vue`, a Vue host integration for server-rendering Svelte-built custom elements.

A Vite plugin rewrites custom element tags in SFC templates to a wrapper component, which drives the element's registered `ElementRenderer` on the server and emits declarative shadow DOM. Vue's `renderToString` awaits async `setup()`, so async element renderers work through the same wrapper as synchronous ones — no sync/async split.

Documented on the site under Core Concepts → Framework Integrations, with a package reference page for the new integration.

Supporting changes:

- `@svebcomponents/ssr` gains `shadowContent` on `RenderedCustomElement`, for hosts that build the `<template>` element themselves rather than emitting raw markup.
- The custom-element tag-name predicates move to `@svebcomponents/utils` so host integrations can share the detection without importing the Svelte-bound SSR runtime. `@svebcomponents/ssr` re-exports them from their previous path.
