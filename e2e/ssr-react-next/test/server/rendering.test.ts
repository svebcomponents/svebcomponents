import { inject, test, expect, describe } from "vitest";

const baseUrl = inject("baseUrl");

const fetchRoute = async (route: string): Promise<string> => {
  const response = await fetch(`${baseUrl}${route}`);
  expect(response.status).toBe(200);
  return response.text();
};

describe("server component routes", () => {
  test("a plain dashed tag is server-rendered with declarative shadow DOM", async () => {
    const html = await fetchRoute("/rsc-sync");

    expect(html).toContain('<template shadowrootmode="open">');
    expect(html).toContain("<h1 ");
    expect(html).toContain("RSC Sync");
    // the renderer's own attribute output reached the host element
    expect(html).toMatch(/<sync-component[^>]*count="3"/);
    // light-dom children sit after the shadow template, not inside it
    expect(html).toMatch(/<\/template><p id="light-dom">/);
  });

  test("the /rsc wrapper server-renders an element the sync path cannot", async () => {
    const html = await fetchRoute("/rsc-async");

    // simple-component both awaits while rendering and has an async
    // SsrPrepare hook — the sync wrapper degrades to client-only on it
    expect(html).toContain('<p id="async-label">Async: resolved</p>');
    expect(html).toContain('<p id="prepared">Prepared: adjacent server module</p>');
  });

  test("an element inside a Suspense boundary survives out-of-order streaming", async () => {
    const html = await fetchRoute("/rsc-async-streamed");

    // the shell was flushed with the fallback, so the element arrived later in
    // one of React's `<div hidden>` payloads
    expect(html).toContain('<p id="fallback">loading</p>');
    expect(html).toContain('<template shadowrootmode="open">');
    expect(html).toContain("RSC Streamed");
  });

  test("the sync wrapper server-renders inside a Suspense boundary too", async () => {
    const html = await fetchRoute("/sync-streamed");

    expect(html).toContain('<p id="fallback">loading</p>');
    expect(html).toContain('<template shadowrootmode="open">');
    expect(html).toContain("Sync Streamed");
  });

  test("a client component's element is server-rendered too", async () => {
    const html = await fetchRoute("/client-component");

    expect(html).toContain('<template shadowrootmode="open">');
    expect(html).toContain("Client Island");
  });
});
