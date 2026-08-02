import { expect, test, describe } from "vitest";
import type { Plugin, TransformResult } from "vite";

import vitePluginSvebcomponentsSsrVue from "./vitePluginSvebcomponentsSsrVue.js";
import { WRAPPER_COMPONENT_NAME } from "../shared/wrapperName.js";

const transform = async (
  code: string,
  plugin: Plugin = vitePluginSvebcomponentsSsrVue(),
  id = "/src/App.vue",
): Promise<string | null> => {
  const handler = plugin.transform;
  if (typeof handler !== "function") throw new Error("expected a transform");
  const result = (await handler.call(
    {} as never,
    code,
    id,
  )) as TransformResult | null;
  if (result === null) return null;
  return typeof result === "string" ? result : (result.code ?? null);
};

describe("vitePluginSvebcomponentsSsrVue", () => {
  test("rewrites a custom element to the wrapper component", async () => {
    const out = await transform(
      `<template><div><my-el count="5"></my-el></div></template>`,
    );

    expect(out).toBe(
      `<template><div><${WRAPPER_COMPONENT_NAME} _tagName="my-el" count="5"></${WRAPPER_COMPONENT_NAME}></div></template>`,
    );
  });

  test("rewrites a self-closing custom element", async () => {
    const out = await transform(`<template><my-el count="5" /></template>`);

    expect(out).toBe(
      `<template><${WRAPPER_COMPONENT_NAME} _tagName="my-el" count="5" /></template>`,
    );
  });

  test("preserves children and bound props", async () => {
    const out = await transform(
      `<template><my-el :title="t"><span>hi</span></my-el></template>`,
    );

    expect(out).toContain(`_tagName="my-el"`);
    expect(out).toContain(`:title="t"`);
    expect(out).toContain(`<span>hi</span>`);
  });

  test("rewrites nested custom elements", async () => {
    const out = await transform(
      `<template><outer-el><inner-el /></outer-el></template>`,
    );

    expect(out).toContain(`_tagName="outer-el"`);
    expect(out).toContain(`_tagName="inner-el"`);
  });

  test("rewrites sibling custom elements sharing a tag name", async () => {
    // two same-tag siblings are the case a naive closing-tag search gets
    // wrong, by matching the first sibling's closing tag for both
    const out = await transform(
      `<template><my-el>a</my-el><my-el>b</my-el></template>`,
    );

    expect(out).not.toContain("</my-el>");
    expect(out).toContain(">a</");
    expect(out).toContain(">b</");
  });

  test("leaves templates without custom elements untouched", async () => {
    const out = await transform(
      `<template><div><span>hi</span></div></template>`,
    );

    expect(out).toBeNull();
  });

  test("leaves reserved svg/mathml names untouched", async () => {
    const out = await transform(
      `<template><svg><font-face /></svg></template>`,
    );

    expect(out).toBeNull();
  });

  test("does not touch the script block", async () => {
    const out = await transform(
      `<script setup>const x = "<my-el></my-el>";</script>\n<template><my-el /></template>`,
    );

    expect(out).toContain(`const x = "<my-el></my-el>";`);
    expect(out).toContain(`_tagName="my-el"`);
  });

  test("honors an explicit tag allowlist", async () => {
    const out = await transform(
      `<template><known-el /><other-el /></template>`,
      vitePluginSvebcomponentsSsrVue({ tags: ["known-el"] }),
    );

    expect(out).toContain(`_tagName="known-el"`);
    expect(out).toContain("<other-el />");
    expect(out).not.toContain(`_tagName="other-el"`);
  });

  test("ignores non-vue files", async () => {
    const out = await transform(
      `<template><my-el /></template>`,
      vitePluginSvebcomponentsSsrVue(),
      "/src/App.svelte",
    );

    expect(out).toBeNull();
  });

  test("ignores vue sub-requests, which carry only one block", async () => {
    // @vitejs/plugin-vue re-requests individual blocks with a query suffix;
    // rewriting those too would double-apply the transform
    const out = await transform(
      `<template><my-el /></template>`,
      vitePluginSvebcomponentsSsrVue(),
      "/src/App.vue?vue&type=template&lang.js",
    );

    expect(out).toBeNull();
  });
});
