# `@svebcomponents/ssr`

`@svebcomponents/ssr` is a collection of tools for server-side rendering web components with Svelte.

- Rollup Plugins
  - `pluginGenerateSsrEntry`
    - allows you to build server-side-renderable web components with Rollup
- Vite Plugins
  - `vitePluginSvebcomponentsSsr`
    - finds web components inside your svelte templates and replaces them with the `CustomElementWrapper.svelte` component
    - `CustomElementWrapper.svelte` is a noop on the client, but on the server it will render the web component using the `ElementRenderer` provided by the web component
- Runtime Utils
  - responsible for allowing you to render arbitrary web components in SvelteKit (or other vite based SSR frameworks) as long as they provide a `ElementRenderer`
  - `installShim`
    - installs `@lit-labs/ssr-dom-shim` shims, in order to...
      - ensure your server doesn't explode when importing web components
      - have a minimal working implementation of `customElements` on the server so web components ctors can be registered with tag names
  - `ElementRendererRegistry`
    - a registry for registering `ElementRenderers` that should be used for rendering custom elements
  - `SvelteCustomElementRenderer`
    - base class for `ElementRenderers` for server-side rendering web components build with `pluginGenerateSsrEntry` (via `@svebcomponents/build`)
