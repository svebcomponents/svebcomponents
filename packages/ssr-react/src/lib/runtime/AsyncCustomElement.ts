import { createElement, type ReactElement } from "react";

import { renderCustomElement } from "@svebcomponents/ssr";

import { CustomElementShell } from "./CustomElementShell.js";

import type { CustomElementProps } from "./CustomElement.js";

export type { CustomElementProps } from "./CustomElement.js";

/**
 * Renders a Svelte-built custom element inside a React Server Component.
 *
 * Unlike {@link CustomElement}, this awaits the element's renderer directly
 * instead of degrading on asynchrony: an async `SsrPrepare` hook, or a
 * component that awaits while rendering, server-renders normally here. That
 * only works because an RSC async function component runs to completion
 * before any markup is emitted — a synchronous SSR pipeline (`renderToString`,
 * or `renderToPipeableStream` without an RSC runtime) cannot await a
 * component at all, which is why this lives at a separate entry point rather
 * than as a mode of the sync `CustomElement`.
 *
 * The awaited result is handed to {@link CustomElementShell}, a Client
 * Component, rather than emitted here. A Server Component's output is
 * serialized into the Flight payload and replayed by the browser, so markup
 * emitted here would be replayed too — including the `<template
 * shadowrootmode>` that the HTML parser has already consumed into a shadow
 * root, which is a hydration mismatch. The shell runs on both sides and emits
 * the template only in the SSR pass.
 *
 * Import this only from a Server Component module. An async function
 * component cannot be rendered from a Client Component (`"use client"`); an
 * app that renders its custom elements from client components has no async
 * path here and keeps using the sync `CustomElement`'s degrade-to-client-only
 * behavior.
 *
 * ```tsx
 * import { CustomElement } from "@svebcomponents/ssr-react/rsc";
 *
 * <CustomElement tag="my-component" title="Hello" count={5} />;
 * ```
 */
export const CustomElement = async ({
  tag,
  children,
  ...props
}: CustomElementProps): Promise<ReactElement> => {
  const rendered = await renderCustomElement(tag, props);

  return createElement(
    CustomElementShell,
    {
      tag,
      props,
      attributes: rendered.attributes,
      shadowContent: rendered.shadowContent,
    },
    children,
  );
};

export default CustomElement;
