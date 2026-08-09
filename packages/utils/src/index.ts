/**
 * A utility to convert camelCase to kebab-case
 */
export const kebabize = (str: string) =>
  str.replace(
    /[A-Z]+(?![a-z])|[A-Z]/g,
    ($, ofs) => (ofs ? "-" : "") + $.toLowerCase(),
  );

/**
 * A utility to assert whether an input string conforms to kebab-case formatting
 * Example:
 * kebab-case → true
 * word -> true
 * col-2 → true
 * heading2 → true
 * --css-variable → false
 * camelCase → false
 */
export const isKebabCase = (str: string) =>
  /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(str);

/**
 * A utility to convert kebab-case to camelCase
 */
export const camelizeKebabCase = (str: string) =>
  str.replace(/-./g, (x) => x[1]!.toUpperCase());

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
