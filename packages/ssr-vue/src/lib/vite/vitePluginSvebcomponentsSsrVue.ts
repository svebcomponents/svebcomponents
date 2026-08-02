import MagicString from "magic-string";
import { parse as parseTemplate, NodeTypes } from "@vue/compiler-dom";
import type {
  RootNode,
  TemplateChildNode,
  ElementNode,
} from "@vue/compiler-dom";
import { parse as parseSfc } from "vue/compiler-sfc";
import type { Plugin } from "vite";

import {
  mayBeCustomElementTagName,
  isValidCustomElementTagName,
} from "@svebcomponents/utils";

import {
  WRAPPER_COMPONENT_NAME,
  TAG_NAME_PROP,
} from "../shared/wrapperName.js";

interface VitePluginSvebcomponentsSsrVueOptions {
  /**
   * Restricts the rewrite to these tag names. By default every valid custom
   * element tag name in an SFC template is routed through the wrapper. Pass an
   * explicit list to leave other custom elements (a third-party web component
   * with no `ElementRenderer`, say) rendering as plain tags.
   */
  tags?: string[];
}

/**
 * Rewrites custom element tags in an SFC's `<template>` block so they render
 * through the wrapper component.
 *
 * This deliberately rewrites *source* rather than using Vue's
 * `nodeTransforms` compiler hook. A node transform cannot do the job: user
 * transforms run after the built-in ones on enter, and `@vue/compiler-ssr`
 * resolves a component's identity during `ssrTransformComponent`'s enter
 * phase — so a transform that renames the tag is honored by the client
 * compile and silently ignored by the SSR compile. Rewriting before
 * `@vitejs/plugin-vue` sees the file means both compiles observe the same
 * template.
 *
 * ```ts
 * import vue from "@vitejs/plugin-vue";
 * import svebcomponentsVue from "@svebcomponents/ssr-vue/vite";
 *
 * export default defineConfig({
 *   plugins: [svebcomponentsVue(), vue()],
 * });
 * ```
 */
const vitePluginSvebcomponentsSsrVue = (
  options: VitePluginSvebcomponentsSsrVueOptions = {},
): Plugin => {
  const allowedTags = options.tags ? new Set(options.tags) : undefined;

  const shouldRewrite = (tag: string) =>
    mayBeCustomElementTagName(tag) &&
    isValidCustomElementTagName(tag) &&
    (!allowedTags || allowedTags.has(tag));

  return {
    name: "vite-plugin-svebcomponents-ssr-vue",
    // must run before @vitejs/plugin-vue compiles the SFC
    enforce: "pre",

    transform(code, id) {
      // Only the top-level SFC request carries the source both the client and
      // SSR compiles start from. @vitejs/plugin-vue re-requests individual
      // blocks as `App.vue?vue&type=template&...`; rewriting those as well
      // would apply the transform twice.
      const [filename, query] = id.split("?");
      if (!filename?.endsWith(".vue")) return null;
      if (query !== undefined && /(^|&)vue(&|=|$)/.test(query)) return null;

      const { descriptor, errors } = parseSfc(code, { filename });
      if (errors.length > 0 || !descriptor.template) return null;

      const template = descriptor.template;
      const templateOffset = template.loc.start.offset;
      const ast = parseTemplate(template.content, { parseMode: "base" });

      const magicString = new MagicString(code);
      let changed = false;

      const visit = (node: RootNode | TemplateChildNode) => {
        if (node.type === NodeTypes.ELEMENT && shouldRewrite(node.tag)) {
          rewriteElement(node, magicString, templateOffset);
          changed = true;
        }
        if ("children" in node) {
          for (const child of node.children) {
            if (typeof child === "object") {
              visit(child as TemplateChildNode);
            }
          }
        }
      };
      visit(ast);

      if (!changed) return null;

      return {
        code: magicString.toString(),
        map: magicString.generateMap({ source: id, includeContent: true }),
      };
    },
  };
};

/**
 * Replaces an element's opening (and, when present, closing) tag name with the
 * wrapper component's, and passes the original tag name along as a prop.
 *
 * Offsets from the template AST are relative to the `<template>` block's
 * content, so every one is shifted by the block's offset in the SFC source.
 */
const rewriteElement = (
  node: ElementNode,
  magicString: MagicString,
  templateOffset: number,
) => {
  const tag = node.tag;
  const start = templateOffset + node.loc.start.offset;
  const end = templateOffset + node.loc.end.offset;

  // opening tag: `<` + name
  const openingNameStart = start + 1;
  magicString.overwrite(
    openingNameStart,
    openingNameStart + tag.length,
    WRAPPER_COMPONENT_NAME,
    { storeName: true },
  );
  magicString.appendLeft(
    openingNameStart + tag.length,
    ` ${TAG_NAME_PROP}="${tag}"`,
  );

  // closing tag: `</` + name + `>` at the very end of the node's range.
  // Self-closing elements (`<my-el />`) have none.
  if (!node.isSelfClosing) {
    const closingNameStart = end - 1 - tag.length;
    magicString.overwrite(
      closingNameStart,
      closingNameStart + tag.length,
      WRAPPER_COMPONENT_NAME,
      { storeName: true },
    );
  }
};

export default vitePluginSvebcomponentsSsrVue;
export { vitePluginSvebcomponentsSsrVue };
