import { BROWSER } from "esm-env";
import { defineComponent, h, type VNode } from "vue";

// Importing the package root installs the server DOM shim before any custom
// element module is evaluated, exactly as the Svelte wrappers rely on.
import { renderCustomElement } from "@svebcomponents/ssr";

import { TAG_NAME_PROP } from "../shared/wrapperName.js";

/**
 * Renders a Svelte-built custom element inside a Vue app.
 *
 * On the server it drives the element's registered `ElementRenderer` and
 * emits declarative shadow DOM. In the browser it renders the bare custom
 * element tag and lets the element upgrade and hydrate itself from the
 * server-rendered shadow root.
 *
 * Unlike the Svelte integration this needs no sync/async split: Vue's
 * `renderToString` fully awaits `async setup()`, and its SSR output is
 * emitted in order, so an asynchronous element renderer (an async
 * `SsrPrepare` hook, or a component that awaits while rendering) works
 * through the same component a synchronous one does.
 */
export const CustomElementWrapper = defineComponent({
  name: "CustomElementWrapper",
  // the custom element receives the host's attributes itself, so Vue must not
  // also apply them to the wrapper's root
  inheritAttrs: false,
  props: {
    [TAG_NAME_PROP]: { type: String, required: true },
  },
  // Deliberately not an `async setup()`: that would return a promise on the
  // client too, where Vue requires a <Suspense> boundary for async setup and
  // warns (then renders nothing) without one. Returning the promise only on
  // the server keeps the browser path synchronous, while Vue's
  // `renderToString` still awaits the server path.
  setup(props, { attrs, slots }) {
    const tag = props[TAG_NAME_PROP];

    // Both branches must build the element's children the *same* way, or
    // Vue's hydration walks a different node list than the server produced.
    // In particular the slot content is spread rather than nested: a nested
    // array becomes a Fragment, and Vue SSR brackets a Fragment in `<!--[-->`
    // / `<!--]-->` anchors that the other side would not expect.
    const lightDomChildren = () => slots["default"]?.() ?? [];

    if (BROWSER) {
      // The parser has already adopted the server-rendered
      // `<template shadowrootmode>` into the element's shadow root and
      // removed it from the light DOM, so the client tree deliberately omits
      // it: what Vue hydrates against is the post-parse child list.
      return () => h(tag, attrs, [...lightDomChildren()]);
    }

    return renderCustomElement(tag, attrs).then(
      (rendered) => () =>
        h(tag, rendered.attributes, [
          // must be the element's first child for the parser to adopt it —
          // and it leaves no node behind once the parser has, which is why
          // the browser branch above omits it entirely
          h("template", {
            shadowrootmode: "open",
            // shadow content is escaped by the element renderer
            innerHTML: rendered.shadowContent,
          }),
          ...lightDomChildren(),
        ]) as VNode,
    );
  },
});

export default CustomElementWrapper;
