`@svebcomponents/ssr-astro` renders registered custom elements with declarative
shadow DOM in Astro pages. The package is in beta.

## Setup

```bash
pnpm add @svebcomponents/ssr @svebcomponents/ssr-astro svelte
```

Add the integration:

```ts
import svebcomponents from "@svebcomponents/ssr-astro";
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [svebcomponents()],
});
```

Load the server entries from Astro frontmatter. Put the browser entry in a
processed script so Astro includes it in the client bundle:

```astro
---
import "my-component-package/ssr";
---

<script>
  import "my-component-package";
</script>

<my-component title="Hello" count="5">
  <p>Light-DOM child</p>
</my-component>
```

Astro ships no host runtime for this element. The browser parser attaches the
server-rendered shadow root, and the component's browser class upgrades and
hydrates it.

See the [Astro setup guide](https://svebcomponents.dev/server-rendering/astro/)
for project layout and island behavior.

## Async components

Astro can await the wrapper and promise-returning preparation hooks. Enable
`compilerOptions.experimental.async` in the component package when the Svelte
component itself awaits during rendering.

## Exports and options

| Export                                | Use                               |
| ------------------------------------- | --------------------------------- |
| `@svebcomponents/ssr-astro`           | Astro integration                 |
| `@svebcomponents/ssr-astro/vite`      | Vite transform for custom setups  |
| `@svebcomponents/ssr-astro/component` | Wrapper that the integration uses |

Pass `tags` to limit which custom elements the integration renders:

```ts
svebcomponents({ tags: ["my-component", "my-dialog"] });
```

## Limits

- Use Astro 5 and install Svelte in the server app.
- The integration transforms `.astro` templates. It does not cover MDX.
- A custom element inside a React, Vue, or Svelte `client:*` island belongs to
  that framework's render tree. Configure the matching host integration there.
- App code must load the component's browser entry and server renderer.

Read [Async components and server data](https://svebcomponents.dev/server-rendering/async/)
for server data hooks and host support.
