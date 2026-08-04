---
"@svebcomponents/ssr-react": minor
---

Add `@svebcomponents/ssr-react/rsc`, an async `CustomElement` for React Server Components that server-renders asynchronous custom elements instead of degrading to client-only rendering.

The default `CustomElement` stays synchronous-only: it's what the automatic JSX routing uses, and it's the only option for hosts that can't await a component at all (`renderToString`, or `renderToPipeableStream` without an RSC runtime). The RSC entry point only helps where the element is rendered from a Server Component, since an async function component can't be imported into a Client Component — an app rendering its custom elements from client components keeps the default's degrade behavior regardless of whether the framework supports RSC.

This removes the exploratory async-SSR investigation (`packages/ssr-react/docs/async-ssr.md` and `e2e/ssr-react/test/experiments/`) now that one of its candidate designs has shipped.
