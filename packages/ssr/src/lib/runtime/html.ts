// eslint-disable-next-line svelte/no-svelte-internal -- Reuse Svelte's SSR attribute serializer instead of maintaining our own escaping rules.
import { attr } from "svelte/internal/server";

export { isValidCustomElementTagName } from "../shared/customElementName.js";
export {
  SvelteCustomElementPropType,
  attributeValueToPropValue,
  propValueToAttributeValue,
  type SvelteCustomElementPropDefinition,
} from "../shared/propConversion.js";

const invalidAttributeNameCharsRegex = /[\s"'>/=]/;

/**
 * Reject characters that cannot appear in HTML attribute names.
 *
 * We still delegate value escaping/formatting to Svelte's `attr` helper, but
 * Svelte assumes compiler-produced attribute names. Since this renderer can
 * receive names from runtime custom-element inputs, we validate names before
 * passing them to Svelte's serializer.
 *
 * @see https://html.spec.whatwg.org/multipage/syntax.html#attributes-2
 */
const isValidAttributeName = (name: string) =>
  name.length > 0 &&
  !invalidAttributeNameCharsRegex.test(name) &&
  !Array.from(name).some((char) => {
    const charCode = char.charCodeAt(0);
    return charCode <= 0x1f || charCode === 0x7f;
  });

/**
 * Serialize one SSR host attribute using Svelte's own attribute helper for
 * value escaping and boolean attribute formatting.
 */
export const renderSsrAttribute = (name: string, value: string) => {
  if (!isValidAttributeName(name)) {
    throw new Error(`Invalid SSR attribute name: ${name}`);
  }

  // Svelte's attr helper signature is attr(name, value, is_boolean). Passing
  // `true` with `is_boolean=true` emits a bare boolean attribute, e.g. ` enabled`.
  return value === "" ? attr(name, true, true) : attr(name, value);
};
