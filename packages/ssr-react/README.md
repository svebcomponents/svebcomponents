Server-side rendering support for Svelte-built custom elements inside React apps.

This package routes React custom element tags through the shared
`@svebcomponents/ssr` renderer registry and emits declarative shadow DOM.

This package is in beta. Its API may change before 1.0.

**The default `CustomElement` uses synchronous rendering.** See "Async
Components" for the RSC opt-in.

## Exports

- `@svebcomponents/ssr-react`: the `CustomElement` component.
- `@svebcomponents/ssr-react/jsx-runtime` and `/jsx-dev-runtime`: drop-in
  replacements for React's JSX runtime that route any dashed tag through it.
- `@svebcomponents/ssr-react/rsc`: an async `CustomElement` for React Server
  Components, which server-renders asynchronous elements instead of degrading.

The JSX runtime setting works in React hosts that do not use Vite.

## Other custom elements

This integration server-renders any custom element with a registered Lit
`ElementRenderer`, including Lit elements. See
[Other custom elements](https://svebcomponents.dev/server-rendering/#other-custom-elements).

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
and its `/ssr` entry (which registers the renderer), then use the element in
JSX:

```tsx
<my-component title="Hello" count={5} />
```

You can use the wrapper without changing the runtime:

```tsx
import { CustomElement } from "@svebcomponents/ssr-react";

<CustomElement tag="my-component" title="Hello" count={5} />;
```

## Async Components

React's `renderToString` cannot await, so an
[asynchronous component](https://svebcomponents.dev/server-rendering/#asynchronous-components)
**cannot be server-rendered by the default `CustomElement`**.

The default wrapper emits an async element without shadow content and logs one
warning. The browser renders the component. Configuration errors, such as a
missing renderer, still throw.

React Server Components can use the async wrapper:

```tsx
import { CustomElement } from "@svebcomponents/ssr-react/rsc";

<CustomElement tag="my-component" title="Hello" count={5} />;
```

An RSC async function component awaits the renderer before emitting markup.
Client Components cannot import an async function component, so they use the
browser-rendered fallback.

## Requirements

`svelte` must be installed as a server-side dependency of the React app, even
though no Svelte components appear in it; see
[Compatibility](https://svebcomponents.dev/reference/compatibility/).

## Render flow

On the server the wrapper resolves the custom element's registered
`ElementRenderer`, applies the incoming attributes and properties, and renders:

```html
<my-component title="Hello">
  <template shadowrootmode="open"><!-- shadow content --></template>
  <!-- light dom children -->
</my-component>
```

React requires two details:

- `dangerouslySetInnerHTML` goes on the `<template>`, not on the host element.
  React refuses to render raw HTML and children on the same element, so putting
  it on the host would make light-dom children impossible.
- The host element's props are the union of the incoming props and the
  renderer's attributes. The renderer's values win where both supply one.
  Emitting only the renderer's attributes would leave React's client tree
  carrying primitive props the server did not serialize, which React reports as
  a hydration mismatch.

In the browser, the wrapper omits the template after the HTML parser adopts it
into a shadow root. React hydrates against the remaining child list.

## Current Limitations

- Synchronous element renderers only when server-rendering (see above).
- Custom element tags are detected structurally (a dash, minus the HTML spec's
  reserved SVG/MathML names).
- The consuming app must import the browser custom element module and register
  the matching SSR renderer, exactly as with the Svelte integration.
- The RSC entry point (`/rsc`) only helps elements rendered from a Server
  Component; there is no async path for a plain streaming SSR app or for
  elements rendered from a Client Component (see "Async Components" above).
