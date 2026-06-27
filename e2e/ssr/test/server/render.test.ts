import { ElementRendererRegistry } from "@svebcomponents/ssr";
import { render } from "svelte/server";
import { test, expect } from "vitest";

import "../../dist/client/index.js";
import SimpleComponentRenderer from "../../dist/server/ssr.js";

import SecurityComponent from "./SecurityComponent.svelte";
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

test("escapes untrusted values rendered through shadow props", () => {
  ElementRendererRegistry.set("simple-component", SimpleComponentRenderer);

  const payload = `"><img src=x onerror=alert(1)>`;
  const res = render(SecurityComponent, {
    props: {
      title: payload,
      content: "safe light dom",
    },
  });

  expect(res.html).not.toContain("<img");
  expect(res.html).toContain("&lt;img src=x onerror=alert(1)>");
});

test("escapes untrusted values rendered through light DOM children", () => {
  ElementRendererRegistry.set("simple-component", SimpleComponentRenderer);

  const payload = `<script>alert("xss")</script>`;
  const res = render(SecurityComponent, {
    props: {
      title: "safe title",
      content: payload,
    },
  });

  expect(res.html).not.toContain("<script>");
  expect(res.html).toContain('&lt;script>alert("xss")&lt;/script>');
});

test("does not turn untrusted host attribute values into markup", () => {
  ElementRendererRegistry.set("simple-component", SimpleComponentRenderer);

  const payload = `"><img src=x onerror=alert(1)>`;
  const res = render(SecurityComponent, {
    props: {
      attributePayload: payload,
      title: "safe title",
      content: "safe light dom",
    },
  });

  expect(res.html).not.toContain("<img");
  if (res.html.includes("data-test=")) {
    expect(res.html).toContain("&lt;img src=x onerror=alert(1)>");
  }
});
