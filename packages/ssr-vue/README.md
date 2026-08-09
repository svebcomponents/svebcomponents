Server-side rendering support for Svelte-built custom elements inside Vue apps.

This is the Vue counterpart to `@svebcomponents/ssr`'s Svelte integration. The
element renderers, the DOM shim, the renderer registry and the client-side
hydration machinery are all shared — this package only supplies the two pieces
that are host-framework specific: finding custom element tags in Vue templates,
and emitting declarative shadow DOM around them.

This package is experimental. Its API may change before it is released
alongside the rest of the toolchain.

## What It Provides

- `@svebcomponents/ssr-vue/vite`: a Vite plugin that rewrites custom element
  tags in SFC templates to the wrapper component.
- `@svebcomponents/ssr-vue`: the wrapper component and a Vue plugin that
  registers it.

## App-author Flow

Install the Vite plugin ahead of `@vitejs/plugin-vue`:

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
app. `e2e/ssr-vue` renders a plain Lit element through this package to keep
that honest.

## Async Components

Unlike the Svelte integration, there is no sync/async wrapper split. Vue's
`renderToString` fully awaits an async `setup()` and emits its output in order,
so an asynchronous component renders through the same wrapper a synchronous one
does. A component is asynchronous if it awaits while rendering, or if its
`<entry>.ssr.ts` preparation hook returns a promise — see
[What makes a component asynchronous](https://svebcomponents.dev/core-concepts/ssr/#what-makes-a-component-asynchronous).

There is one catch, and it applies to any non-Svelte host. Svelte gates async
SSR behind a module-global flag that is normally flipped by a Svelte app
compiled with `compilerOptions.experimental.async`. A Vue app has no such
app, so it must opt in explicitly on the server:

```ts
import "@svebcomponents/ssr/enable-async";
```

Without it, `render()` runs synchronously even when awaited and an async
component throws `await_invalid`.

## Requirements

`@svebcomponents/ssr` calls Svelte's server renderer, so `svelte` must be
installed as a server-side dependency of the Vue app even though no Svelte
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
