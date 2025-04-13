import { parse, AST } from "svelte/compiler";
import { walk } from "zimmerframe";
import MagicString from "magic-string";
import type { VariableDeclarator } from "estree";

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
      let { instance, options } = parse(code, {
        filename: id,
        modern: true,
      });

      // if the component doesn't have a script, there are no props we need to add to the custom element,
      // so we can skip processing altogether
      if (!instance) {
        return null;
      }
      // TODO: maybe we don't need this
      const isTypeScript = instance.attributes.find(
        (attr) =>
          Array.isArray(attr.value) &&
          "data" in attr.value[0] &&
          attr.value[0].data === "ts",
      );
      let propsDeclaration: VariableDeclarator | undefined;
      walk(instance.content, null, {
        Program(node, { next }) {
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
                  propsDeclaration = declaration;
                }
                break;
            }
          }
        },
      });

      // if we don't have any props, there's nothing to do
      if (!propsDeclaration) {
        return null;
      }

      // if we have types, we want to preferrably use them over what is being destructured
      // since the destructuring might use {...rest} or not destructure at all
      if ("typeAnnotation" in propsDeclaration.id) {
        // TODO: we have no types for the typescript AST yet, probably should pull in a library to get them
        const propsAnnotation = propsDeclaration.id.typeAnnotation as {
          type: "TSTypeReference";
          typeName: Node;
        };
        if (propsAnnotation.type === "TSTypeReference") {
          // TODO: resolve the type
        }
        console.log(
          "declaration.id.properties",
          propsDeclaration.id.typeAnnotation,
        );
      }

      if ("properties" in propsDeclaration.id) {
        console.log(
          "declaration.id.properties",
          propsDeclaration.id.properties,
        );
      }

      const customElementOptions = options?.attributes.find(
        (attr): attr is AST.Attribute =>
          "name" in attr && attr.name === "customElement",
      );
      console.log("ce options", customElementOptions?.value);

      const magicString = new MagicString(code);

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
