import { test, expect } from "vitest";
import "../dist/client/index.js";

test("ssr-enabled component renders correctly in the browser", async () => {
    document.body.innerHTML = `<simple-component title="Browser Test" count="42" enabled></simple-component>`;

    await customElements.whenDefined("simple-component");
    const component = document.querySelector("simple-component");
    expect(component).not.toBeNull();

    await new Promise(resolve => setTimeout(resolve, 0));

    const shadowRoot = component.shadowRoot;
    expect(shadowRoot).not.toBeNull();

    const h1 = shadowRoot.querySelector("h1");
    expect(h1).not.toBeNull();
    expect(h1.textContent).toBe("Browser Test");

    const span = shadowRoot.querySelector("span");
    expect(span).not.toBeNull();
    expect(span.textContent).toBe("Count: 42");

    const p = shadowRoot.querySelector("p");
    expect(p).not.toBeNull();
    expect(p.textContent).toBe("Enabled: true");
});