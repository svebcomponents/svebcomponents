"use client";

import { BROWSER } from "esm-env";
import { createElement, type ReactElement, type ReactNode } from "react";

export interface CustomElementShellProps {
  /** The custom element's tag name. */
  tag: string;
  /** What the browser renders on the host element. */
  props: Record<string, unknown>;
  /** The element renderer's own attributes. Server pass only. */
  attributes: Record<string, string>;
  /** Escaped shadow-root markup from the element renderer. Server pass only. */
  shadowContent: string;
  children?: ReactNode;
}

/**
 * The Client Component half of the RSC wrapper.
 *
 * {@link AsyncCustomElement} has to stay a Server Component — only an RSC
 * function may await — but a Server Component's output is replayed from the
 * Flight payload in the browser, so it cannot be the thing that decides
 * whether to emit a `<template shadowrootmode>`. That decision has to happen
 * in a function React runs on both sides, which is what this is.
 *
 * The cost is that `shadowContent` crosses the RSC boundary as a prop and so
 * appears in the Flight payload as well as in the HTML. The browser branch
 * ignores it — a client-side navigation renders the bare host element and lets
 * the element mount itself — but it is still on the wire. The synchronous
 * {@link CustomElement} avoids this by being a client boundary outright, so
 * the renderer runs in the SSR pass and nothing pre-rendered is serialized.
 */
export const CustomElementShell = ({
  tag,
  props,
  attributes,
  shadowContent,
  children,
}: CustomElementShellProps): ReactElement => {
  if (BROWSER) {
    // The parser has already adopted the `<template shadowrootmode>` into the
    // element's shadow root and removed it from the light DOM, so the client
    // tree deliberately omits it: what React hydrates against is the
    // post-parse child list.
    return createElement(tag, props, children);
  }

  return createElement(
    tag,
    // see CustomElement for why this is a union of incoming props and the
    // renderer's attributes
    { ...props, ...attributes },
    createElement("template", {
      key: "svebcomponents-shadow",
      shadowrootmode: "open",
      // shadow content is escaped by the element renderer
      dangerouslySetInnerHTML: { __html: shadowContent },
    }),
    children,
  );
};

export default CustomElementShell;
