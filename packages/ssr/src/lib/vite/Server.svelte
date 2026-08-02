<script lang="ts">
  // Installed first, before any other import: this wrapper is what Vite's
  // dev-time transform (and the generated production SSR entry) always
  // loads before a custom element renders, so shim installation must not
  // depend on some other module (e.g. the consuming app's own server hook)
  // happening to import `@svebcomponents/ssr` first. installShim's effects
  // are idempotent, so this is safe to run alongside that too.
  import "../runtime/installShim.js";
  import type { Snippet } from "svelte";

  import { renderCustomElementSync } from "../runtime/renderCustomElement.js";

  interface WebComponentWrapperProps {
    children?: Snippet;
    _tagName: string;
    [key: string]: unknown;
  }

  let {
    children,
    _tagName: tag,
    ...props
  }: WebComponentWrapperProps = $props();

  // eslint-disable-next-line svelte/no-unused-svelte-ignore -- svelte-check reports this warning, but eslint does not.
  // svelte-ignore state_referenced_locally -- SSR renders this wrapper once from the initial custom-element props.
  const rendered = renderCustomElementSync(tag, props);
</script>

<!-- The element fragment below must stay structurally identical to
Client.svelte's (and AsyncServer.svelte's): rendering the same svelte
constructs on both sides is what lets a hydrating Svelte host claim the
SSR'd custom element instead of re-creating it.
The parser consumes the shadow template into the element's shadow root
before hydration runs, leaving an empty {@html} anchor pair behind — which
is exactly what Client.svelte's `{@html ""}` claims. -->
<!-- eslint-disable svelte/no-at-html-tags -- shadow content is escaped by the element renderer -->
<svelte:element this={tag} {...rendered.attributes}
  >{@html rendered.shadowTemplate}{@render children?.()}</svelte:element
>
