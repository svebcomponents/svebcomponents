import Component from "./Component.svelte";

if (!customElements.get("simple-component") && Component.element) {
  customElements.define("simple-component", Component.element);
}

export default Component;
