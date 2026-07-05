import type { AST } from "svelte/compiler";
import type { Property } from "estree";

export interface SvelteOptions {
  // an index within the svelte:options element, where can be injected without causing syntax errors
  attributeInjectIndex: number;
  customElementOptions: {
    propertyInjectIndex: number;
    props: {
      propsStart: number;
      propsEnd: number;
      propValues: Record<string, Record<string, unknown>>;
    } | null;
  } | null;
  // true when `<svelte:options customElement="tagName"/>` (the string variant) was found.
  // This variant is currently not supported, and since a `customElement` attribute is already
  // present, we must not inject a second one (which would be a Svelte compile error), so callers
  // need to bail out of any further svelte:options mutation in this case.
  hasUnsupportedStringCustomElement?: boolean;
}

export const extractSvelteOptions = (
  svelteOptions: AST.SvelteOptions | null,
): SvelteOptions | null => {
  if (!svelteOptions) return null;

  // "<svelte:options hogefuga />" we want to inject attributes left of the "/>" so the index we want to inject code from is the second character from the back
  const attributeInjectIndex = svelteOptions.end - 2;

  const customElementSvelteOptions = svelteOptions?.attributes.find(
    (attr) => attr.name === "customElement",
  );
  if (!customElementSvelteOptions) {
    return {
      attributeInjectIndex,
      customElementOptions: null,
    };
  }

  // the value of a `customElement` attribute isn't always an `ExpressionTag`:
  // - `customElement` (boolean shorthand) has a value of `true`
  // - `customElement="tagName"` (the quoted string variant) has a value that is an array of `Text`/`ExpressionTag` nodes
  // only the object variant `customElement={{...}}` has an `ExpressionTag` value with an `expression` we can inspect
  const customElementValue = customElementSvelteOptions.value;
  const expression =
    customElementValue !== true && !Array.isArray(customElementValue)
      ? customElementValue.expression
      : undefined;
  if (
    !expression ||
    expression.type !== "ObjectExpression" ||
    !("end" in expression && typeof expression["end"] === "number")
  ) {
    console.warn(
      '[svebcomponents/auto-options] Svelte Options with the format `<svelte:options customElement="tagName"/>` are currently not supported. Please switch to the object variant of defining custom element options.',
    );
    return {
      attributeInjectIndex,
      customElementOptions: null,
      hasUnsupportedStringCustomElement: true,
    };
  }
  // if custom element options exist, but no props
  const propsOptions = expression.properties.find(
    (
      property,
    ): property is Property & {
      start: number;
      end: number;
    } => {
      return (
        property.type === "Property" &&
        "name" in property.key &&
        property.key.name === "props"
      );
    },
  );

  // `{fuga: 'hoge'}` we want to inject properties left of the last closing bracket,
  // so the property inject index is the index of closing bracket
  const propertyInjectIndex = expression.end - 1;
  if (!propsOptions || propsOptions.value.type !== "ObjectExpression") {
    return {
      attributeInjectIndex,
      customElementOptions: {
        propertyInjectIndex,
        props: null,
      },
    };
  }

  const propValues: Record<string, Record<string, unknown>> = {};
  const { start: propsStart, end: propsEnd } = propsOptions;

  for (const property of propsOptions.value.properties) {
    if (
      property.type !== "Property" ||
      property.key.type !== "Identifier" ||
      property.value.type !== "ObjectExpression"
    )
      continue;
    const resolvedProperty: Record<string, unknown> = {};
    for (const propertyOfProperty of property.value.properties) {
      if (
        propertyOfProperty.type !== "Property" ||
        propertyOfProperty.key.type !== "Identifier" ||
        !("value" in propertyOfProperty.value)
      )
        continue;

      resolvedProperty[propertyOfProperty.key.name] =
        propertyOfProperty.value.value;
    }
    propValues[property.key.name] = resolvedProperty;
  }

  return {
    attributeInjectIndex,
    customElementOptions: {
      propertyInjectIndex,
      props: {
        propsStart,
        propsEnd,
        propValues,
      },
    },
  };
};
