import { ElementRendererRegistry } from "@svebcomponents/ssr";
import { render } from "svelte/server";
import { test, expect } from "vitest";

import "../../dist/client/index.js";
import SimpleComponentRenderer from "../../dist/server/ssr.js";

import SecurityComponent from "./SecurityComponent.svelte";
import SsrComponent from "./SsrComponent.svelte";

const expectedRenderResult = {
  head: "",
  body: '<!--[--><!--[!--><!--1mdqziy--><simple-component title="SSR Test" count="5" enabled><!----> <template shadowrootmode="open"><!--164jyg1--><!--[--><div><h1>SSR Test</h1> <p id="count">Count: number-5</p> <p id="enabled">Enabled: boolean-true</p></div><!--]--><!----></template> <!----> <!--1llhvfc--></simple-component><!----><!--]--><!--]-->',
  html: '<!--[--><!--[!--><!--1mdqziy--><simple-component title="SSR Test" count="5" enabled><!----> <template shadowrootmode="open"><!--164jyg1--><!--[--><div><h1>SSR Test</h1> <p id="count">Count: number-5</p> <p id="enabled">Enabled: boolean-true</p></div><!--]--><!----></template> <!----> <!--1llhvfc--></simple-component><!----><!--]--><!--]-->',
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

test("does not render internal debug markers", () => {
  ElementRendererRegistry.set("simple-component", SimpleComponentRenderer);
  const res = render(SsrComponent, {
    props: {
      title: "SSR Test",
      count: 5,
      enabled: true,
    },
  });

  // Regression guard for leaked debug markup (e.g. `<p>server</p>` /
  // `<p>client</p>`) from the SSR wrapper components. We match on the
  // element itself (tag + text) rather than a raw substring so the
  // assertion isn't tied to whitespace or Svelte's generated hydration
  // comment markers, which can legitimately change between Svelte
  // versions/builds.
  expect(res.body).not.toMatch(/<p[^>]*>\s*(server|client)\s*<\/p>/);
  expect(res.html).not.toMatch(/<p[^>]*>\s*(server|client)\s*<\/p>/);
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
  // Confirms the hostile attribute payload is emitted as escaped attribute
  // content, not parsed as markup or as additional attributes.
  expect(res.html).toContain(
    'data-test="&quot;>&lt;img src=x onerror=alert(1)>"',
  );
});
