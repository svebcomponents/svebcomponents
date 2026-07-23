Experimental server-side rendering support for Svelte-built custom elements.

Browsers know how to instantiate custom elements, but server renderers usually only see an unknown HTML tag. `@svebcomponents/ssr` bridges that gap by letting a custom element package provide an `ElementRenderer`, then letting a Vite app use that renderer when it sees the custom element in a Svelte template.

The design is modeled after Lit's server-side rendering system: custom elements are rendered by `ElementRenderer` classes, and the server uses declarative shadow DOM to serialize the rendered shadow root.

This package is still experimental. It is useful for exploration and integration tests, but the runtime API and generated output may still change. Attribute values/names and tag names are validated and escaped through Svelte's own SSR serializer, and this is covered by XSS regression tests, but the package has not had an independent security audit, and shadow-root content rendered via `{@html}` relies on the renderer's escaping. Treat it as experimental and avoid untrusted content in production.

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

When using `@svebcomponents/build`, an adjacent server module such as
`src/index.ssr.ts` is discovered automatically. Its default `SsrPrepare` export
runs after host attributes and properties have been applied but before the
component renders. Values written with `setProperty` are serialized into
hydratable output for reuse in the browser.

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

This automatically adds `@svebcomponents/ssr` to Vite's `ssr.noExternal` (it
ships raw `.svelte` files under some export conditions, which Node's SSR
externalization can't load directly). If your own component package also
needs `ssr.noExternal` (e.g. an `externalSvelte` build sharing the host's
Svelte runtime), list it via the plugin's `noExternal` option:

```ts
svebcomponentsSsr({ noExternal: ["my-component-package"] });
```

Load the component's renderer once before rendering templates that use the custom element:

```ts
import "my-component-package/ssr";
```

No explicit registration call is needed: the generated renderer reads its own
tag name from the component's `<svelte:options customElement>` declaration at
build time and registers itself with `ElementRendererRegistry` on import. The
DOM shim installs first regardless of import order or bundler chunking, so
there's no ordering convention to follow here.

If a component's tag name couldn't be determined at build time (e.g. it's
computed dynamically), the generated renderer falls back to requiring manual
registration instead:

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

The registry is designed for the Svelte-generated renderers produced by this package. Registered renderers are instantiated with the resolved tag name, so stock Lit `ElementRenderer` classes now receive their `tagName`, but the Svelte wrapper still passes a minimal `RenderInfo` when rendering; full compatibility with arbitrary Lit renderers is therefore not guaranteed.

### `SvelteCustomElementRenderer`

A base renderer for Svelte custom elements.

It creates the client custom element class, applies incoming attributes/properties, and renders the server Svelte component with `svelte/server`. Generated SSR entrypoints extend this class.

Its optional `SsrPrepare` hook receives a read-only property snapshot and a
`setProperty` callback. Synchronous hooks preserve synchronous rendering;
promise-returning hooks require an async-capable host integration.

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
- Attribute values/names and tag names are validated/escaped via Svelte's SSR serializer and covered by XSS regression tests, but the generated HTML and shadow DOM output have not had an independent security audit.
- Custom element tags are detected by the presence of a dash in the tag name.
- The consuming app must import the browser custom element module and register the matching SSR renderer.
- The Vite plugin currently transforms Svelte files and injects a Svelte wrapper component.
- Async SSR currently requires Svelte's experimental async compiler mode in the
  consuming Svelte app.
