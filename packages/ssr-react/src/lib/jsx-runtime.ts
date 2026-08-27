/**
 * A drop-in replacement for `react/jsx-runtime` that routes custom element
 * tags through {@link CustomElement}.
 *
 * Point the JSX transform at this package and any dashed tag in the app is
 * server-rendered, with no per-element changes:
 *
 * ```jsonc
 * // tsconfig.json
 * { "compilerOptions": { "jsx": "react-jsx", "jsxImportSource": "@svebcomponents/ssr-react" } }
 * ```
 *
 * Unlike the Svelte and Vue integrations this needs no bundler plugin, so it
 * works anywhere React does — including hosts that are not Vite-based.
 *
 * Under an RSC runtime this is the runtime for the client and SSR module
 * graphs. The react-server graph resolves `./jsx-runtime.react-server.js`
 * instead, through the package's `react-server` export condition, and routes
 * the same tags through the async wrapper.
 */
import {
  Fragment,
  jsx as reactJsx,
  jsxs as reactJsxs,
} from "react/jsx-runtime";
import type { ReactElement } from "react";

import { CustomElement } from "./runtime/CustomElement.js";
import { interceptJsx } from "./shared/interceptJsx.js";

export { Fragment };
export type { JSX } from "react/jsx-runtime";

export const jsx: typeof reactJsx = (type, props, key) =>
  interceptJsx(reactJsx, CustomElement, type, props, key) as ReactElement;

export const jsxs: typeof reactJsxs = (type, props, key) =>
  interceptJsx(reactJsxs, CustomElement, type, props, key) as ReactElement;
