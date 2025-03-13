import { customElements } from "@lit-labs/ssr-dom-shim";

import { ElementRendererRegistry } from "./rendererRegistry.js";

// TODO: write a ElementRendererRegistry that can be used inside svelte kit to register a custom element renderer
// then, implement a component that first sets all attributes and properties and then renders the custom element
// like this:
// }
export function* renderCustomElement(
  tagName: string,
  attributes: Record<string, any>,
  props: Record<string, any>,
  // TODO: think about how to pass in the children...ideally, we would take the second to last yield from render & then render the children from the parent
  children: string,
) {
  const elementClass = customElements.get(tagName);
  const Renderer = ElementRendererRegistry.get(elementClass);
  if (!Renderer) {
    throw new Error(`No renderer found for ${tagName}`);
  }
  const instance = new Renderer();
  for (const [key, value] of Object.entries(attributes)) {
    instance.setAttribute(key, value);
  }
  for (const [key, value] of Object.entries(props)) {
    instance.setProperty(key, value);
  }
  yield `<${tagName} `;
  yield* instance.renderAttributes();
  const shadowContents = instance.renderShadow();
  if (shadowContents !== undefined) {
    yield '<template shadowroot="open">';
    yield* shadowContents;
    yield "</template>";
  }
  yield `</${tagName}>`;
}
