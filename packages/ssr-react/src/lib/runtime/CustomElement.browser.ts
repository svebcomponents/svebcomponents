"use client";

import type { ReactElement } from "react";

import { renderHostElement } from "./hostElement.js";

import type { CustomElementProps } from "./CustomElement.js";

export type { CustomElementProps } from "./CustomElement.js";

/**
 * The browser build of {@link CustomElement}, selected by the package's
 * `browser` export condition.
 *
 * The universal build has to import the element renderer to server-render at
 * all, and that import cannot be tree-shaken away: `@svebcomponents/ssr`
 * installs its DOM shim as an import side effect, so a bundler must keep the
 * module even when nothing in the browser branch uses it. It pulls in
 * `@lit-labs/ssr` and parse5 — well over 200 kB of markup machinery that can
 * never run in a browser.
 *
 * Splitting the file is what removes it. There is nothing left to decide here:
 * on the client the wrapper only ever renders the host tag.
 */
export const CustomElement = ({
  tag,
  children,
  ...props
}: CustomElementProps): ReactElement => renderHostElement(tag, props, children);

export default CustomElement;
