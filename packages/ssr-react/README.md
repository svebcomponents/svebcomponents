Server-side rendering support for Svelte-built custom elements inside React apps.

This is the React counterpart to `@svebcomponents/ssr`'s Svelte integration.
The element renderers, the DOM shim, the renderer registry and the client-side
hydration machinery are all shared; this package only supplies the two pieces
that are host-framework specific: routing custom element tags to a wrapper, and
emitting declarative shadow DOM around them.

This package is experimental. Its API may change before it is released
alongside the rest of the toolchain.

**The default `CustomElement` is synchronous rendering only.** See "Async
Components" below for the RSC opt-in.

## What It Provides

- `@svebcomponents/ssr-react` — the `CustomElement` component.
- `@svebcomponents/ssr-react/jsx-runtime` (and `/jsx-dev-runtime`) — drop-in
  replacements for React's JSX runtime that route any dashed tag through it.
- `@svebcomponents/ssr-react/rsc` — an async `CustomElement` for React Server
  Components, which server-renders asynchronous elements instead of degrading.

Unlike the Svelte and Vue integrations, there is no bundler plugin. The JSX
runtime swap is a compiler setting, so this works anywhere React does,
including hosts that are not Vite-based.

## Any custom element, not just Svelte-built ones

This integration depends only on Lit's `ElementRenderer` contract, so it
server-renders any custom element with a registered renderer — Lit elements
included. See
[Any custom element](https://svebcomponents.dev/core-concepts/ssr/#any-custom-element-not-just-svelte-built-ones).

## Installation

```bash
pnpm add -D @svebcomponents/ssr-react
```

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

React's `renderToString` cannot await, so an
[asynchronous component](https://svebcomponents.dev/core-concepts/ssr/#what-makes-a-component-asynchronous)
**cannot be server-rendered by the default `CustomElement`**.

Rather than failing the page, such an element is emitted without server-rendered
shadow content and rendered in the browser only, with a one-time console
warning naming the tag. Genuine render failures (an unregistered renderer, for
instance) still throw, because those are configuration errors rather than a
capability gap.

Apps on a React Server Components framework can avoid the degrade entirely by
rendering the element from a Server Component instead:

```tsx
import { CustomElement } from "@svebcomponents/ssr-react/rsc";

<CustomElement tag="my-component" title="Hello" count={5} />;
```

An RSC async function component runs to completion before any markup is
emitted, so it can `await` the renderer directly: no cache, no `use()`, no
Suspense boundary. That only works for elements rendered from a Server
Component, though: an async function component cannot be imported into a
Client Component (`"use client"`), so an element rendered from client-side
React, on an RSC framework or not, has no async path and keeps the default's
degrade-to-client-only behavior.

## Requirements

`svelte` must be installed as a server-side dependency of the React app, even
though no Svelte components appear in it; see
[Compatibility](https://svebcomponents.dev/reference/compatibility/).

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
- The RSC entry point (`/rsc`) only helps elements rendered from a Server
  Component; there is no async path for a plain streaming SSR app or for
  elements rendered from a Client Component (see "Async Components" above).
