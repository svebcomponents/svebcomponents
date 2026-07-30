---
"@svebcomponents/ssr-react": minor
"@svebcomponents/ssr": minor
---

Add `@svebcomponents/ssr-react`, a React host integration for server-rendering Svelte-built custom elements.

A `CustomElement` component drives the element's registered `ElementRenderer` on the server and emits declarative shadow DOM; a drop-in JSX runtime routes any dashed tag through it, so no bundler plugin is involved and the integration works outside Vite too.

Synchronous element renderers only. React's `renderToString` cannot await, so an asynchronous renderer degrades to client-only rendering for that element with a one-time warning rather than failing the page.

`@svebcomponents/ssr` gains `AsyncRendererError`, thrown by `renderCustomElementSync` when the element's renderer turns out to be asynchronous, so a non-awaiting host can degrade deliberately while genuine render errors still propagate.

Documented on the site under Core Concepts → Framework Integrations, with a package reference page for the new integration.
