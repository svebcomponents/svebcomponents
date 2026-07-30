import {
  mayBeCustomElementTagName,
  isValidCustomElementTagName,
} from "@svebcomponents/utils";

import { CustomElement } from "../runtime/CustomElement.js";

/**
 * The shape `react/jsx-runtime`'s factories share, loosened at the boundary:
 * the runtimes' own types describe `type` as an `ElementType`, which a
 * pass-through wrapper cannot satisfy while also accepting arbitrary input.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural bridge to react's jsx factories
type JsxFactory = (type: any, props: any, key?: any) => unknown;

/**
 * Routes a JSX call for a custom element tag through {@link CustomElement},
 * and passes everything else straight to React's own factory.
 *
 * Only string types are considered — a component reference is never a custom
 * element — and the tag must satisfy the HTML spec's custom element name
 * grammar, so reserved SVG/MathML names like `font-face` are left alone.
 */
export const interceptJsx = (
  factory: JsxFactory,
  type: unknown,
  props: unknown,
  key?: unknown,
): unknown => {
  if (
    typeof type !== "string" ||
    !mayBeCustomElementTagName(type) ||
    !isValidCustomElementTagName(type)
  ) {
    return factory(type, props, key);
  }

  return factory(
    CustomElement,
    { ...(props as Record<string, unknown>), tag: type },
    key,
  );
};
