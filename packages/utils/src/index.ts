/**
 * A utility to convert camelCase to kebab-case
 */
export const kebabize = (str: string) =>
  str.replace(
    /[A-Z]+(?![a-z])|[A-Z]/g,
    ($, ofs) => (ofs ? "-" : "") + $.toLowerCase(),
  );

/**
 * A utility to assert whether an input string conforms to kebab-case formatting
 * Example:
 * kebab-case → true
 * word -> true
 * col-2 → true
 * heading2 → true
 * --css-variable → false
 * camelCase → false
 */
export const isKebabCase = (str: string) =>
  /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(str);

/**
 * A utility to convert kebab-case to camelCase
 */
export const camelizeKebabCase = (str: string) =>
  str.replace(/-./g, (x) => x[1]!.toUpperCase());

/**
 * Registers a svelte-compiled custom element, safely.
 *
 * Component entry points call this instead of `customElements.define`
 * directly, because a bare define is wrong in three environments:
 * - during SSR, the component may be compiled without `customElement`, so
 *   there is no constructor to register (`Component.element` is undefined)
 * - a runtime without a `customElements` registry (SSR without the DOM shim
 *   installed yet) would throw on touching the global
 * - if the tag is already registered — svelte auto-defines when
 *   `<svelte:options customElement={{ tag }}>` declares a tag, and a page
 *   can load two bundles containing the same component — a second define
 *   throws; first registration wins instead
 *
 * ```ts
 * import { defineElement } from "@svebcomponents/utils";
 * import MyComponent from "./MyComponent.svelte";
 *
 * export default MyComponent;
 * defineElement("my-component", MyComponent);
 * ```
 */
export const defineElement = (tagName: string, component: unknown): void => {
  if (typeof customElements === "undefined") return;
  const ctor = (
    component as { element?: CustomElementConstructor | undefined } | null
  )?.element;
  if (!ctor || customElements.get(tagName)) return;
  customElements.define(tagName, ctor);
};
