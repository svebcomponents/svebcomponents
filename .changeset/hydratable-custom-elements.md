---
"@svebcomponents/ssr": minor
"@svebcomponents/build": minor
"@svebcomponents/auto-options": minor
---

Hydratable custom elements: server-rendered declarative shadow DOM is now **hydrated** instead of being wiped and re-rendered when the element upgrades.

Previously, svelte's generated custom element always called `attachShadow` (clearing the declarative shadow root per spec) and then `mount`ed the component from scratch — losing the server-rendered DOM, transient state, and re-creating every node. Now, `@svebcomponents/build` compiles components as hydratable by default:

- `@svebcomponents/auto-options` injects svelte's official `customElement.extend` hook wired to the new `hydratable` wrapper from `@svebcomponents/ssr/hydration`.
- The wrapper claims the declarative shadow root before svelte can clear it and hydrates it via svelte's public `hydrate()` API — the server-rendered nodes are adopted in place, styles are deduped by svelte itself, and the component is fully reactive afterwards.
- On the server, the generated SSR entry renders through a `HydrationHost` component (also used on the client) so the markup structure matches by construction.
- Anything non-hydratable — no declarative shadow root, slotted components, reconnection after teardown — falls back to svelte's untouched mount path, and svelte's own hydration mismatch recovery re-mounts, so a failed hydration degrades to exactly the previous behavior.

Opt out per package with `defineConfig({ hydratable: false })` (or per component by declaring your own `extend`). Client custom-element bundles are now built with `platform: "browser"`, so browser export conditions resolve correctly.

Known limitations (fall back to mount, tracked as follow-ups): components with slots; legacy `createEventDispatcher` events on hydrated elements (native `$host()` events are unaffected); component `export`s are not exposed on hydrated hosts.
