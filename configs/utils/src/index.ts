import type { Component, ComponentProps } from "svelte";

import { html, unsafeStatic } from "lit/static-html.js";
import { spread } from "@open-wc/lit-helpers";

/**
 * A utility to convert camelCase to kebab-case
 */
const kebabize = (str: string) =>
  str.replace(
    /[A-Z]+(?![a-z])|[A-Z]/g,
    ($, ofs) => (ofs ? "-" : "") + $.toLowerCase(),
  );

/**
 * A utility to render a web component created with svelte.
 * The arguments it takes are derived from the props of the component & converted to kebab-case at runtime to be passed as attributes
 */
export const createRenderFunction =
  <T extends Component<any>>(customElementMetadata: {
    svelteComponent: T;
    customElementTagName: string;
  }) =>
  (args: ComponentProps<T>) => {
    const tag = unsafeStatic(customElementMetadata.customElementTagName);
    const kebabizedArgs: Record<string, any> = {};
    for (const key in args) {
      if (args.hasOwnProperty(key)) {
        const kebabKey = kebabize(key);
        kebabizedArgs[kebabKey] = args[key];
      }
    }
    return html`
      <${tag} ${spread(kebabizedArgs)}></${tag}>
    `;
  };
