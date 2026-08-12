Server-side rendering support for custom elements inside Astro apps.

This package finds custom element tags in `.astro` templates, routes them
through the shared `@svebcomponents/ssr` registry, and emits declarative shadow
DOM.

This package is in beta. Its API may change before 1.0.

## Installation

```bash
pnpm add -D @svebcomponents/ssr-astro
```

## Setup

Add the integration:

```ts
import { defineConfig } from "astro/config";
import svebcomponents from "@svebcomponents/ssr-astro";

export default defineConfig({
  integrations: [svebcomponents()],
});
```

Load the package's browser entry to define the element and its `/ssr` entry to
register the renderer. Then use the element in an `.astro` file:

```astro
---
import "my-component-package";
import "my-component-package/ssr";
---

<my-component title="Hello" count="5">
  <p>light dom child</p>
</my-component>
```

## Browser behavior

Astro ships no host JavaScript for these elements. The parser attaches the
server-rendered shadow root, then the element upgrades and hydrates when its
bundle loads.

The exception is Astro islands: a custom element inside a `client:*` React,
Vue or Svelte island belongs to that framework, and the corresponding
svebcomponents integration applies there.

## Async Components

Astro frontmatter runs in an async module scope, so the wrapper awaits the
element renderer. An
[asynchronous component](https://svebcomponents.dev/server-rendering/#asynchronous-components)
uses the same wrapper as a synchronous component.

Enable Svelte's async SSR mode in the Astro server entry:

```ts
import "@svebcomponents/ssr/enable-async";
```

## Other custom elements

This integration server-renders any custom element with a registered Lit
`ElementRenderer`, including Lit elements. See
[Other custom elements](https://svebcomponents.dev/server-rendering/#other-custom-elements).

## Requirements

`svelte` must be installed as a server-side dependency of the Astro app, even
though no Svelte components appear in it; see
[Compatibility](https://svebcomponents.dev/reference/compatibility/).

## Render flow

A Vite plugin rewrites custom element tags in `.astro` source to a wrapper
component, which renders:

```html
<my-component title="Hello">
  <template shadowrootmode="open"><!-- shadow content --></template>
  <!-- light dom children -->
</my-component>
```

The integration rewrites source in Vite's `load` hook. Astro's `transform` hook
runs first and would leave the integration with compiled JavaScript. The
`load` hook serves Astro's virtual `?astro=…` requests before compilation.

The wrapper closes `<template>` with an end tag. Astro does not treat a
self-closing `<template ... />` as void, so it would place the following
`<slot />` inside the shadow content.

Astro's parser classifies a dashed tag as a `custom-element` AST node. The
integration reads that node instead of maintaining an exclusion list.

## Astro integration API

Astro's `addRenderer()` API handles UI framework islands with `client:*`
directives and expects `check()` and `renderToStaticMarkup()` entrypoints.
Custom elements hydrate themselves, so this package uses a template rewrite
and wrapper component.

## Current Limitations

- Only `.astro` templates are rewritten. Custom elements inside `.mdx` are
  untested.
- The consuming app must import the browser custom element module and register
  the matching SSR renderer, exactly as with the other integrations.
