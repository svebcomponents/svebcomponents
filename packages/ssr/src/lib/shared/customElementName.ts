/**
 * Pure, dependency-free custom-element name predicates shared between the
 * build-time Vite transform (`../vite/vitePluginSvebcomponentsSsr.ts`) and the
 * SSR runtime (`../runtime/html.ts`).
 *
 * This module intentionally has zero imports so it can be pulled into the
 * Vite plugin without dragging Svelte's runtime (e.g. `svelte/internal/server`)
 * into the plugin's dependency graph.
 */

/**
 * ASCII subset of the HTML spec's PotentialCustomElementName grammar.
 *
 * @see https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name
 */
const potentialCustomElementNameRegex = /^[a-z][.0-9_a-z-]*-[.0-9_a-z-]*$/;

/**
 * Names that match the PotentialCustomElementName grammar (they contain a
 * hyphen) but are explicitly excluded from valid custom element names by the
 * HTML spec, since they are reserved for SVG/MathML.
 *
 * @see https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name
 */
const reservedCustomElementNames = new Set([
  "annotation-xml",
  "color-profile",
  "font-face",
  "font-face-src",
  "font-face-uri",
  "font-face-format",
  "font-face-name",
  "missing-glyph",
]);

/**
 * Cheap pre-check for whether a tag name could possibly be a custom element
 * name. Intended as a fast path before calling `isValidCustomElementTagName`,
 * which does the full (more expensive) validation.
 */
export const mayBeCustomElementTagName = (tagName: string) =>
  tagName.includes("-");

/**
 * Full validation of the HTML spec's PotentialCustomElementName grammar,
 * excluding the spec's reserved SVG/MathML names (e.g. `font-face`,
 * `annotation-xml`) that would otherwise match the "has a dash" grammar.
 *
 * @see https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name
 */
export const isValidCustomElementTagName = (tagName: string) =>
  potentialCustomElementNameRegex.test(tagName) &&
  !reservedCustomElementNames.has(tagName);
