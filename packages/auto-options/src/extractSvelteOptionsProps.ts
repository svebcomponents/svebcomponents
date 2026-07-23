import type { AST } from "svelte/compiler";
import type { Property } from "estree";

export interface SvelteOptions {
  // an index within the svelte:options element, where can be injected without causing syntax errors
  attributeInjectIndex: number;
  customElementOptions: {
    propertyInjectIndex: number;
    // position right after the last existing property (0 for an empty
    // object) — used to detect an existing trailing comma before appending
    lastPropertyEnd: number;
    // true when the user already provides their own `extend` — we must not inject a second one
    hasExtend: boolean;
    props: {
      propsStart: number;
      propsEnd: number;
      propValues: Record<string, Record<string, unknown>>;
    } | null;
  } | null;
  // Present when `<svelte:options customElement="tag-name" />` (the string
  // shorthand form) was found — a plain string literal tag with no other
  // options. `attributeStart`/`attributeEnd` cover the whole
  // `customElement="tag-name"` attribute (name, `=`, and quotes), so callers
  // can replace it wholesale with the expanded object form.
  stringFormTag?: {
    value: string;
    attributeStart: number;
    attributeEnd: number;
  };
  // true when the bare `customElement` boolean shorthand, or a
  // dynamically-interpolated string tag (e.g. `customElement="{x}"`), was
  // found. Neither carries enough information to safely rewrite, and a
  // `customElement` attribute is already present, so we must not inject a
  // second one (a Svelte compile error) — callers need to bail out of any
  // further svelte:options mutation in this case.
  hasUnsupportedCustomElementForm?: boolean;
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

  if (Array.isArray(customElementValue)) {
    // a plain string literal tag (`customElement="my-tag"`) parses as a
    // single Text node holding the raw tag text. A dynamically-interpolated
    // tag (`customElement="{x}"`) would instead include an `ExpressionTag`
    // node, or more than one node — neither carries a statically-known tag
    // we can safely rewrite, so those bail out below.
    const [textNode, ...rest] = customElementValue;
    if (rest.length === 0 && textNode?.type === "Text") {
      return {
        attributeInjectIndex,
        customElementOptions: null,
        stringFormTag: {
          value: textNode.data,
          attributeStart: customElementSvelteOptions.start,
          attributeEnd: customElementSvelteOptions.end,
        },
      };
    }
    console.warn(
      "[svebcomponents/auto-options] A dynamically-interpolated `customElement` string tag is not supported. Please switch to a plain string literal tag or the object variant of defining custom element options.",
    );
    return {
      attributeInjectIndex,
      customElementOptions: null,
      hasUnsupportedCustomElementForm: true,
    };
  }

  const expression =
    customElementValue !== true ? customElementValue.expression : undefined;
  if (
    !expression ||
    expression.type !== "ObjectExpression" ||
    !("end" in expression && typeof expression["end"] === "number")
  ) {
    console.warn(
      "[svebcomponents/auto-options] The bare `customElement` boolean shorthand is not supported. Please switch to a string literal tag or the object variant of defining custom element options.",
    );
    return {
      attributeInjectIndex,
      customElementOptions: null,
      hasUnsupportedCustomElementForm: true,
    };
  }
  const hasExtend = expression.properties.some(
    (property) =>
      property.type === "Property" &&
      "name" in property.key &&
      property.key.name === "extend",
  );

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
  // the byte position right after the last existing property — anything
  // between here and the closing bracket can only be whitespace or a
  // trailing comma, which injectors must inspect before adding their own
  const lastPropertyEnd = expression.properties.reduce(
    (end, property) =>
      "end" in property && typeof property.end === "number"
        ? Math.max(end, property.end)
        : end,
    // empty object: appended entries need no leading comma
    0,
  );
  if (!propsOptions || propsOptions.value.type !== "ObjectExpression") {
    return {
      attributeInjectIndex,
      customElementOptions: {
        propertyInjectIndex,
        lastPropertyEnd,
        hasExtend,
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
      lastPropertyEnd,
      hasExtend,
      props: {
        propsStart,
        propsEnd,
        propValues,
      },
    },
  };
};
