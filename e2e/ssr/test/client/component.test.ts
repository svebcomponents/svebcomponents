import { test, expect, assert } from "vitest";
import "../dist/client/index.js";

interface Props {
  title: string;
  count?: number;
  enabled?: boolean;
}

// Strongly coupled to the component implementation @Component.svelte
const checkRenderResult = async (component: Element, props: Props) => {
  // Svelte built web components wait a microtask before rendering
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert(component);

  const shadowRoot = component.shadowRoot;
  expect(shadowRoot).not.toBeNull();
  assert(shadowRoot);

  const h1 = shadowRoot.querySelector("h1");
  assert(h1);
  expect(h1.textContent).toBe(props.title);

  const count = shadowRoot.querySelector("#count");
  assert(count);
  expect(count.textContent).toBe(`Count: number-${props.count ?? 0}`);

  const enabled = shadowRoot.querySelector("#enabled");
  assert(enabled);
  expect(enabled.textContent).toBe(`Enabled: boolean-${props.enabled}`);
};

test("web component renders correctly in the browser", async () => {
  const props = {
    title: "Browser Test",
    count: 42,
    enabled: true,
  };
  document.body.innerHTML = `<simple-component title="${props.title}" count="${props.count}" ${props.enabled ? "enabled" : ""}></simple-component>`;

  await customElements.whenDefined("simple-component");
  const component = document.querySelector("simple-component");
  assert(component);

  await checkRenderResult(component, props);
});

test("web component updates on attribute change", async () => {
  const props = {
    title: "Browser Test",
    count: 42,
    enabled: true,
  };
  document.body.innerHTML = `<simple-component title="${props.title}" count="${props.count}" ${props.enabled ? "enabled" : ""}></simple-component>`;

  await customElements.whenDefined("simple-component");
  const component = document.querySelector("simple-component");
  assert(component);

  await checkRenderResult(component, props);

  // Update the component's attributes
  const updatedProps = {
    title: "Updated Title",
    count: 100,
    enabled: false,
  };
  component.setAttribute("title", updatedProps.title);
  component.setAttribute("count", updatedProps.count.toString());
  component.removeAttribute("enabled");
  await checkRenderResult(component, updatedProps);
});
