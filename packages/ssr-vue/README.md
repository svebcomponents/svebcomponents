Server-side rendering support for Svelte-built custom elements inside Vue apps.

This package finds custom element tags in Vue templates, routes them through
the shared `@svebcomponents/ssr` registry, and emits declarative shadow DOM.

This package is in beta. Its API may change before 1.0.

## Exports

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

Load the package's browser entry to define the element and its `/ssr` entry to
register the renderer. Then use the element in an SFC:

```vue
<template>
  <my-component title="Hello" :count="5" />
</template>
```

## Other custom elements

This integration server-renders any custom element with a registered Lit
`ElementRenderer`, including Lit elements. See
[Other custom elements](https://svebcomponents.dev/server-rendering/#other-custom-elements).

## Async Components

Vue's `renderToString` awaits an async `setup()` before emitting output. An
[asynchronous component](https://svebcomponents.dev/server-rendering/#asynchronous-components)
uses the same wrapper as a synchronous component.

Enable Svelte's async SSR mode in the Vue server entry:

```ts
import "@svebcomponents/ssr/enable-async";
```

Without it, `render()` uses synchronous mode and an async component throws
`await_invalid`.

## Requirements

`svelte` must be installed as a server-side dependency of the Vue app, even
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

The HTML parser requires `<template shadowrootmode>` as the element's first
child. It adopts the template into a shadow root and removes it from the light
DOM. The browser wrapper omits the consumed template, and Vue hydrates against
the remaining child list.

Both branches spread slot content into the child list. A nested array becomes
a Vue Fragment, and Vue SSR wraps it in `<!--[-->` and `<!--]-->` anchors that
would cause a hydration mismatch.

## Vite transform

Vue runs user `compilerOptions.nodeTransforms` after its built-in transforms.
By then, `@vue/compiler-ssr` has resolved the component identity and ignores a
renamed tag on the server.

Rewriting the SFC source before `@vitejs/plugin-vue` sees it means both
compiles observe the same template.

## Current Limitations

- Custom element tags are detected structurally (a dash, minus the HTML spec's
  reserved SVG/MathML names). Pass `tags` to the Vite plugin to narrow it.
- Only SFC `<template>` blocks are rewritten. Custom elements written directly
  in a render function or JSX must use `CustomElementWrapper` by hand.
- The consuming app must import the browser custom element module and register
  the matching SSR renderer, exactly as with the Svelte integration.
