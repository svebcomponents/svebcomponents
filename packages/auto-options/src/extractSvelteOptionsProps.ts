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
}

export const extractSvelteOptions = (
  svelteOptions: AST.SvelteOptions | null,
): SvelteOptions | null => {
  if (!svelteOptions) return null;

  // "<svelte:options hogefuga />" we want to inject attributes left of the "/>" so the index we want to inject code from is the second character from the back
  const attributeInjectIndex = svelteOptions.end - 2;

  const customElementSvelteOptions = svelteOptions?.attributes.find(
    (attr): attr is AST.Attribute & { value: AST.ExpressionTag } =>
      attr.name === "customElement",
  );
  if (!customElementSvelteOptions) {
    return {
      attributeInjectIndex,
      customElementOptions: null,
    };
  }

  const {
    value: { expression },
  } = customElementSvelteOptions;
  if (
    expression.type !== "ObjectExpression" ||
    !("end" in expression && typeof expression["end"] === "number")
  ) {
    console.log(
      'Svelte Options with the format `<svelte:options customElement="tagName"/>` are currently not supported. Please switch to the object variant of defining custom element options.',
    );
    return {
      attributeInjectIndex,
      customElementOptions: null,
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
