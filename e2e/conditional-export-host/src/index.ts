import Component from "./Component.svelte";

if (!customElements.get("conditional-host-widget") && Component.element) {
  customElements.define("conditional-host-widget", Component.element);
}

export default Component;
