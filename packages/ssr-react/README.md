Server-side rendering support for Svelte-built custom elements inside React apps.

This is the React counterpart to `@svebcomponents/ssr`'s Svelte integration.
The element renderers, the DOM shim, the renderer registry and the client-side
hydration machinery are all shared — this package only supplies the two pieces
that are host-framework specific: routing custom element tags to a wrapper, and
emitting declarative shadow DOM around them.

This package is experimental. Its API may change before it is released
alongside the rest of the toolchain.

**Synchronous rendering only.** See "Async Components" below.

## What It Provides

- `@svebcomponents/ssr-react` — the `CustomElement` component.
- `@svebcomponents/ssr-react/jsx-runtime` (and `/jsx-dev-runtime`) — drop-in
  replacements for React's JSX runtime that route any dashed tag through it.

Unlike the Svelte and Vue integrations, there is no bundler plugin. The JSX
runtime swap is a compiler setting, so this works anywhere React does —
including hosts that are not Vite-based.

## Any Custom Element, Not Just Svelte-built Ones

This integration depends only on Lit's `ElementRenderer` contract, so it will
server-render any custom element that has a renderer registered — including
Lit elements:

```ts
import { LitElementRenderer } from "@lit-labs/ssr/lib/lit-element-renderer.js";
import { ElementRendererRegistry } from "@svebcomponents/ssr";

ElementRendererRegistry.use(LitElementRenderer);
```

`use()` registers a renderer that selects its own elements through Lit's
static `matchesClass` hook, so that one line covers every LitElement in the
app. `e2e/ssr-react` renders a plain Lit element through this package to keep
that honest.

This is the piece `@lit-labs/ssr-react` does not expose: it hardcodes
`elementRenderers: [LitElementRenderer]`, so it can only ever render Lit
elements, and anything else silently renders without shadow content.

## App-author Flow

Point the JSX transform at this package:

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@svebcomponents/ssr-react",
  },
}
```

Load the component package's browser entry (which defines the custom element)
and its `/ssr` entry (which registers the renderer), then write custom elements
as normal JSX:

```tsx
<my-component title="Hello" count={5} />
```

Or skip the runtime swap and use the wrapper directly:

```tsx
import { CustomElement } from "@svebcomponents/ssr-react";

<CustomElement tag="my-component" title="Hello" count={5} />;
```

## Async Components

React's `renderToString` cannot await, so a component that renders
asynchronously — one that awaits while rendering, or whose `index.ssr.ts`
exports an async `SsrPrepare` hook — **cannot be server-rendered by this
integration**.

Rather than failing the page, such an element is emitted without server-rendered
shadow content and rendered in the browser only, with a one-time console
warning naming the tag. Genuine render failures (an unregistered renderer, for
instance) still throw, because those are configuration errors rather than a
capability gap.

This is a limitation of this integration, not of React. React's _streaming_
renderer does preserve declarative shadow DOM: suspended content is delivered
as ordinary HTML that the parser processes in a hidden staging container, so
the shadow root attaches there, and React's relocation script then moves the
_element_ — which carries its shadow root with it. Lifting the limit is a
wrapper design problem (`use()` needs a render-stable promise, which needs a
per-request cache), not a platform one.

See [the async SSR findings](https://github.com/svebcomponents/svebcomponents/blob/main/packages/ssr-react/docs/async-ssr.md)
for the investigation, the measured behavior, and the candidate designs. They
are asserted by tests in `e2e/ssr-react/test/experiments/`, so a change in
React's behavior fails rather than silently going stale.

Note that the Vue integration has no such limitation at all: `renderToString`
there awaits async `setup()` and emits in order.

## Requirements

`@svebcomponents/ssr` calls Svelte's server renderer, so `svelte` must be
installed as a server-side dependency of the React app even though no Svelte
components appear in it. The component package's own server bundle ships its
Svelte runtime, but the renderer entry point does not.

## How It Works

On the server the wrapper resolves the custom element's registered
`ElementRenderer`, applies the incoming attributes and properties, and renders:

```html
<my-component title="Hello">
  <template shadowrootmode="open"><!-- shadow content --></template>
  <!-- light dom children -->
</my-component>
```

Two details make this work in React specifically:

- `dangerouslySetInnerHTML` goes on the `<template>`, not on the host element.
  React refuses to render raw HTML and children on the same element, so putting
  it on the host would make light-dom children impossible.
- The host element's props are the union of the incoming props and the
  renderer's attributes. The renderer's values win where both supply one.
  Emitting only the renderer's attributes would leave React's client tree
  carrying primitive props the server never serialized, which React reports as
  a hydration mismatch.

In the browser the wrapper renders the same element _without_ the template,
because the HTML parser has already adopted it into a shadow root and removed
it from the light DOM. What React hydrates against is the post-parse child
list, so the two trees agree.

## Current Limitations

- Experimental; the API may change.
- Synchronous element renderers only when server-rendering (see above).
- Custom element tags are detected structurally (a dash, minus the HTML spec's
  reserved SVG/MathML names).
- The consuming app must import the browser custom element module and register
  the matching SSR renderer, exactly as with the Svelte integration.
- React Server Components are untested.
