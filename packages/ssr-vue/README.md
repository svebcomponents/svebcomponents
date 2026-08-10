Server-side rendering support for Svelte-built custom elements inside Vue apps.

This is the Vue counterpart to `@svebcomponents/ssr`'s Svelte integration. The
element renderers, the DOM shim, the renderer registry and the client-side
hydration machinery are all shared; this package only supplies the two pieces
that are host-framework specific: finding custom element tags in Vue templates,
and emitting declarative shadow DOM around them.

This package is experimental. Its API may change before it is released
alongside the rest of the toolchain.

## What It Provides

- `@svebcomponents/ssr-vue/vite`: a Vite plugin that rewrites custom element
  tags in SFC templates to the wrapper component.
- `@svebcomponents/ssr-vue`: the wrapper component and a Vue plugin that
  registers it.

## Installation

```bash
pnpm add -D @svebcomponents/ssr-vue
```

## App-author Flow

Add the Vite plugin ahead of `@vitejs/plugin-vue`:

```ts
import vue from "@vitejs/plugin-vue";
import svebcomponentsVue from "@svebcomponents/ssr-vue/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [svebcomponentsVue(), vue()],
});
```

Register the wrapper on both the server and client app instances:

```ts
import { svebcomponents } from "@svebcomponents/ssr-vue";

app.use(svebcomponents());
```

Then load the component package's browser entry (which defines the custom
element) and its `/ssr` entry (which registers the renderer), and render the
custom element in any SFC:

```vue
<template>
  <my-component title="Hello" :count="5" />
</template>
```

## Any custom element, not just Svelte-built ones

This integration depends only on Lit's `ElementRenderer` contract, so it
server-renders any custom element with a registered renderer — Lit elements
included. See
[Any custom element](https://svebcomponents.dev/core-concepts/ssr/#any-custom-element-not-just-svelte-built-ones).

## Async Components

Unlike the Svelte integration, there is no sync/async wrapper split. Vue's
`renderToString` fully awaits an async `setup()` and emits its output in order,
so an
[asynchronous component](https://svebcomponents.dev/core-concepts/ssr/#what-makes-a-component-asynchronous)
renders through the same wrapper a synchronous one does.

Like any non-Svelte host, a Vue app must opt into Svelte's async SSR mode
explicitly on the server:

```ts
import "@svebcomponents/ssr/enable-async";
```

Without it, `render()` runs synchronously even when awaited and an async
component throws `await_invalid`.

## Requirements

`svelte` must be installed as a server-side dependency of the Vue app, even
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

The `<template shadowrootmode>` must be the element's first child, because the
HTML parser adopts it into a shadow root and removes it from the light DOM
before any script runs. In the browser the wrapper therefore renders the same
element _without_ it — what Vue hydrates against is the post-parse child list.

Both branches build the child list identically (slot content is spread, never
nested), because a nested array becomes a Vue Fragment and Vue SSR brackets a
Fragment in `<!--[-->` / `<!--]-->` anchors. Emitting those on one side only is
a hydration mismatch.

## Why a Vite Plugin Instead of a Compiler Transform

Vue exposes `compilerOptions.nodeTransforms`, which looks like the natural
place to retag custom elements. It does not work for SSR: user node transforms
run after the built-in ones on enter, and `@vue/compiler-ssr` resolves a
component's identity during `ssrTransformComponent`'s enter phase. A transform
that renames the tag is honored by the client compile and silently ignored by
the SSR compile, producing an app that renders correctly in the browser and
not at all on the server.

Rewriting the SFC source before `@vitejs/plugin-vue` sees it means both
compiles observe the same template.

## Current Limitations

- Experimental; the API may change.
- Custom element tags are detected structurally (a dash, minus the HTML spec's
  reserved SVG/MathML names). Pass `tags` to the Vite plugin to narrow it.
- Only SFC `<template>` blocks are rewritten. Custom elements written directly
  in a render function or JSX must use `CustomElementWrapper` by hand.
- The consuming app must import the browser custom element module and register
  the matching SSR renderer, exactly as with the Svelte integration.
