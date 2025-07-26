import Component from "./Component.svelte";

const tagName = "simple-component";
if (!customElements.get(tagName) && Component.element !== undefined) {
  customElements.define(tagName, Component.element);
}
