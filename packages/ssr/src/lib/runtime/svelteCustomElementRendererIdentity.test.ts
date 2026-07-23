import type { Component } from "svelte";
import { expect, test, vi } from "vitest";
import type { SvelteClientCustomElement } from "./svelteCustomElementRenderer.js";

const createClientElementCtor = () =>
  class {
    attributes = {};
    attributeChangedCallback() {}
    $$d = {};
    $$p_d = {};
    $$c = {} as Component;
  } as unknown as { new (): SvelteClientCustomElement };

test("recognizes a renderer created by a separate module instance", async () => {
  const first = await import("./svelteCustomElementRenderer.js");

  vi.resetModules();

  const second = await import("./svelteCustomElementRenderer.js");
  const renderer = new second.SvelteCustomElementRenderer(
    {} as Component,
    createClientElementCtor(),
    "test-element",
  );

  expect(second.SvelteCustomElementRenderer).not.toBe(
    first.SvelteCustomElementRenderer,
  );
  expect(renderer).not.toBeInstanceOf(first.SvelteCustomElementRenderer);
  expect(first.isSvelteCustomElementRenderer(renderer)).toBe(true);
});

test("rejects an unbranded renderer-like object", async () => {
  const { isSvelteCustomElementRenderer } = await import(
    "./svelteCustomElementRenderer.js"
  );

  expect(isSvelteCustomElementRenderer({ tagName: "test-element" })).toBe(
    false,
  );
});
