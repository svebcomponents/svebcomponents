import { ElementRendererRegistry } from "@svebcomponents/ssr";
import { render } from "svelte/server";
import { test, expect } from "vitest";

import "../../dist/client/index.js";
import SimpleComponentRenderer from "../../dist/server/ssr.js";

import SecurityComponent from "./SecurityComponent.svelte";
import SsrComponent from "./SsrComponent.svelte";

test("rendering svelte with async SSR renderer", async () => {
  ElementRendererRegistry.set("simple-component", SimpleComponentRenderer);
  const res = await render(SsrComponent, {
    props: {
      title: "SSR Test",
      count: 5,
      enabled: true,
    },
  });
  expect(res.head).toBe("");
  expect(res.body).toContain(
    '<simple-component title="SSR Test" count="5" enabled="">',
  );
  expect(res.body).toContain('<template shadowrootmode="open">');
  expect(res.body).toContain("<h1>SSR Test</h1>");
  expect(res.body).toContain('<p id="count">Count: number-5</p>');
  expect(res.body).toContain('<p id="enabled">Enabled: boolean-true</p>');
  expect(res.body).toContain('<p id="async-label">Async: resolved</p>');
  expect(res.body).toContain(
    '<p id="prepared">Prepared: adjacent server module</p>',
  );
  expect(res.body).toContain('"prepared":{"source":"adjacent server module"}');
});

test("escapes untrusted values rendered through shadow props", async () => {
  ElementRendererRegistry.set("simple-component", SimpleComponentRenderer);

  const payload = `"><img src=x onerror=alert(1)>`;
  const res = await render(SecurityComponent, {
    props: {
      title: payload,
      content: "safe light dom",
    },
  });

  expect(res.body).not.toContain("<img");
  expect(res.body).toContain("&lt;img src=x onerror=alert(1)>");
});

test("escapes untrusted values rendered through light DOM children", async () => {
  ElementRendererRegistry.set("simple-component", SimpleComponentRenderer);

  const payload = `<script>alert("xss")</script>`;
  const res = await render(SecurityComponent, {
    props: {
      title: "safe title",
      content: payload,
    },
  });

  expect(res.body).not.toContain("<script>");
  expect(res.body).toContain('&lt;script>alert("xss")&lt;/script>');
});

test("does not turn untrusted host attribute values into markup", async () => {
  ElementRendererRegistry.set("simple-component", SimpleComponentRenderer);

  const payload = `"><img src=x onerror=alert(1)>`;
  const res = await render(SecurityComponent, {
    props: {
      attributePayload: payload,
      title: "safe title",
      content: "safe light dom",
    },
  });

  expect(res.body).not.toContain("<img");
  // Confirms the hostile attribute payload is emitted as escaped attribute
  // content, not parsed as markup or as additional attributes.
  expect(res.body).toContain(
    'data-test="&quot;>&lt;img src=x onerror=alert(1)>"',
  );
});
