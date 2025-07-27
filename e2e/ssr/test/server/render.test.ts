import { ElementRendererRegistry } from "@svebcomponents/ssr";
import { render } from "svelte/server";
import { test, expect } from "vitest";

import "../../dist/client/index.js";
import SimpleComponentRenderer from "../../dist/server/ssr.js";

import SsrComponent from "./SsrComponent.svelte";

const expectedRenderResult = {
  head: "",
  body: '<!--[--><!--[!--><p>server</p> <!----><simple-component><template shadowrootmode="open"><!--164jyg1--><!--[--><div><h1>SSR Test</h1> <p id="count">Count: number-5</p> <p id="enabled">Enabled: boolean-true</p></div><!--]--><!----></template> <!----><!----></simple-component><!----><!--]--><!--]-->',
  html: '<!--[--><!--[!--><p>server</p> <!----><simple-component><template shadowrootmode="open"><!--164jyg1--><!--[--><div><h1>SSR Test</h1> <p id="count">Count: number-5</p> <p id="enabled">Enabled: boolean-true</p></div><!--]--><!----></template> <!----><!----></simple-component><!----><!--]--><!--]-->',
};

test("rendering svelte", () => {
  ElementRendererRegistry.set("simple-component", SimpleComponentRenderer);
  const res = render(SsrComponent, {
    props: {
      title: "SSR Test",
      count: 5,
      enabled: true,
    },
  });
  expect(res).toStrictEqual(expectedRenderResult);
});
