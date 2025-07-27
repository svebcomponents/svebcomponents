import { test, expect } from "vitest";
import "../dist/client/index.js";

test("svelte-options component renders correctly in the browser", async () => {
    document.body.innerHTML = `<svelte-component custom-title="Browser Test"></svelte-component>`;

    await customElements.whenDefined("svelte-component");
    const component = document.querySelector("svelte-component");
    expect(component).not.toBeNull();

    await new Promise(resolve => setTimeout(resolve, 0));

    const shadowRoot = component.shadowRoot;
    expect(shadowRoot).not.toBeNull();

    const div = shadowRoot.querySelector("div");
    expect(div).not.toBeNull();
    expect(div.textContent).toBe("Browser Test");
});