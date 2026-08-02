import {
  collectResult,
  collectResultSync,
} from "@lit-labs/ssr/lib/render-result.js";
import { isKebabCase, camelizeKebabCase } from "@svebcomponents/utils";

import { isValidCustomElementTagName } from "./html.js";
import { ElementRendererRegistry } from "./rendererRegistry.js";
import { isSvelteCustomElementRenderer } from "./svelteCustomElementRenderer.js";

/**
 * The host-framework-neutral result of server-rendering one custom element.
 *
 * A host integration emits these two pieces around its own children:
 * the attributes go on the custom element tag, and `shadowTemplate` is
 * inserted as the element's *first* child so the HTML parser adopts it into
 * a shadow root before hydration runs.
 */
export interface RenderedCustomElement {
  /**
   * Host attributes as a raw name→value record. Values are unescaped — the
   * host framework's own attribute serialization is expected to escape them.
   */
  attributes: Record<string, string>;
  /**
   * A complete `<template shadowrootmode="open">…</template>` string. Its
   * content is already escaped by the element renderer.
   */
  shadowTemplate: string;
}

/**
 * Props a host wrapper uses for its own plumbing rather than passing to the
 * custom element. Excluded defensively: every current wrapper already strips
 * these before calling, but a wrapper that forwards a raw prop bag should not
 * be able to leak them into the rendered element.
 */
const RESERVED_PROP_NAMES = new Set(["_tagName", "children"]);

/**
 * Looks up the registered renderer for `tagName`, applies `props` to it, and
 * returns it alongside its shadow `RenderResult` stream.
 *
 * Whether that stream can be collected synchronously depends on the
 * component: a renderer whose `SsrPrepare` hook returns a promise, or whose
 * component genuinely awaits while rendering, yields promises into the
 * stream and therefore requires {@link renderCustomElement}.
 */
const startRender = (tagName: string, props: Record<string, unknown>) => {
  if (!isValidCustomElementTagName(tagName)) {
    throw new Error(`Invalid custom element tag name: ${tagName}`);
  }

  const ctor = customElements.get(tagName);
  if (!ctor) throw new Error(`Custom element ${tagName} not found`);

  const CustomElementRendererCtor = ElementRendererRegistry.get(ctor);
  if (!CustomElementRendererCtor)
    throw new Error(`Custom element renderer for ${tagName} not found`);
  const renderer = new CustomElementRendererCtor(tagName);
  if (!isSvelteCustomElementRenderer(renderer)) {
    throw new Error(
      `Renderer for ${tagName} must extend SvelteCustomElementRenderer`,
    );
  }

  for (const [key, value] of Object.entries(props)) {
    if (RESERVED_PROP_NAMES.has(key)) continue;
    if (typeof value === "string" && isKebabCase(key)) {
      renderer.setAttribute(key, value);
      continue;
    }
    if (isKebabCase(key)) {
      renderer.setProperty(camelizeKebabCase(key), value);
      continue;
    }
    renderer.setProperty(key, value);
  }

  const shadowStream = renderer.renderShadow(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: pass something meaningful here
    {} as any,
  );
  if (!shadowStream) throw new Error(`Shadow stream for ${tagName} not found`);

  return { renderer, shadowStream };
};

const wrapShadow = (shadow: string) =>
  `<template shadowrootmode="open">${shadow}</template>`;

/**
 * Server-renders a custom element, collecting its shadow content
 * synchronously.
 *
 * Throws if the component renders asynchronously (an async `SsrPrepare` hook,
 * or a component that awaits while rendering). Host integrations that can
 * await should use {@link renderCustomElement} instead; ones that cannot
 * should treat the throw as a signal to fall back to client-only rendering.
 */
export const renderCustomElementSync = (
  tagName: string,
  props: Record<string, unknown>,
): RenderedCustomElement => {
  const { renderer, shadowStream } = startRender(tagName, props);
  const shadow = collectResultSync(shadowStream);
  return {
    attributes: renderer.getSsrAttributes(),
    shadowTemplate: wrapShadow(shadow),
  };
};

/**
 * Server-renders a custom element, awaiting asynchronous shadow content.
 *
 * Accepts both synchronous and asynchronous renderers, so host integrations
 * whose SSR pipeline can await (Vue's `renderToString`, for instance) should
 * prefer this over {@link renderCustomElementSync}.
 */
export const renderCustomElement = async (
  tagName: string,
  props: Record<string, unknown>,
): Promise<RenderedCustomElement> => {
  const { renderer, shadowStream } = startRender(tagName, props);
  const shadow = await collectResult(shadowStream);
  return {
    attributes: renderer.getSsrAttributes(),
    shadowTemplate: wrapShadow(shadow),
  };
};
