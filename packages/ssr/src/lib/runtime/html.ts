// eslint-disable-next-line svelte/no-svelte-internal -- Reuse Svelte's SSR attribute serializer instead of maintaining our own escaping rules.
import { attr } from "svelte/internal/server";

export const SvelteCustomElementPropType = {
  Array: "Array",
  Boolean: "Boolean",
  Number: "Number",
  Object: "Object",
  String: "String",
} as const;

export type SvelteCustomElementPropType =
  (typeof SvelteCustomElementPropType)[keyof typeof SvelteCustomElementPropType];

export interface SvelteCustomElementPropDefinition {
  attribute?: string;
  reflect?: boolean;
  type?: SvelteCustomElementPropType;
}

const invalidAttributeNameCharsRegex = /[\s"'>/=]/;

/**
 * ASCII subset of the HTML spec's PotentialCustomElementName grammar.
 * The wrapper only receives tag names produced from Svelte source, but this
 * keeps the raw SSR opening/closing tags from ever accepting tag-shaped input.
 *
 * @see https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name
 */
export const isValidCustomElementTagName = (tagName: string) =>
  /^[a-z][.0-9_a-z-]*-[.0-9_a-z-]*$/.test(tagName);

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

/**
 * Mirrors Svelte's generated custom-element prop-to-attribute conversion.
 * Svelte stores this metadata on the generated element instance as `$$p_d`.
 */
export const propValueToAttributeValue = (
  value: unknown,
  propDefinition: SvelteCustomElementPropDefinition,
): string | null => {
  if (
    propDefinition.type === SvelteCustomElementPropType.Boolean &&
    typeof value !== "boolean"
  ) {
    value = value != null;
  }

  if (value == null) {
    return null;
  }

  switch (propDefinition.type) {
    case SvelteCustomElementPropType.Array:
    case SvelteCustomElementPropType.Object:
      return JSON.stringify(value);
    case SvelteCustomElementPropType.Boolean:
      return value ? "" : null;
    case SvelteCustomElementPropType.Number:
      return String(value);
    default:
      return String(value);
  }
};
