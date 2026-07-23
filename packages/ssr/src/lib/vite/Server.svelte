<script lang="ts">
  // Installed first, before any other import: this wrapper is what Vite's
  // dev-time transform (and the generated production SSR entry) always
  // loads before a custom element renders, so shim installation must not
  // depend on some other module (e.g. the consuming app's own server hook)
  // happening to import `@svebcomponents/ssr` first. installShim's effects
  // are idempotent, so this is safe to run alongside that too.
  import "../runtime/installShim.js";
  import type { Snippet } from "svelte";
  import { isKebabCase, camelizeKebabCase } from "@svebcomponents/utils";
  import { collectResultSync } from "@lit-labs/ssr/lib/render-result.js";

  import { isValidCustomElementTagName } from "../runtime/html.js";
  import { ElementRendererRegistry } from "../runtime/rendererRegistry.js";
  import { isSvelteCustomElementRenderer } from "../runtime/svelteCustomElementRenderer.js";

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

  const renderCustomElement = (
    tagName: string,
    customElementProps: Record<string, unknown>,
  ) => {
    if (!isValidCustomElementTagName(tagName)) {
      throw new Error(`Invalid custom element tag name: ${tagName}`);
    }

    const ctor = customElements.get(tagName);
    if (!ctor) throw new Error(`Custom element ${tagName} not found`);

    const CustomElementRendererCtor = ElementRendererRegistry.get(ctor);
    if (!CustomElementRendererCtor)
      throw new Error(`Custom element renderer for ${tagName} not found`);
    const customElementRenderer = new CustomElementRendererCtor(tagName);
    if (!isSvelteCustomElementRenderer(customElementRenderer)) {
      throw new Error(
        `Renderer for ${tagName} must extend SvelteCustomElementRenderer`,
      );
    }

    for (const [key, value] of Object.entries(customElementProps)) {
      if (key === "_tagName" || key === "children") continue;
      if (typeof value === "string" && isKebabCase(key)) {
        customElementRenderer.setAttribute(key, value);
        continue;
      }
      if (isKebabCase(key)) {
        customElementRenderer.setProperty(camelizeKebabCase(key), value);
        continue;
      }
      customElementRenderer.setProperty(key, value);
    }

    const shadowStream = customElementRenderer.renderShadow(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: pass something meaningful here
      {} as any,
    );
    if (!shadowStream)
      throw new Error(`Shadow stream for ${tagName} not found`);
    const shadow = collectResultSync(shadowStream);
    return {
      attributes: customElementRenderer.getSsrAttributes(),
      // The parser consumes this template into the element's shadow root
      // before hydration runs, leaving an empty {@html} anchor pair behind —
      // which is exactly what Client.svelte's `{@html ""}` claims.
      shadowTemplate: `<template shadowrootmode="open">${shadow}</template>`,
    };
  };

  // eslint-disable-next-line svelte/no-unused-svelte-ignore -- svelte-check reports this warning, but eslint does not.
  // svelte-ignore state_referenced_locally -- SSR renders this wrapper once from the initial custom-element props.
  const rendered = renderCustomElement(tag, props);
</script>

<!-- The element fragment below must stay structurally identical to
Client.svelte's (and AsyncServer.svelte's): rendering the same svelte
constructs on both sides is what lets a hydrating Svelte host claim the
SSR'd custom element instead of re-creating it. -->
<!-- eslint-disable svelte/no-at-html-tags -- shadow content is escaped by the element renderer -->
<svelte:element this={tag} {...rendered.attributes}
  >{@html rendered.shadowTemplate}{@render children?.()}</svelte:element
>
