import type MagicString from "magic-string";
import type { InferredSvelteOptionProps } from "./types";
import type { SvelteOptions } from "./extractSvelteOptionsProps";

export const injectInferredProps = (
  inferredProps: InferredSvelteOptionProps,
  svelteOptions: SvelteOptions | null,
  magicString: MagicString,
) => {
  let inferredPropsResult = "props: {\n";
  for (const [propName, inferredProp] of Object.entries(inferredProps)) {
    inferredPropsResult += `${propName}: {attribute: "${inferredProp.attributeName}", reflect: ${inferredProp.isReflected}, type: "${inferredProp.type}"},\n`;
  }
  inferredPropsResult += "}";
  // 1: if custom element prop options are defined on the svelte options, replace only them with the inferred props
  if (svelteOptions?.customElementOptions?.props) {
    const { propsStart, propsEnd } = svelteOptions.customElementOptions.props;
    magicString.overwrite(propsStart, propsEnd, inferredPropsResult);
    return;
  }

  // 1-b: if custom element options are defined on the svelte options, but no prop options, append the prop options
  if (svelteOptions?.customElementOptions) {
    const { propertyInjectIndex } = svelteOptions.customElementOptions;
    magicString.appendLeft(
      propertyInjectIndex,
      // since we append to other entries inside an object, we can't forget the comma
      `,\n${inferredPropsResult}`,
    );
    return;
  }

  // 2: if svelte options exist, but not custom element options, inject them to the svelte options
  inferredPropsResult = ` customElement={{\n${inferredPropsResult}\n}} `;
  if (svelteOptions) {
    magicString.appendLeft(
      svelteOptions.attributeInjectIndex,
      inferredPropsResult,
    );
    return;
  }

  // 3: if no svelte options exist, inject svelte:options
  inferredPropsResult = `<svelte:options${inferredPropsResult}/>\n`;
  magicString.prepend(inferredPropsResult);
};
