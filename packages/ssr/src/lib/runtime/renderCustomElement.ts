import {
  collectResult,
  collectResultSync,
} from "@lit-labs/ssr/lib/render-result.js";
import { isKebabCase, camelizeKebabCase } from "@svebcomponents/utils";

import type { ElementRenderer } from "@lit-labs/ssr";

import { isValidCustomElementTagName, isValidAttributeName } from "./html.js";
import { ElementRendererRegistry } from "./rendererRegistry.js";
import { createRenderInfo } from "./renderInfo.js";

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
   * A complete `<template shadowrootmode="open">…</template>` string, for
   * hosts that emit raw markup (Svelte's `{@html}`, React's
   * `dangerouslySetInnerHTML`). Content is already escaped by the element
   * renderer.
   */
  shadowTemplate: string;
  /**
   * The shadow root's inner markup without the surrounding `<template>`, for
   * hosts that build the template element themselves and need to fill it
   * (Vue's `innerHTML` prop, for instance). Same escaping guarantees as
   * {@link shadowTemplate}.
   */
  shadowContent: string;
}

/**
 * Thrown by {@link renderCustomElementSync} when the element's renderer turns
 * out to be asynchronous — an async `SsrPrepare` hook, or a component that
 * awaits while rendering.
 *
 * Host integrations whose SSR pipeline cannot await (React's synchronous
 * `renderToString`, for instance) catch this to fall back to client-only
 * rendering, while letting genuine render errors propagate.
 */
export class AsyncRendererError extends Error {
  override readonly name = "AsyncRendererError";

  constructor(
    readonly tagName: string,
    override readonly cause: unknown,
  ) {
    super(
      `<${tagName}> renders asynchronously and cannot be rendered through the synchronous path. ` +
        "Use renderCustomElement (async) from an await-capable host, or let the host fall back to client-only rendering.",
    );
  }
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

  const CustomElementRendererCtor = ElementRendererRegistry.get(ctor, tagName);
  if (!CustomElementRendererCtor)
    throw new Error(`Custom element renderer for ${tagName} not found`);
  const renderer = new CustomElementRendererCtor(tagName);

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

  // A real RenderInfo, not a stub: a renderer whose shadow content is itself a
  // template (LitElementRenderer calls `renderValue(value, renderInfo)`) reads
  // it, and nested custom elements are resolved through its `elementRenderers`.
  const renderInfo = createRenderInfo(ElementRendererRegistry.getAll());
  renderer.connectedCallback();
  renderInfo.customElementInstanceStack.push(renderer);
  renderInfo.customElementHostStack.push(renderer);

  const shadowStream = renderer.renderShadow(renderInfo);
  if (!shadowStream) throw new Error(`Shadow stream for ${tagName} not found`);

  return { renderer, shadowStream };
};

/**
 * Reads the renderer's host attributes as a name→value record.
 *
 * This is deliberately expressed in terms of Lit's `ElementRenderer` surface
 * alone — `element.attributes` — rather than any svebcomponents-specific
 * method, so *any* conforming `ElementRenderer` can be driven by this module.
 * It is the same thing `@lit-labs/ssr-react` does to turn a renderer's
 * attributes into host props.
 *
 * A renderer that emulates its element instead of instantiating one (Lit's
 * own `FallbackRenderer`, for instance) exposes no `element`; it simply
 * contributes no attributes, again matching Lit's behavior.
 */
const attributesRecord = (
  renderer: ElementRenderer,
): Record<string, string> => {
  const attributes: Record<string, string> = {};
  const element = renderer.element;
  if (element === undefined) return attributes;

  for (const { name, value } of Array.from(
    element.attributes as unknown as ArrayLike<{ name: string; value: string }>,
  )) {
    // Names bypass the renderer's own serializer on this path, and can come
    // from runtime custom-element inputs, so they are validated here.
    if (!isValidAttributeName(name)) {
      throw new Error(`Invalid SSR attribute name: ${name}`);
    }
    attributes[name] = value;
  }
  return attributes;
};

/**
 * Distinguishes "this renderer is asynchronous" from a genuine render failure.
 *
 * Neither collector exposes a typed error, so this matches on what they do
 * throw: svelte prefixes its message with the error code, and Lit reports the
 * unexpected promise in its stream.
 */
const isAsynchronyError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  return (
    error.message.startsWith("await_invalid") ||
    error.message.includes("Promises not supported")
  );
};

const toResult = (
  renderer: ElementRenderer,
  shadow: string,
): RenderedCustomElement => ({
  attributes: attributesRecord(renderer),
  shadowTemplate: `<template shadowrootmode="open">${shadow}</template>`,
  shadowContent: shadow,
});

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
  let shadow: string;
  try {
    shadow = collectResultSync(shadowStream);
  } catch (error) {
    // Both collectors can surface asynchrony: Lit's sync collector rejects a
    // promise in the result stream, and svelte's own renderer throws
    // `await_invalid` when it hits async work in a sync render. Neither is a
    // problem with the component, so both are reported as one typed error.
    if (isAsynchronyError(error)) {
      throw new AsyncRendererError(tagName, error);
    }
    throw error;
  }
  return toResult(renderer, shadow);
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
  return toResult(renderer, shadow);
};
