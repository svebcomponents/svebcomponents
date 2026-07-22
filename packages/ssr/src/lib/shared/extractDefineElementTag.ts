import { isValidCustomElementTagName } from "./customElementName.js";

/**
 * Matches the documented `defineElement("tag-name", Component)` call every
 * component entry point is expected to make (see `@svebcomponents/utils`'s
 * `defineElement`) and captures its first argument when it's a plain string
 * literal.
 */
const DEFINE_ELEMENT_CALL = /\bdefineElement\(\s*(["'])((?:(?!\1).)+)\1/;

/**
 * Best-effort extraction of a component's custom element tag name from its
 * entry file's source, so the generated SSR renderer can self-register with
 * `ElementRendererRegistry` at build time instead of requiring the consuming
 * app to call `ElementRendererRegistry.set()` by hand.
 *
 * Returns `undefined` when the call isn't found, or its argument isn't a
 * plain string literal (e.g. a dynamically computed tag) — callers should
 * fail open to the existing manual registration path in that case, not
 * error the build.
 */
export const extractDefineElementTag = (
  entrySource: string,
): string | undefined => {
  const tag = DEFINE_ELEMENT_CALL.exec(entrySource)?.[2];
  return tag && isValidCustomElementTagName(tag) ? tag : undefined;
};
