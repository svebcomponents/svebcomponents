import MagicString from "magic-string";
import { injectInferredProps } from "./injectInferredProps.js";
import { analyzeComponent } from "./analyze.js";

export interface AutoOptionsPluginOptions {
  /**
   * When true, injects `extend: hydratable` (imported from
   * `@svebcomponents/ssr/hydration`) into the generated custom element
   * options, so a server-rendered declarative shadow root is hydrated
   * instead of being wiped and re-rendered. Skipped for components that
   * already declare their own `extend`.
   */
  hydratable?: boolean;
}

// In svelte web component land, even simple things such as exposing props as attributes have to be
// manually configured using <svelte:options customElement={}/>
// to help with this, @svebcomponents/auto-options provides a rollup plugin that tries to cover at least the basic use cases
// out of the box
export const autoOptions = ({
  hydratable = false,
}: AutoOptionsPluginOptions = {}) => {
  return {
    name: "svebcomponents:auto-options",
    enforce: "pre",

    async transform(code: string, id: string) {
      if (!id.endsWith(".svelte")) {
        return null;
      }

      const analysis = analyzeComponent(code, id);
      if (!analysis) {
        return null;
      }
      const { props, svelteOptions, scriptContentStart, hasPropsDeclaration } =
        analysis;

      // without a script there are no props to expose, and no instance script
      // to inject the hydration import into, so we skip processing altogether
      if (scriptContentStart === null) {
        return null;
      }

      // without props there is nothing to infer — but a hydratable component
      // still needs its `extend` injected
      if (!hasPropsDeclaration && !hydratable) {
        return null;
      }

      const magicString = new MagicString(code);

      injectInferredProps(props, svelteOptions, magicString, {
        hydratable: hydratable ? { scriptContentStart } : undefined,
      });

      if (!magicString.hasChanged()) {
        return null;
      }

      return {
        code: magicString.toString(),
        map: magicString.generateMap({
          source: id,
          file: id,
          includeContent: true,
        }),
      };
    },
  };
};

export default autoOptions;
