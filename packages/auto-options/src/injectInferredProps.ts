import type MagicString from "magic-string";
import type { InferredSvelteOptionProps } from "./types";
import type { AST } from "svelte/compiler";
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
  inferredPropsResult += "},";
  // TODO 1: if custom element options exist, replace the inferred props of them

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
