import { mount, tick, unmount } from "svelte";
import { assert, expect, test } from "vitest";
import resolvedExportPath from "virtual:resolved-conditional-export";

import Host from "./Host.svelte";

const waitForCustomElementRender = async () => {
  await customElements.whenDefined("conditional-host-widget");
  await tick();
  await new Promise((resolve) => setTimeout(resolve, 0));
};

const expectCustomElementState = (
  element: Element,
  count: number,
  enabled: boolean,
) => {
  const shadowRoot = element.shadowRoot;
  expect(shadowRoot).not.toBeNull();
  assert(shadowRoot);

  expect(shadowRoot.querySelector("h1")?.textContent).toBe("Shared Runtime");
  expect(shadowRoot.querySelector("#count")?.textContent).toBe(
    `Count: number-${count}`,
  );
  expect(shadowRoot.querySelector("#enabled")?.textContent).toBe(
    `Enabled: boolean-${enabled}`,
  );
};

test("Svelte-aware conditional export works inside a Svelte host runtime", async () => {
  expect(resolvedExportPath).toMatch(/dist\/client-svelte\/index\.js$/);

  const target = document.createElement("main");
  document.body.replaceChildren(target);

  const host = mount(Host, { target });
  await waitForCustomElementRender();

  const hostCount = target.querySelector("#host-count");
  const customElement = target.querySelector("conditional-host-widget");
  const increment = target.querySelector<HTMLButtonElement>("#increment");
  const toggle = target.querySelector<HTMLButtonElement>("#toggle");

  assert(hostCount);
  assert(customElement);
  assert(increment);
  assert(toggle);

  expect(hostCount.textContent).toBe("Host count: 2");
  expectCustomElementState(customElement, 2, true);

  increment.click();
  toggle.click();
  await waitForCustomElementRender();

  expect(hostCount.textContent).toBe("Host count: 3");
  expectCustomElementState(customElement, 3, false);

  unmount(host);
});
