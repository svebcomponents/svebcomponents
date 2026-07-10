---
"@svebcomponents/ssr": patch
---

Fix a flash of unstyled content (FOUC) when a component declares an explicit `<svelte:options customElement={{ ... }}>`.

The SSR build compiles components with `customElement: false` (it renders the shadow *content*, not a custom element). But when the source declares `<svelte:options customElement>`, Svelte treats the component's `<style>` as belonging to a custom element's shadow root and drops it entirely from the server render — the compiler emits no `css.add`, so the server output carries scoped class names with no `<style>`. The result is server-rendered shadow DOM that stays unstyled until the client bundle injects the styles at hydration.

A new build step (`pluginStripCustomElementOptions`) removes the `customElement` option from `<svelte:options>` before the server compile, so the CSS is emitted and placed inside the declarative shadow root — styled at first paint, no flash. The client build keeps `customElement` (where the element is defined), so only SSR output changes. Components without an explicit `<svelte:options customElement>` (the common case, where auto-options injects it into the client build only) were already unaffected.
