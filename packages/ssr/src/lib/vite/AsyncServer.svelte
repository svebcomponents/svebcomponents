<script lang="ts">
  import type { Snippet } from "svelte";
  import { isKebabCase, camelizeKebabCase } from "@svebcomponents/utils";
  import { collectResult } from "@lit-labs/ssr/lib/render-result.js";

  import { isValidCustomElementTagName } from "../runtime/html.js";
  import { ElementRendererRegistry } from "../runtime/rendererRegistry.js";

  interface WebComponentWrapperProps {
    children?: Snippet;
    _tagName: string;
    [key: string]: unknown;
  }

  const {
    children,
    _tagName: tag,
    ...props
  }: WebComponentWrapperProps = $props();

  const renderCustomElement = async (
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
    const customElementRenderer = new CustomElementRendererCtor();

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
    const shadow = await collectResult(shadowStream);
    const attributes = await collectResult(
      customElementRenderer.renderAttributes(),
    );
    return {
      closeTag: `</${tagName}>`,
      openTag: `<${tagName}${attributes}>`,
      shadow,
    };
  };

  // svelte-ignore state_referenced_locally -- SSR renders this wrapper once from the initial custom-element props.
  const rendered = renderCustomElement(tag, props);
</script>

<p>server</p>

{#if true}
  {@const renderedCustomElement = await rendered}
  <!-- eslint-disable-next-line svelte/no-at-html-tags -- tag name is validated above and attributes are escaped by the renderer -->
  {@html renderedCustomElement.openTag}
  <template shadowrootmode="open">
    <!-- eslint-disable-next-line -- it is the ElementRenderer's responsibility to ensure everything is properly sanitized -->
    {@html renderedCustomElement.shadow}
  </template>
  {@render children?.()}
  <!-- eslint-disable-next-line svelte/no-at-html-tags -- close tag contains only the validated tag name -->
  {@html renderedCustomElement.closeTag}
{/if}
