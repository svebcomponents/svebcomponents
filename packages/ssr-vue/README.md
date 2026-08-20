`@svebcomponents/ssr-vue` renders registered custom elements with declarative
shadow DOM in Vue 3 apps. The package is in beta.

## Setup

```bash
pnpm add @svebcomponents/ssr @svebcomponents/ssr-vue svelte
```

Add the transform before Vue's Vite plugin:

```ts
import svebcomponentsVue from "@svebcomponents/ssr-vue/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [svebcomponentsVue(), vue()],
});
```

Register the wrapper on the server and client app instances:

```ts
import { svebcomponents } from "@svebcomponents/ssr-vue";

app.use(svebcomponents());
```

Load your component package's browser entry in client code and its renderer
entry on the server. You can then use its tag in a Vue template:

```vue
<template>
  <my-component title="Hello" :count="5" />
</template>
```

The adapter emits a declarative shadow template on the server. The browser
turns that template into a shadow root, and the generated extension asks Svelte
to hydrate it when the browser entry loads.

See the [Vue setup guide](https://svebcomponents.dev/server-rendering/vue/)
for a complete server and client entry.

## Async components

Vue's server renderer can await the wrapper and promise-returning preparation
hooks. Enable `compilerOptions.experimental.async` in the component package
when the Svelte component itself awaits during rendering.

The same wrapper handles synchronous and async renderers.

## Exports and options

| Export                         | Use                                                      |
| ------------------------------ | -------------------------------------------------------- |
| `@svebcomponents/ssr-vue`      | `svebcomponents()` Vue plugin and `CustomElementWrapper` |
| `@svebcomponents/ssr-vue/vite` | SFC template transform                                   |

Pass `tags` to restrict the transform:

```ts
svebcomponentsVue({ tags: ["my-component", "my-dialog"] });
```

The transform routes valid dashed names through the wrapper if you omit
`tags`.

## Limits

- Use Vue 3.5 with Vite 6 through 8, and install Svelte in the server app.
- The transform scans SFC `<template>` blocks. Render functions and JSX must
  use `CustomElementWrapper`.
- App code must load the component's browser entry and server renderer.
- Nested arrays in light-DOM slot content can produce Vue fragment markers and
  a hydration mismatch.

Read [Async components and server data](https://svebcomponents.dev/server-rendering/async/)
for server data hooks and host support.
