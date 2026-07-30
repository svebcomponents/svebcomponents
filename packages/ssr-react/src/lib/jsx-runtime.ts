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
 */
import {
  Fragment,
  jsx as reactJsx,
  jsxs as reactJsxs,
} from "react/jsx-runtime";
import type { ReactElement } from "react";

import { interceptJsx } from "./shared/interceptJsx.js";

export { Fragment };
export type { JSX } from "react/jsx-runtime";

export const jsx: typeof reactJsx = (type, props, key) =>
  interceptJsx(reactJsx, type, props, key) as ReactElement;

export const jsxs: typeof reactJsxs = (type, props, key) =>
  interceptJsx(reactJsxs, type, props, key) as ReactElement;
