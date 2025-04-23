import type MagicString from "magic-string";
import type { InferredSvelteOptionProps } from "./types";

export const injectInferredProps = (
  inferredProps: InferredSvelteOptionProps,
  magicString: MagicString,
) => {
  let inferredPropsResult = "props: {\n";
  for (const [propName, inferredProp] of Object.entries(inferredProps)) {
    inferredPropsResult += `${propName}: {attribute: "${inferredProp.attributeName}", reflect: ${inferredProp.isReflected}, type: "${inferredProp.type}"},\n`;
  }
  inferredPropsResult += "},";
  // TODO 1: if custom element options exist, replace the inferred props of them

  // TODO 2: if svelte options exist, but not custom element options, inject them to the svelte options
  inferredPropsResult = `customElement={{\n${inferredPropsResult}\n}}`;

  // TODO 3: if no svelte options exist, inject svelte:options
  inferredPropsResult = `<svelte:options ${inferredPropsResult} />\n`;
  magicString.prepend(inferredPropsResult);
};
