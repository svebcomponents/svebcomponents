import { renderToStaticMarkup } from "react-dom/server";
import { test, expect, vi } from "vitest";

// the real build artifacts of the shared e2e component package: the browser
// entry defines the custom elements, the /ssr entries register their renderers
import "@svebcomponents/e2e.ssr";
import "@svebcomponents/e2e.ssr/sync";
import "@svebcomponents/e2e.ssr/ssr";
import "@svebcomponents/e2e.ssr/sync/ssr";

import SyncApp from "../../src/SyncApp.js";
import AsyncApp from "../../src/AsyncApp.js";

test("renders a synchronous custom element to declarative shadow DOM", () => {
  const html = renderToStaticMarkup(<SyncApp title="React SSR" />);

  // the declarative shadow root must be the element's first child for the
  // parser to adopt it
  expect(html).toContain('<sync-component');
  expect(html).toContain('<template shadowrootmode="open">');
  expect(html.indexOf('<template shadowrootmode="open">')).toBeLessThan(
    html.indexOf('<p id="light-dom">'),
  );
  expect(html).toContain(">React SSR</h1>");
  expect(html).toContain('<p id="count">Count: number-3</p>');
  expect(html).toContain('<p id="enabled">Enabled: boolean-true</p>');
});

test("keeps light-dom children outside the shadow template", () => {
  const html = renderToStaticMarkup(<SyncApp title="React SSR" />);

  const shadowEnd = html.indexOf("</template>");
  expect(shadowEnd).toBeGreaterThan(-1);
  expect(html.indexOf('<p id="light-dom">')).toBeGreaterThan(shadowEnd);
});

test("emits the host attributes the element renderer produced", () => {
  const html = renderToStaticMarkup(<SyncApp title="React SSR" />);

  expect(html).toContain('title="React SSR"');
  expect(html).toContain('count="3"');
});

test("serializes rich props for the client to hydrate from", () => {
  const html = renderToStaticMarkup(<SyncApp title="React SSR" />);

  expect(html).toContain('"note":"rich prop survived"');
});

test("escapes untrusted values rendered into the shadow root", () => {
  const html = renderToStaticMarkup(
    <SyncApp title={`"><img src=x onerror=alert(1)>`} />,
  );

  expect(html).not.toContain("<img");
  expect(html).toContain("&lt;img src=x onerror=alert(1)>");
});

test("degrades to client-only rendering for an asynchronous renderer", () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

  const html = renderToStaticMarkup(<AsyncApp title="React Async" />);

  // the element is still emitted, so the page renders and the browser can
  // take over — it just has no server-rendered shadow content
  expect(html).toContain("<simple-component");
  expect(html).not.toContain("<template shadowrootmode");
  expect(html).not.toContain("Async: resolved");

  // and the reason is reported rather than swallowed
  const messages = warn.mock.calls.map(([message]) => String(message));
  warn.mockRestore();
  expect(messages.some((m) => m.includes("renders asynchronously"))).toBe(true);
});

test("propagates genuine render failures instead of degrading", () => {
  // an element with no registered renderer is a configuration error, not an
  // async component, and must not be silently downgraded
  expect(() =>
    renderToStaticMarkup(
      <div>
        <unregistered-element />
      </div>,
    ),
  ).toThrow(/not found/i);
});
