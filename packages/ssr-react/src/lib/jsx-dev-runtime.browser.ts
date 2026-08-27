/**
 * The development counterpart to `./jsx-runtime.browser.js`. See its
 * documentation.
 */
import { Fragment, jsxDEV as reactJsxDev } from "react/jsx-dev-runtime";
import type { ReactElement } from "react";

import { CustomElement } from "./runtime/CustomElement.browser.js";
import { interceptJsx } from "./shared/interceptJsx.js";

export { Fragment };
export type { JSX } from "react/jsx-dev-runtime";

export const jsxDEV: typeof reactJsxDev = (
  type,
  props,
  key,
  isStatic,
  source,
  self,
) =>
  interceptJsx(
    (t, p, k) => reactJsxDev(t, p, k, isStatic, source, self),
    CustomElement,
    type,
    props,
    key,
  ) as ReactElement;
