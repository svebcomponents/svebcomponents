# Async SSR in React: findings

`@svebcomponents/ssr-react` currently server-renders synchronous element
renderers only. This documents an investigation into whether that limit can be
lifted, and what it would take.

**Conclusion: it can.** React's streaming server renderer preserves declarative
shadow DOM, contrary to the reasoning that motivated the sync-only decision.
The remaining work is a wrapper design problem, not a platform limitation.

The behavior described here is asserted by tests in
`e2e/ssr-react/test/experiments/`, so a change in React's behavior surfaces as
a failure rather than as a stale note.

## The concern that motivated sync-only

Declarative shadow DOM attaches **only during HTML parsing**. Setting
`innerHTML`, or moving a `<template shadowrootmode>` element into the document
with script, does not create a shadow root.

React streams suspended content out of band: the shell is sent immediately with
a fallback, and the boundary's real content arrives later, followed by an
inline script that puts it where it belongs. The obvious reading is that the
shadow template arrives after the parser has moved on and gets relocated by
script — producing an inert `<template>` in the light DOM and an empty shadow
root.

That reading is wrong, and the error is in _what gets relocated_.

## What actually happens

With `onShellReady` — true streaming — React emits, in order:

```
<div id="app"><!--$?--><template id="B:0"></template><span id="fallback">loading</span><!--/$--></div>
<div hidden id="S:0">
  <sync-component title="Streaming Test" count="3">
    <template shadowrootmode="open">…</template>
    <p id="light-dom">light dom child</p>
  </sync-component>
</div>
<script>/* … */ $RC("B:0","S:0")</script>
```

The suspended content is delivered as **ordinary HTML in the streamed
response**. The parser processes it exactly like any other markup, in the
hidden staging container — so the declarative shadow root attaches there, at
parse time, precisely as the spec requires.

`$RC` then moves the _custom element_ out of the staging container and into the
boundary's position. An element carries its shadow root with it when moved.
The `<template>` is never relocated; by the time the script runs it no longer
exists, having already been consumed by the parser.

So the requirement DSD imposes — "must be parsed, not injected" — is satisfied
by the streamed content, and relocating an element afterwards is harmless.

Verified in Chromium: after relocation the element is in the shell, its
`shadowRoot` is populated, its light-dom children are intact, and no stray
`<template>` remains. React then hydrates the boundary with no mismatches
reported through either `onRecoverableError` or its dev warnings, and the
custom element's own hydration claims the streamed shadow nodes rather than
re-rendering them.

`onAllReady` also works, trivially: it holds the whole document until every
boundary resolves, so the output is inline markup with no staging container at
all. It forfeits streaming, which is the entire point of the streaming
renderer, but it is a valid fallback.

## What it would take to ship

The blocker is not the platform. It is that `renderCustomElement` returns a
promise and React function components cannot await.

The mechanism is `use(promise)` inside a `Suspense` boundary. The constraint is
that **the promise must be stable across render attempts**: React re-invokes
the component when the promise settles, so creating it during render restarts
the work every time and never resolves. A shipping wrapper therefore needs a
per-request cache keyed by the element's identity and props, and that cache
must not leak between requests on a server that handles more than one at a
time.

The plausible shapes:

1. **A render-scoped cache provided through React context.** The app wraps its
   tree in a provider that owns a `Map`; the wrapper looks up its promise there
   and creates it on first render. Correct and explicit, at the cost of a
   required provider — and a wrapper that silently degrades to client-only
   rendering when the provider is absent, which is the current sync behavior.

2. **React Server Components.** An async server component can simply `await`
   the renderer with no cache and no `use()`. This is the cleanest by far, but
   it only serves apps already on an RSC-capable framework, and it does not
   help a plain `renderToPipeableStream` app.

3. **`onAllReady` only.** No cache needed if the app is willing to buffer the
   whole document, since the tree can be rendered once everything is resolved.
   Simple, but it gives up streaming.

Option 1 is the general answer; option 2 is worth supporting natively if RSC
support is ever a goal.

## What about `@lit-labs/ssr-react`?

It has the same limitation, for the same reason: its `wrapCreateElement`
collects the shadow contents with `collectResultSync`. So this is not a gap
between svebcomponents and the reference implementation — it is unsolved
upstream too, and a fix here would be worth contributing back.

(It is also not usable for anything but Lit elements today, because it
hardcodes `elementRenderers: [LitElementRenderer]` with no way to supply
others. `@svebcomponents/ssr-react` takes renderers from the registry
instead, so `ElementRendererRegistry.use(LitElementRenderer)` makes it render
Lit elements _and_ svebcomponents ones through the same path.)

## Open questions

- **Request isolation.** The cache in option 1 must be created per render, not
  per module. This needs care and a test that renders two requests concurrently
  with different props.
- **Fallback markup.** While a boundary is pending the user sees the fallback,
  not the element. Whether that is acceptable depends on the app; a wrapper
  could offer to render the element's light-dom children as the fallback so
  layout is stable.
- **Error boundaries.** A renderer that rejects currently surfaces as a
  Suspense error. The sync path's distinction between "asynchronous, degrade"
  and "genuinely broken, throw" needs an equivalent here.
- **Non-streaming hosts.** `renderToString` cannot await under any design. Apps
  on it keep the current degradation path, so the wrapper has to detect which
  renderer it is running under, or be selected explicitly by the app.
