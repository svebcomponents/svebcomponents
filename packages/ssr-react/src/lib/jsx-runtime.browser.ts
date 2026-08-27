/**
 * The browser build of `./jsx-runtime.js`, selected by the package's `browser`
 * export condition. Identical but for the wrapper it routes tags through —
 * see `./runtime/CustomElement.browser.js` for why that split exists.
 */
import {
  Fragment,
  jsx as reactJsx,
  jsxs as reactJsxs,
} from "react/jsx-runtime";
import type { ReactElement } from "react";

import { CustomElement } from "./runtime/CustomElement.browser.js";
import { interceptJsx } from "./shared/interceptJsx.js";

export { Fragment };
export type { JSX } from "react/jsx-runtime";

export const jsx: typeof reactJsx = (type, props, key) =>
  interceptJsx(reactJsx, CustomElement, type, props, key) as ReactElement;

export const jsxs: typeof reactJsxs = (type, props, key) =>
  interceptJsx(reactJsxs, CustomElement, type, props, key) as ReactElement;
