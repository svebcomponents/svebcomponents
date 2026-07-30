import { BROWSER } from "esm-env";
import { createElement, type ReactElement, type ReactNode } from "react";

import {
  AsyncRendererError,
  renderCustomElementSync,
} from "@svebcomponents/ssr";

export interface CustomElementProps {
  /** The custom element's tag name. */
  tag: string;
  children?: ReactNode;
  [key: string]: unknown;
}

/** Reports a server-render failure once per tag, rather than per render. */
const warnedTags = new Set<string>();

const warnOnce = (tag: string, message: string) => {
  if (warnedTags.has(tag)) return;
  warnedTags.add(tag);
  console.warn(`[svebcomponents] ${message}`);
};

/**
 * Renders a Svelte-built custom element inside a React app.
 *
 * On the server it drives the element's registered `ElementRenderer` and emits
 * declarative shadow DOM. In the browser it renders the bare custom element
 * tag and lets the element upgrade and hydrate itself from the server-rendered
 * shadow root.
 *
 * Usable directly for explicit control:
 *
 * ```tsx
 * <CustomElement tag="my-component" title="Hello" count={5} />
 * ```
 *
 * or reached automatically by setting `jsxImportSource` to this package, which
 * routes any dashed tag through it.
 */
export const CustomElement = ({
  tag,
  children,
  ...props
}: CustomElementProps): ReactElement => {
  if (BROWSER) {
    // The parser has already adopted the server-rendered
    // `<template shadowrootmode>` into the element's shadow root and removed
    // it from the light DOM, so the client tree deliberately omits it: what
    // React hydrates against is the post-parse child list.
    return createElement(tag, props, children);
  }

  let rendered;
  try {
    rendered = renderCustomElementSync(tag, props);
  } catch (error) {
    if (error instanceof AsyncRendererError) {
      // React's synchronous render cannot await this. Emitting the element
      // without a shadow root degrades to client-only rendering for this
      // element rather than failing the whole page — and it stays consistent
      // with what the browser branch renders, so hydration still matches.
      warnOnce(
        tag,
        `<${tag}> renders asynchronously, which this React integration cannot server-render. ` +
          "It was emitted without server-rendered shadow content and will render in the browser only. " +
          "See the package README's 'Async Components' section.",
      );
      return createElement(tag, props, children);
    }
    throw error;
  }

  return createElement(
    tag,
    // The union matters for hydration. `rendered.attributes` holds what the
    // element renderer produced (incoming string attributes plus any props
    // svelte reflects), while `props` is what the browser branch renders.
    // Emitting only the former would leave React's client tree carrying
    // primitive props the server never serialized, which is a hydration
    // mismatch; the renderer's values win where both supply one.
    { ...props, ...rendered.attributes },
    // The declarative shadow root must be the element's *first* child. Putting
    // dangerouslySetInnerHTML on this <template> rather than on the host
    // element is what lets light-dom children coexist with it: React refuses
    // to render both raw HTML and children on the same element.
    createElement("template", {
      key: "svebcomponents-shadow",
      shadowrootmode: "open",
      // shadow content is escaped by the element renderer
      dangerouslySetInnerHTML: { __html: rendered.shadowContent },
    }),
    children,
  );
};

export default CustomElement;
