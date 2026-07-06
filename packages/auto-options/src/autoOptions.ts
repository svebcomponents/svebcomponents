import { parse } from "svelte/compiler";
import { walk } from "zimmerframe";
import MagicString from "magic-string";
import type {
  InferredSvelteOptionProps,
  TypeDeclaration,
  TypedVariableDeclarator,
} from "./types";
import {
  inferPropsFromComponentPropDeclaration,
  inferPropsFromSvelteOptions,
  inferPropsFromTypes,
} from "./inferProps.js";
import { injectInferredProps } from "./injectInferredProps.js";
import { extractSvelteOptions } from "./extractSvelteOptionsProps.js";

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
      // infrastructure components (like @svebcomponents/ssr's HydrationHost)
      // opt out of processing — transforming them would inject bogus custom
      // element options and, worse, circular imports back into the runtime
      if (code.includes("svebcomponents:auto-options-ignore")) {
        return null;
      }
      const { instance, options } = parse(code, {
        filename: id,
        modern: true,
      });

      // without a script there are no props to expose, and no instance script
      // to inject the hydration import into, so we skip processing altogether
      if (!instance) {
        return null;
      }
      let propsDeclaration: TypedVariableDeclarator | undefined;
      const typeDeclarations: TypeDeclaration[] = [];
      walk(instance.content, null, {
        Program(node) {
          // our AST doesn't have types for TS nodes, so we add them manually
          type TsNode = (typeof node.body)[number] | TypeDeclaration;
          for (const statement of node.body as TsNode[]) {
            switch (statement.type) {
              case "VariableDeclaration":
                for (const declaration of statement.declarations) {
                  // since props are always declared as `const props = $props()` in svelte,
                  // we can skip to the next statement if this declaration is not initialized via a call expression
                  if (
                    !declaration.init ||
                    declaration.init.type !== "CallExpression" ||
                    declaration.init.callee.type !== "Identifier" ||
                    declaration.init.callee.name !== "$props"
                  ) {
                    continue;
                  }
                  propsDeclaration = declaration as TypedVariableDeclarator;
                }
                break;
              case "TSInterfaceDeclaration":
                typeDeclarations.push(statement);
                break;
              case "TSTypeAliasDeclaration":
                typeDeclarations.push(statement);
                break;
            }
          }
        },
      });

      // without props there is nothing to infer — but a hydratable component
      // still needs its `extend` injected
      if (!propsDeclaration && !hydratable) {
        return null;
      }

      // We 'automatically' infer the svelte option props, building up from least valuable to most valuable information
      // WARNING: This object will be mutated to create the assembled options
      const inferredProps: InferredSvelteOptionProps = {};

      // 1. Information provided by the user via '<svelte:options>' is the most valuable,
      // we use what is provided and never overwrite it

      const svelteOptions = extractSvelteOptions(options);

      inferPropsFromSvelteOptions(inferredProps, svelteOptions);

      if (propsDeclaration) {
        // 2. If the user uses TypeScript & we have types available, they are the next valuable information we can infer
        // we want to preferrably use them over what is being destructured
        // since the destructuring might use {...rest} or not destructure at all
        inferPropsFromTypes(inferredProps, propsDeclaration, typeDeclarations);

        // 3. Finally, we use prop declaration javascript destructuring to at least infer the props' names
        inferPropsFromComponentPropDeclaration(inferredProps, propsDeclaration);
      }

      const magicString = new MagicString(code);

      injectInferredProps(inferredProps, svelteOptions, magicString, {
        hydratable: hydratable
          ? // the instance script's content starts right after its opening tag's `>`
            { scriptContentStart: code.indexOf(">", instance.start) + 1 }
          : undefined,
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
