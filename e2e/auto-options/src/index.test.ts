import { test, expect, assert } from "vitest";
import "../dist/client/index.js";

test("auto-options component renders correctly in the browser", async () => {
  document.body.innerHTML = `<simple-component title="Browser Test" count="42" enabled></simple-component>`;

  await customElements.whenDefined("simple-component");
  const component = document.querySelector("simple-component");
  expect(component).not.toBeNull();

  await new Promise((resolve) => setTimeout(resolve, 0));
  assert(component);

  const shadowRoot = component.shadowRoot;
  expect(shadowRoot).not.toBeNull();
  assert(shadowRoot);

  const h1 = shadowRoot.querySelector("h1");
  assert(h1);
  expect(h1.textContent).toBe("Browser Test");

  const span = shadowRoot.querySelector("span");
  assert(span);
  expect(span.textContent).toBe("Count: 42");

  const p = shadowRoot.querySelector("p");
  assert(p);
  expect(p.textContent).toBe("Enabled: true");
});

