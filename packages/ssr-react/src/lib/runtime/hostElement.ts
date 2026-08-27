import { createElement, type ReactElement, type ReactNode } from "react";

/**
 * Renders the bare custom element tag, with no shadow content.
 *
 * This is what the browser must render in every wrapper: by the time React
 * runs there, the HTML parser has adopted the server's
 * `<template shadowrootmode>` into the element's shadow root and removed it
 * from the light DOM, so the client tree has to omit it or hydration
 * mismatches. The element upgrades and hydrates its own shadow root.
 *
 * Shared rather than repeated so the browser-only build of `CustomElement`
 * and the `BROWSER` branch of the universal one cannot drift apart.
 */
export const renderHostElement = (
  tag: string,
  props: Record<string, unknown>,
  children: ReactNode,
): ReactElement => createElement(tag, props, children);
