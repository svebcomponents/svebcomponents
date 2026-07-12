// Shared between the server renderer and the client hydration wrapper — must
// therefore not import anything svelte-server- or svelte-client-specific.

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

/**
 * Mirrors Svelte's generated custom-element attribute-to-prop conversion
 * (`get_custom_element_value(..., 'toProp')`), including its up-front Boolean
 * presence normalization.
 */
export const attributeValueToPropValue = (
  value: string | null,
  propDefinition: SvelteCustomElementPropDefinition,
): unknown => {
  if (propDefinition.type === SvelteCustomElementPropType.Boolean) {
    return value != null;
  }
  switch (propDefinition.type) {
    case SvelteCustomElementPropType.Array:
    case SvelteCustomElementPropType.Object:
      return value && JSON.parse(value);
    case SvelteCustomElementPropType.Number:
      return value != null ? +value : value;
    default:
      return value;
  }
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
