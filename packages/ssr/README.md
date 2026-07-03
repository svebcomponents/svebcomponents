Experimental server-side rendering support for Svelte-built custom elements.

Browsers know how to instantiate custom elements, but server renderers usually only see an unknown HTML tag. `@svebcomponents/ssr` bridges that gap by letting a custom element package provide an `ElementRenderer`, then letting a Vite app use that renderer when it sees the custom element in a Svelte template.

The design is modeled after Lit's server-side rendering system: custom elements are rendered by `ElementRenderer` classes, and the server uses declarative shadow DOM to serialize the rendered shadow root.

This package is still experimental. It is useful for exploration and integration tests, but the runtime API and generated output may still change. It has not yet been hardened against XSS or other injection attacks, so do not use it with untrusted content in production.

## What It Provides

`@svebcomponents/ssr` has three pieces:

- `@svebcomponents/ssr/tsdown`: a tsdown config helper used by `@svebcomponents/build` to generate a server-renderable build and an `ssr.js` renderer entrypoint.
- `@svebcomponents/ssr/vite`: a Vite pre-transform that wraps custom element tags in Svelte templates with a runtime wrapper component.
- `@svebcomponents/ssr`: runtime utilities for installing server DOM shims, registering renderers, and rendering Svelte custom elements through Lit's SSR `ElementRenderer` API.

Useful background and related upstream limitations:

- [Lit SSR overview](https://lit.dev/docs/ssr/overview/)
- [`@lit-labs/ssr`](https://github.com/lit/lit/tree/main/packages/labs/ssr)
- [`@lit-labs/ssr-dom-shim`](https://github.com/lit/lit/tree/main/packages/labs/ssr-dom-shim)
- Lit SSR async rendering discussion: [lit/lit#2469](https://github.com/lit/lit/issues/2469)
- Lit SSR declarative shadow DOM discussion: [lit/lit#3080](https://github.com/lit/lit/issues/3080)
- Browser feature used for output: declarative shadow DOM

## Package-author Flow

Most component packages should use `@svebcomponents/build` rather than importing the SSR build helper directly.

When SSR is enabled, the build produces a server output directory containing an `ssr.js` entrypoint. That entrypoint exports an `ElementRenderer` subclass for the custom element.

Expose it from your component package:

```json
{
  "exports": {
    ".": {
      "import": "./dist/client/index.js"
    },
    "./ssr": {
      "import": "./dist/server/ssr.js"
    }
  }
}
```

The browser entrypoint defines the custom element. The SSR entrypoint provides the renderer an app can register on the server.

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

Register the component's renderer before rendering templates that use the custom element:

```ts
import { ElementRendererRegistry } from "@svebcomponents/ssr";

import "my-component-package";
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
can only consume renderers whose shadow output is fully synchronous.

The app can then render Svelte markup containing the custom element:

```svelte
<my-component title="Hello" count={5}></my-component>
```

On the server, the Vite plugin rewrites that tag to `CustomElementWrapper`. The wrapper looks up the custom element constructor, finds the registered renderer, passes attributes and properties into it, and emits declarative shadow DOM.

On the client, the wrapper renders the original custom element tag so the browser can hydrate/upgrade it normally.

## Runtime Exports

### `ElementRendererRegistry`

A global registry that maps custom element constructors to Lit `ElementRenderer` constructors.

```ts
ElementRendererRegistry.set("my-component", MyComponentRenderer);
```

You can register by tag name or by constructor. Lookups walk the element prototype chain, so a renderer registered for a base element class can also serve subclasses.

### `SvelteCustomElementRenderer`

A base renderer for Svelte custom elements.

It creates the client custom element class, applies incoming attributes/properties, and renders the server Svelte component with `svelte/server`. Generated SSR entrypoints extend this class.

### `installShim`

Importing `@svebcomponents/ssr` installs `@lit-labs/ssr-dom-shim` globals:

- `Element`
- `HTMLElement`
- `customElements`

Those shims allow custom element modules to be imported in server environments.

## Vite Transform

The Vite plugin scans `.svelte` files before they are compiled.

Any regular element whose tag name contains a dash is treated as a custom element:

```svelte
<my-component count={5}></my-component>
```

It is rewritten to the wrapper component:

```svelte
<CustomElementWrapper _tagName="my-component" count={5}></CustomElementWrapper>
```

The plugin also rewrites plain `slot` attributes inside custom elements to spread attributes. This avoids Svelte's component-slot transform from removing custom-element slot attributes during SSR.

## Current Limitations

- This package is experimental and not recommended for production yet.
- The generated HTML and shadow DOM output have not yet been audited or hardened against XSS.
- Custom element tags are detected by the presence of a dash in the tag name.
- The consuming app must import the browser custom element module and register the matching SSR renderer.
- Server-side attribute rendering is still incomplete.
- The Vite plugin currently transforms Svelte files and injects a Svelte wrapper component.
- Async SSR currently requires Svelte's experimental async compiler mode in the
  consuming Svelte app.
