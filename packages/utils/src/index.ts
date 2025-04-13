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
 * A utility to assert whether an input string conforms to kebab-case formatting
 * Example:
 * kebab-case → true
 * word -> true
 * --css-variable → false
 * camelCase → false
 */
export const isKebabCase = (str: string) => /^([a-z])+(-[a-z]+)*$/.test(str);

/**
 * A utility to convert kebab-case to camelCase
 */
export const camelizeKebabCase = (str: string) =>
  str.replace(/-./g, (x) => x[1]!.toUpperCase());

/**
 * A utility to render a web component created with svelte.
 * The arguments it takes are derived from the props of the component & converted to kebab-case at runtime to be passed as attributes
 */
export const createRenderFunction =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- we extend from the widest possible type
  <T extends Component<any>>(customElementMetadata: {
      svelteComponent: T;
      customElementTagName: string;
    }) =>
    (args: ComponentProps<T>) => {
      const tag = unsafeStatic(customElementMetadata.customElementTagName);
      const kebabizedArgs: Record<string, unknown> = {};
      for (const key in args) {
        if (Object.hasOwn(args, key)) {
          const kebabKey = kebabize(key);
          kebabizedArgs[kebabKey] = args[key];
        }
      }
      return html`
      <${tag} ${spread(kebabizedArgs)}></${tag}>
    `;
    };

export const TODO = (description: string, ...args: unknown[]) => {
  console.log(`TODO: ${description}`, ...args);
};
