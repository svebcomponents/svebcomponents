import { parse, type AST } from "svelte/compiler";
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
} from "./inferProps";
import { injectInferredProps } from "./injectInferredProps";

// In svelte web component land, even simple things such as exposing props as attributes have to be
// manually configured using <svelte:options customElement={}/>
// to help with this, @svebcomponents/auto-options provides a rollup plugin that tries to cover at least the basic use cases
// out of the box
export const autoOptions = () => {
  return {
    name: "svebcomponents:auto-options",
    enforce: "pre",

    async transform(code: string, id: string) {
      if (!id.endsWith(".svelte")) {
        return null;
      }
      const { instance, options } = parse(code, {
        filename: id,
        modern: true,
      });

      // if the component doesn't have a script, there are no props we need to add to the custom element,
      // so we can skip processing altogether
      if (!instance) {
        return null;
      }
      let propsDeclaration: TypedVariableDeclarator | undefined;
      const typeDeclarations: TypeDeclaration[] = [];
      walk(instance.content, null, {
        Program(node) {
          for (const statement of node.body) {
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
              // TODO: support inline types
              // TODO: then extend our nodes to have the correct declaration types
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

      // if we don't have any props, there's nothing to do
      if (!propsDeclaration) {
        return null;
      }

      // We 'automatically' infer the svelte option props, building up from least valuable to most valuable information
      // WARNING: This object will be mutated to create the assembled options
      const inferredProps: InferredSvelteOptionProps = {};

      // 1. Information provided by the user via '<svelte:options>' is the most valuable,
      // we use what is provided and never overwrite it

      // TODO: iterate over user provided svelte options (if they exist)
      const customElementOptions = options?.attributes.find(
        (attr): attr is AST.Attribute =>
          "name" in attr && attr.name === "customElement",
      );
      if (customElementOptions) {
        inferPropsFromSvelteOptions(inferredProps, customElementOptions);
      }

      // 2. If the user uses TypeScript & we have types available, they are the next valuable information we can infer
      // we want to preferrably use them over what is being destructured
      // since the destructuring might use {...rest} or not destructure at all
      inferPropsFromTypes(inferredProps, propsDeclaration, typeDeclarations);

      // 3. Finally, we use prop declaration javascript destructuring to at least infer the props' names
      inferPropsFromComponentPropDeclaration(inferredProps, propsDeclaration);

      const magicString = new MagicString(code);

      injectInferredProps(inferredProps, magicString);

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
