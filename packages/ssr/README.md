`@svebcomponents/ssr` connects server-built Svelte components to host
frameworks. It renders a registered custom element into host attributes and a
declarative shadow DOM template.

The package implements Lit Labs' `ElementRenderer` contract for Svelte
components. Lit Labs supplies `ElementRenderer`, `RenderInfo`, result
collectors, and the server DOM shim. svebcomponents supplies the Svelte
renderer, its own renderer registry, and host-facing render functions.

The SSR packages are in beta. Their APIs may change before 1.0.

## Installation

Install this package in a Svelte host or when you write a host adapter:

```bash
pnpm add @svebcomponents/ssr
```

React, Vue, and Astro apps install this runtime with their host package. The
host package depends on the runtime, but a direct install satisfies component
packages that declare it as a peer and lets the app choose its version.
Component packages that use `@svebcomponents/build` get the server build helper
through that package.

## Svelte host setup

Add the SSR transform before the Svelte plugin:

```ts
import svebcomponentsSsr from "@svebcomponents/ssr/vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [svebcomponentsSsr(), svelte()],
});
```

Load the component's browser entry in client code:

```ts
// client entry
import "my-component-package";
```

Load its renderer entry on the server:

```ts
// server entry
import "my-component-package/ssr";
```

The renderer entry registers itself when the component declares a literal tag
in `<svelte:options>`. The Vite transform routes dashed tags in Svelte files
through the runtime wrapper.

```svelte
<my-component title="Hello" count={5}></my-component>
```

See the [SvelteKit setup](https://svebcomponents.dev/server-rendering/sveltekit/)
for import placement, `noExternal`, and async mode.

## Package exports

| Export                              | Use                                                               |
| ----------------------------------- | ----------------------------------------------------------------- |
| `@svebcomponents/ssr`               | Registry, renderer base class, render functions, and SSR DOM shim |
| `@svebcomponents/ssr/vite`          | Svelte template transform and wrapper selection                   |
| `@svebcomponents/ssr/tsdown`        | Server build configuration used by `@svebcomponents/build`        |
| `@svebcomponents/ssr/svelte-config` | Svelte config type and compiler-option merge helper               |
| `@svebcomponents/ssr/hydration`     | Client extension used by generated hydratable elements            |

The wrapper and hydration-host exports support generated builds and the Vite
plugin. App code should use the host integration.

## Runtime API

### Render one element

Use the async function in hosts that can await server work:

```ts
import { renderCustomElement } from "@svebcomponents/ssr";
import "my-component-package/ssr";

const rendered = await renderCustomElement("my-component", {
  title: "Hello",
  count: 5,
});
```

`rendered.attributes` contains unescaped host attribute values. Let the host
framework escape them. `rendered.shadowTemplate` contains a complete
`<template shadowrootmode="open">` string. `shadowContent` contains its inner
markup.

`renderCustomElementSync(tag, props)` serves hosts with a synchronous renderer.
It throws `AsyncRendererError` when a preparation hook or component render
returns async work.

### Register a renderer

Generated renderer entries call `ElementRendererRegistry.set()` for their
declared tag. You can register a computed tag yourself:

```ts
import { ElementRendererRegistry } from "@svebcomponents/ssr";
import MyRenderer from "my-component-package/ssr";

ElementRendererRegistry.set("my-component", MyRenderer);
```

The registry accepts constructors that implement Lit Labs' `ElementRenderer`
surface. Register a renderer that selects elements through Lit's
`matchesClass` protocol with `use()`:

```ts
import { LitElementRenderer } from "@lit-labs/ssr/lib/lit-element-renderer.js";
import { ElementRendererRegistry } from "@svebcomponents/ssr";

ElementRendererRegistry.use(LitElementRenderer);
```

An explicit `set()` registration wins for its element. Registry lookups also
walk the custom-element class prototype chain.

### Prepare server data

An `SsrPrepare` hook receives a read-only property snapshot before rendering.
`setProperty()` changes the server props. In a hydratable build, the renderer
serializes JSON-compatible rich values for the browser. Return a promise for an
await-capable host. Read
[Async components and server data](https://svebcomponents.dev/server-rendering/async/)
for the file convention and host support.

## Vite plugin options

```ts
svebcomponentsSsr({
  async: true,
  noExternal: ["my-component-package"],
});
```

| Option       | Purpose                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------ |
| `async`      | Select the async Svelte wrapper. The plugin reads the host's Svelte compiler setting when you omit it. |
| `noExternal` | Send packages with raw `.svelte` exports through Vite's SSR pipeline.                                  |

The plugin adds `@svebcomponents/ssr` to `ssr.noExternal` because its wrapper
exports contain Svelte source.

## Limits

- Host code must load the browser custom-element module and the matching
  server renderer.
- The Svelte transform treats valid dashed names as custom elements.
- Async rendering uses Svelte's experimental async compiler mode.
- Lit Labs SSR remains experimental, so upstream contracts may change.
- Svelte's serializer escapes generated markup, and the project tests tag,
  attribute-name, and attribute-value paths. The maintainers have not
  commissioned an independent security audit of the output.

Start with the [server rendering overview](https://svebcomponents.dev/server-rendering/)
or open the package for your host framework.
