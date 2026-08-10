Server-side rendering support for custom elements inside Astro apps.

This is the Astro counterpart to `@svebcomponents/ssr`'s Svelte integration.
The element renderers, the DOM shim, the renderer registry and the client-side
hydration machinery are all shared — this package only supplies what is
specific to Astro: finding custom element tags in `.astro` templates, and
emitting declarative shadow DOM around them.

This package is experimental. Its API may change before it is released
alongside the rest of the toolchain.

## Setup

Add the integration. That is the entire configuration:

```ts
import { defineConfig } from "astro/config";
import svebcomponents from "@svebcomponents/ssr-astro";

export default defineConfig({
  integrations: [svebcomponents()],
});
```

Load the component package's browser entry (which defines the custom element)
and its `/ssr` entry (which registers the renderer), then write custom elements
in any `.astro` file:

```astro
---
import "my-component-package";
import "my-component-package/ssr";
---

<my-component title="Hello" count="5">
  <p>light dom child</p>
</my-component>
```

## The Simplest Client Story of the Three

Astro ships no client-side JavaScript for these elements, so there is no
client-side counterpart to this integration and nothing to register in the
browser. The parser attaches the server-rendered shadow root, the element
upgrades when its bundle loads, and it hydrates its own shadow content.

That removes the entire class of problem the Vue and React integrations have
to manage — matching a client render against the server's markup. There is no
host render to match.

The exception is Astro islands: a custom element inside a `client:*` React,
Vue or Svelte island belongs to that framework, and the corresponding
svebcomponents integration applies there.

## Async Components

Astro frontmatter is an async module scope, so the wrapper simply awaits the
element renderer. An asynchronous component — one that awaits while rendering,
or whose `<entry>.ssr.ts` preparation hook returns a promise (see
[What makes a component asynchronous](https://svebcomponents.dev/core-concepts/ssr/#what-makes-a-component-asynchronous))
— works through the same wrapper as a synchronous one: no sync/async split as in
the Svelte integration, and no degradation as in React's.

Being a non-Svelte host, an Astro app does need to opt into Svelte's async SSR
mode explicitly:

```ts
import "@svebcomponents/ssr/enable-async";
```

## Any Custom Element, Not Just Svelte-built Ones

This integration depends only on Lit's `ElementRenderer` contract, so it will
server-render any custom element that has a renderer registered — including
Lit elements:

```ts
import { LitElementRenderer } from "@lit-labs/ssr/lib/lit-element-renderer.js";
import { ElementRendererRegistry } from "@svebcomponents/ssr";

ElementRendererRegistry.use(LitElementRenderer);
```

## Requirements

`@svebcomponents/ssr` calls Svelte's server renderer, so `svelte` must be
installed as a server-side dependency of the Astro app even though no Svelte
components appear in it. The component package's own server bundle ships its
Svelte runtime, but the renderer entry point does not.

## How It Works

A Vite plugin rewrites custom element tags in `.astro` source to a wrapper
component, which renders:

```html
<my-component title="Hello">
  <template shadowrootmode="open"><!-- shadow content --></template>
  <!-- light dom children -->
</my-component>
```

Two implementation details are worth knowing, because both are easy to get
wrong:

**The rewrite happens in Vite's `load` hook, not `transform`.** Astro compiles
`.astro` to JavaScript in its own `transform`, and its plugin is `enforce:
"pre"` and registered ahead of anything an integration contributes — so a
`transform` here would receive compiled JavaScript with no custom element tags
left in it. Astro's `load` hook only serves its virtual `?astro=…`
sub-requests, so supplying the component file's contents there means Astro's
compiler transforms the rewritten source regardless of plugin order.

**The wrapper closes its `<template>` explicitly.** A self-closing
`<template ... />` is not treated as void by Astro's compiler; it swallows the
following `<slot />`, putting the light-dom children inside the shadow content.

Detection needs no heuristics: Astro's parser classifies a dashed tag as its
own `custom-element` AST node, so unlike the Svelte and Vue integrations there
is no "contains a dash" rule and no reserved SVG/MathML exclusion list.

## Not an Astro "Renderer"

Astro's `addRenderer()` API is for UI-framework components used as islands,
with `client:*` directives — it expects `check()` and `renderToStaticMarkup()`
entrypoints. A custom element is not an island: it hydrates itself and needs no
directive. So this ships as a template rewrite plus a wrapper component rather
than a renderer registration.

## Current Limitations

- Experimental; the API may change.
- Only `.astro` templates are rewritten. Custom elements inside `.mdx` are
  untested.
- The consuming app must import the browser custom element module and register
  the matching SSR renderer, exactly as with the other integrations.
