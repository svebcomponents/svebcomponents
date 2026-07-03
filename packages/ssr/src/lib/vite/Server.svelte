<script lang="ts">
  import type { Snippet } from "svelte";
  import { isKebabCase, camelizeKebabCase } from "@svebcomponents/utils";
  import { collectResultSync } from "@lit-labs/ssr/lib/render-result.js";

  import { isValidCustomElementTagName } from "../runtime/html.js";
  import { ElementRendererRegistry } from "../runtime/rendererRegistry.js";

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

  if (!isValidCustomElementTagName(tag)) {
    throw new Error(`Invalid custom element tag name: ${tag}`);
  }

  // get the custom element constructor
  const ctor = customElements.get(tag);
  if (!ctor) throw new Error(`Custom element ${tag} not found`);
  // get custom element renderer & instantiate
  const CustomElementRendererCtor = ElementRendererRegistry.get(ctor);
  if (!CustomElementRendererCtor)
    throw new Error(`Custom element renderer for ${tag} not found`);
  const customElementRenderer = new CustomElementRendererCtor();
  // set attributes / props
  for (const [key, value] of Object.entries(props)) {
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
  // render
  const shadowStream = customElementRenderer.renderShadow(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: pass something meaningful here
    {} as any,
  );
  if (!shadowStream) throw new Error(`Shadow stream for ${tag} not found`);
  const shadow = collectResultSync(shadowStream);
  const attributes = collectResultSync(
    customElementRenderer.renderAttributes(),
  );
  const openTag = `<${tag}${attributes}>`;
  const closeTag = `</${tag}>`;
</script>

<!-- eslint-disable-next-line svelte/no-at-html-tags -- tag name is validated above and attributes are escaped by the renderer -->
{@html openTag}
<template shadowrootmode="open">
  <!-- eslint-disable-next-line -- it is the ElementRenderer's responsibility to ensure everything is properly sanitized -->
  {@html shadow}
</template>
{@render children?.()}
<!-- eslint-disable-next-line svelte/no-at-html-tags -- close tag contains only the validated tag name -->
{@html closeTag}
