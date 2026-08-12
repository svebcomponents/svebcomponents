Server-side rendering support for Svelte-built custom elements.

Browsers instantiate custom elements from registered classes. A server renderer
sees an HTML tag without that class. `@svebcomponents/ssr` lets a component
package provide an `ElementRenderer` that a host app can call.

The package uses Lit's `ElementRenderer` contract and serializes shadow roots as
declarative shadow DOM.

This package is in beta. Its runtime API and generated output may change before
1.0. See [Current Limitations](#current-limitations) for the security posture.

## Installation

```bash
pnpm add -D @svebcomponents/ssr
```

Component packages built with `@svebcomponents/build` get the SSR build helper
already; install this directly in the host application that renders the
elements.

## Exports

`@svebcomponents/ssr` has three pieces:

- `@svebcomponents/ssr/tsdown`: a tsdown config helper used by `@svebcomponents/build` to generate a server-renderable build and an `ssr.js` renderer entrypoint.
- `@svebcomponents/ssr/vite`: a Vite pre-transform that wraps custom element tags in Svelte templates with a runtime wrapper component.
- `@svebcomponents/ssr`: runtime utilities for installing server DOM shims, registering renderers, and rendering Svelte custom elements through Lit's SSR `ElementRenderer` API.

Related specifications and upstream issues:

- [Lit SSR overview](https://lit.dev/docs/ssr/overview/)
- [`@lit-labs/ssr`](https://github.com/lit/lit/tree/main/packages/labs/ssr)
- [`@lit-labs/ssr-dom-shim`](https://github.com/lit/lit/tree/main/packages/labs/ssr-dom-shim)
- Lit SSR async rendering discussion: [lit/lit#2469](https://github.com/lit/lit/issues/2469)
- Lit SSR declarative shadow DOM discussion: [lit/lit#3080](https://github.com/lit/lit/issues/3080)
- Browser feature used for output: declarative shadow DOM

## Package-author Flow

Component packages can use `@svebcomponents/build` to configure the SSR helper.

With SSR enabled, the build writes an `ssr.js` entrypoint that exports an
`ElementRenderer` subclass for the custom element.

Expose it from your component package:

```json
{
  "exports": {
    ".": {
      "types": "./dist/client/index.d.ts",
      "default": "./dist/client/index.js"
    },
    "./ssr": {
      "types": "./dist/server/ssr.d.ts",
      "default": "./dist/server/ssr.js"
    }
  }
}
```

The browser entrypoint defines the custom element. The SSR entrypoint provides the renderer an app can register on the server.

`@svebcomponents/build` includes an adjacent server module such as
`src/index.ssr.ts`. Its default `SsrPrepare` export runs after the renderer
applies host attributes and properties and before the component renders. The
renderer serializes values written with `setProperty` for browser hydration.
Returning a promise puts the
component on the async path. See
[Asynchronous components](https://svebcomponents.dev/server-rendering/#asynchronous-components).

If the package's Svelte config enables Svelte async rendering, the generated
`./ssr` renderer can yield async Lit `RenderResult` chunks. Async-capable host
integrations should use the async Vite wrapper below.

## App-author Flow

Install the Vite plugin in the consuming app:

```ts
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";
import svebcomponentsSsr from "@svebcomponents/ssr/vite";

export default defineConfig({
  plugins: [svebcomponentsSsr(), svelte()],
});
```

The plugin adds `@svebcomponents/ssr` to Vite's `ssr.noExternal` because some
exports contain raw `.svelte` files. Add component packages that ship raw
Svelte exports through the plugin's `noExternal` option:

```ts
svebcomponentsSsr({ noExternal: ["my-component-package"] });
```

Load the component's renderer once before rendering templates that use the custom element:

```ts
import "my-component-package/ssr";
```

The generated renderer reads its own tag name from the component's
`<svelte:options customElement>` declaration at build time and registers
itself with `ElementRendererRegistry` on import. The DOM shim installs first
regardless of import order or bundler chunking.

Register the renderer yourself if the component computes its tag name:

```ts
import { ElementRendererRegistry } from "@svebcomponents/ssr";
import MyComponentRenderer from "my-component-package/ssr";

ElementRendererRegistry.set("my-component", MyComponentRenderer);
```

Async SSR requires the host Svelte compiler to opt into Svelte's experimental
async mode:

```ts
export default defineConfig({
  plugins: [
    svebcomponentsSsr({ async: true }),
    svelte({
      compilerOptions: {
        experimental: {
          async: true,
        },
      },
    }),
  ],
});
```

The async wrapper can consume both sync and async renderers. The sync wrapper
requires renderers with synchronous shadow output.

A host that is **not** a Svelte app has no such compilation, so it must flip
Svelte's async SSR flag itself, once, on the server:

```ts
import "@svebcomponents/ssr/enable-async";
```

Without it, `render()` runs synchronously even when awaited and an async
component throws `await_invalid`.

The app can then render Svelte markup containing the custom element:

```svelte
<my-component title="Hello" count={5}></my-component>
```

On the server, the Vite plugin rewrites that tag to `CustomElementWrapper`. The wrapper looks up the custom element constructor, finds the registered renderer, passes attributes and properties into it, and emits declarative shadow DOM.

In the browser, the wrapper renders the custom element tag for upgrade and
hydration.

## Runtime Exports

### `ElementRendererRegistry`

A global registry that maps custom element constructors to Lit `ElementRenderer` constructors.

```ts
ElementRendererRegistry.set("my-component", MyComponentRenderer);
```

You can register by tag name or by constructor. Lookups walk the element prototype chain, so a renderer registered for a base element class can also serve subclasses.

The registry accepts any Lit `ElementRenderer`. Host integrations read
attributes from `renderer.element.attributes`, as `@lit-labs/ssr-react` does.
A renderer without an element contributes no host attributes.

Generated renderers implement Lit's static `matchesClass` hook, so
`@lit-labs/ssr` can use them in `elementRenderers`.

Renderers receive Lit's `RenderInfo`. This lets `LitElementRenderer` call
`renderValue(value, renderInfo)` for template content and resolve nested custom
elements through the registry.

Register a renderer that selects its own elements with `use()`:

```ts
import { LitElementRenderer } from "@lit-labs/ssr/lib/lit-element-renderer.js";

ElementRendererRegistry.use(LitElementRenderer);
```

`use()` follows Lit's static `matchesClass` protocol. An explicit `set()`
registration takes precedence for its tag.

### `SvelteCustomElementRenderer`

A base renderer for Svelte custom elements.

It creates the client custom element class, applies incoming attributes/properties, and renders the server Svelte component with `svelte/server`. Generated SSR entrypoints extend this class and add a `matchesClass` implementation for their own element.

Host attributes live on Lit's `ElementRenderer.element`. Svelte's generated
custom element class extends the SSR shim element, so Lit and other host
integrations can read the same attributes.

Its optional `SsrPrepare` hook receives an immutable property snapshot and a
`setProperty` callback. Synchronous hooks preserve synchronous rendering;
promise-returning hooks require an async-capable host integration.

### `installShim`

Importing `@svebcomponents/ssr` installs `@lit-labs/ssr-dom-shim` globals:

- `Element`
- `HTMLElement`
- `customElements`

Those shims let server code import custom element modules.

## Vite Transform

The Vite plugin scans `.svelte` files before Svelte compiles them.

The plugin treats a regular element whose tag contains a dash as a custom
element:

```svelte
<my-component count={5}></my-component>
```

It is rewritten to the wrapper component:

```svelte
<CustomElementWrapper _tagName="my-component" count={5}></CustomElementWrapper>
```

The plugin also rewrites plain `slot` attributes inside custom elements to spread attributes. This avoids Svelte's component-slot transform from removing custom-element slot attributes during SSR.

## Current Limitations

- This package is in beta, so its runtime API and generated output may change before 1.0.
- Svelte's SSR serializer validates and escapes attribute values, attribute
  names, and tag names. XSS regression tests cover those paths. No independent
  security audit covers the generated HTML or shadow DOM.
- The plugin detects custom element tags by a dash in the name.
- The consuming app must import the browser custom element module and register the matching SSR renderer.
- The Vite plugin transforms Svelte files and injects a Svelte wrapper component.
- Async SSR requires Svelte's experimental async compiler mode in the
  consuming Svelte app.
