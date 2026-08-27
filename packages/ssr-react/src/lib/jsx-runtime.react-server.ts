/**
 * The JSX runtime for the react-server module graph.
 *
 * Bundlers with an RSC runtime compile Server Components under the
 * `react-server` export condition, which resolves this file in place of
 * `./jsx-runtime.js`. That is the only place the two runtimes can differ
 * usefully: `jsxImportSource` is a single app-wide setting, so it cannot say
 * "async wrapper in Server Components, synchronous one in Client Components"
 * on its own — but the condition can, and it draws the line in exactly the
 * right place, since a Client Component may not render an async component.
 *
 * The practical effect is that a plain dashed tag in a Server Component
 * server-renders even when its element renders asynchronously. Reaching that
 * previously meant importing `@svebcomponents/ssr-react/rsc` and writing
 * `<CustomElement tag="…">` by hand, which is the ergonomics `jsxImportSource`
 * exists to remove.
 *
 * The async wrapper accepts synchronous renderers too, so routing every tag
 * through it costs nothing and removes the sync path's degrade-to-client-only
 * fallback from Server Components entirely.
 */
import {
  Fragment,
  jsx as reactJsx,
  jsxs as reactJsxs,
} from "react/jsx-runtime";
import type { ReactElement } from "react";

import { CustomElement } from "./runtime/AsyncCustomElement.js";
import { interceptJsx } from "./shared/interceptJsx.js";

export { Fragment };
export type { JSX } from "react/jsx-runtime";

export const jsx: typeof reactJsx = (type, props, key) =>
  interceptJsx(reactJsx, CustomElement, type, props, key) as ReactElement;

export const jsxs: typeof reactJsxs = (type, props, key) =>
  interceptJsx(reactJsxs, CustomElement, type, props, key) as ReactElement;
