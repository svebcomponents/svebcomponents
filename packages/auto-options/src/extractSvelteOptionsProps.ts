import type { AST } from "svelte/compiler";
import type { InferredSvelteOptionProps } from "./types";
import type { Property } from "estree";

export interface SvelteOptions {
  // an index within the svelte:options element, where can be injected without causing syntax errors
  attributeInjectIndex: number;
  customElementOptions: {
    props: {
      propsStart: number;
      propsEnd: number;
      propValues: InferredSvelteOptionProps;
    } | null;
  } | null;
}

export const extractSvelteCustomElementOptions = (
  svelteOptions: AST.SvelteOptions | null,
): SvelteOptions | null => {
  if (!svelteOptions) return null;

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
  if (expression.type !== "ObjectExpression") {
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

  if (!propsOptions || propsOptions.value.type !== "ObjectExpression") {
    return {
      attributeInjectIndex: attributeInjectIndex,
      customElementOptions: {
        props: null,
      },
    };
  }

  const propValues: InferredSvelteOptionProps = {};
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
        propertyOfProperty.key.type !== "Identifier"
      )
        continue;

      resolvedProperty[propertyOfProperty.key.name] = propertyOfProperty.value;
      console.log("propofprop", propertyOfProperty.value);
    }
    propValues[property.key.name] = resolvedProperty;
  }

  console.log("resolved props options", propValues);

  return {
    attributeInjectIndex: attributeInjectIndex,
    customElementOptions: {
      props: {
        propsStart,
        propsEnd,
        propValues,
      },
    },
  };
};
