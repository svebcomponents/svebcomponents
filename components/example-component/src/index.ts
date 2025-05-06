import ExampleComponent from "./ExampleComponent.svelte";

export default ExampleComponent;

if (
  !customElements.get("example-component") &&
  // we want to only register our custom element, if the compiler actually emitted a constructor for one
  // (check necessary for SSR-ing svelte-built web components)
  "element" in ExampleComponent
) {
  customElements.define(
    "example-component",
    ExampleComponent.element as CustomElementConstructor,
  );
}
