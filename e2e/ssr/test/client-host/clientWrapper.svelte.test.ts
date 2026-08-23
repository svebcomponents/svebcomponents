import { test, expect, assert } from "vitest";
import { mount, unmount } from "svelte";

import ClientHost from "./ClientHost.svelte";

// The client half of the wrapper: a svelte host renders a custom element and
// the vite plugin rewrites it to Client.svelte. This is the path a page takes
// on a *client-side* render — a SvelteKit client navigation, a component
// mounted after load — where there is no server-rendered markup, so every prop
// has to arrive through the wrapper itself.
//
// Svelte compiles the wrapper's `<svelte:element>` spread to `set_attributes`,
// which lowercases every attribute name for elements in the HTML namespace.
// Left to the spread, `showLabel` reaches the element as `showlabel` and
// `richDetail` as `richdetail="[object Object]"` — neither of which the
// element observes (`show-label` / `rich-detail`), so both props silently keep
// their defaults.

const nextMacrotask = () => new Promise((resolve) => setTimeout(resolve, 0));

interface HostProps {
  title: string;
  count?: number;
  showLabel?: boolean;
  richDetail?: { note: string } | undefined;
}

const mountHost = async (props: HostProps) => {
  const target = document.createElement("div");
  document.body.append(target);
  // reactive so tests can drive prop updates through the wrapper
  const reactiveProps = $state(props);
  const instance = mount(ClientHost, { target, props: reactiveProps });

  await customElements.whenDefined("sync-component");
  // svelte custom elements wait a microtask before initializing
  await nextMacrotask();
  await nextMacrotask();

  const component = target.querySelector("sync-component");
  assert(component, "host must have rendered the custom element");
  const shadowRoot = component.shadowRoot;
  assert(shadowRoot, "custom element must have rendered its shadow root");

  return {
    component,
    shadowRoot,
    props: reactiveProps,
    settle: async () => {
      await nextMacrotask();
      await nextMacrotask();
    },
    cleanup: () => {
      void unmount(instance);
      target.remove();
    },
  };
};

test("delivers camelCase props to a client-rendered custom element", async () => {
  const { component, shadowRoot, cleanup } = await mountHost({
    title: "Client Wrapper",
    showLabel: true,
  });

  // sanity: the all-lowercase prop has always worked
  expect(shadowRoot.querySelector("h1")?.textContent).toBe("Client Wrapper");

  // the camelCase prop reached the component and is rendering
  expect(shadowRoot.querySelector("#label")?.textContent).toBe("Label shown");
  expect((component as unknown as { showLabel: boolean }).showLabel).toBe(true);

  cleanup();
});

test("delivers a rich camelCase prop without stringifying it", async () => {
  const richDetail = { note: "rich prop survived a client render" };
  const { component, shadowRoot, cleanup } = await mountHost({
    title: "Client Wrapper",
    richDetail,
  });

  expect(shadowRoot.querySelector("#detail")?.textContent).toBe(
    richDetail.note,
  );
  // the value itself, not a "[object Object]" round trip through an attribute
  expect(
    (component as unknown as { richDetail: { note: string } }).richDetail,
  ).toEqual(richDetail);

  cleanup();
});

test("does not write lowercased junk attributes for camelCase props", async () => {
  const { component, cleanup } = await mountHost({
    title: "Client Wrapper",
    showLabel: true,
    richDetail: { note: "note" },
  });

  const attributeNames = [...component.attributes].map(({ name }) => name);
  // the names the spread would have produced
  expect(attributeNames).not.toContain("showlabel");
  expect(attributeNames).not.toContain("richdetail");
  // and nothing carries a stringified object
  expect(component.outerHTML).not.toContain("[object Object]");

  cleanup();
});

test("keeps camelCase props reactive after the initial render", async () => {
  const { shadowRoot, props, settle, cleanup } = await mountHost({
    title: "Client Wrapper",
    showLabel: false,
  });
  expect(shadowRoot.querySelector("#label")).toBeNull();

  props.showLabel = true;
  await settle();
  expect(shadowRoot.querySelector("#label")?.textContent).toBe("Label shown");

  props.showLabel = false;
  await settle();
  expect(shadowRoot.querySelector("#label")).toBeNull();

  cleanup();
});

test("still routes lowercase props through attributes", async () => {
  // svelte's class/style handling, event delegation and the element's own
  // attribute reflection all key off real attributes, so nothing that *has* an
  // attribute representation may be diverted to the property path
  const { component, shadowRoot, cleanup } = await mountHost({
    title: "Client Wrapper",
    count: 7,
  });

  expect(component.getAttribute("title")).toBe("Client Wrapper");
  expect(component.getAttribute("count")).toBe("7");
  expect(shadowRoot.querySelector("#count")?.textContent).toBe(
    "Count: number-7",
  );

  cleanup();
});
