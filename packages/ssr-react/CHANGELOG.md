# @svebcomponents/ssr-react

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
