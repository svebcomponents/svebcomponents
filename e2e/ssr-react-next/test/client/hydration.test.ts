import { chromium, type Browser, type Page } from "playwright";
import { inject, test, expect, describe, beforeAll, afterAll } from "vitest";

const baseUrl = inject("baseUrl");

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser.close();
});

/**
 * Chrome logs this when the parser reaches a `<template shadowrootmode>` on a
 * host that already has a shadow root — which is what happens to every element
 * whose definition loaded before its markup was parsed, the normal case for
 * anything React streams in after the shell.
 *
 * The element recovers (it adopts the stranded template itself, and the DOM
 * assertions below prove the server content survived), but the browser has
 * already written to the console by then and nothing on the page can prevent
 * it. Matched on exact text rather than a loose substring so a genuine React
 * hydration complaint can never slip through with it.
 */
const isParserShadowRootNotice = (text: string): boolean =>
  text.trim() ===
  "A second declarative shadow root cannot be created on a host.";

interface Diagnostics {
  pageErrors: string[];
  consoleErrors: string[];
}

/**
 * Opens a route and waits for React to hydrate, collecting anything React
 * complained about on the way.
 *
 * React reports a hydration mismatch by throwing a recoverable error and then
 * silently re-rendering the subtree client-side. Every DOM assertion below
 * would still pass on that re-rendered tree for most content, so the
 * diagnostics are load-bearing: without them a mismatch reads as success.
 */
const open = async (
  route: string,
  readySelector = "sync-component, simple-component",
): Promise<[Page, Diagnostics]> => {
  const page = await browser.newPage();
  const diagnostics: Diagnostics = { pageErrors: [], consoleErrors: [] };

  page.on("pageerror", (error) => diagnostics.pageErrors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    if (isParserShadowRootNotice(message.text())) return;
    diagnostics.consoleErrors.push(message.text());
  });

  await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
  // networkidle only means the bundle arrived: a streamed boundary may still
  // be showing its fallback, and hydration is concurrent even once it is not
  await page.waitForSelector(readySelector, { state: "attached" });
  await page.waitForTimeout(300);

  return [page, diagnostics];
};

const inspect = (page: Page, tag: string) =>
  page.evaluate((tag) => {
    const element = document.querySelector(tag);
    return {
      hasShadowRoot: element?.shadowRoot != null,
      heading: element?.shadowRoot?.querySelector("h1")?.textContent ?? null,
      count: element?.shadowRoot?.querySelector("#count")?.textContent ?? null,
      note: element?.shadowRoot?.querySelector("#note")?.textContent ?? null,
      prepared: element?.shadowRoot?.querySelector("#prepared")?.textContent ?? null,
      // a template left in the light DOM means the parser never adopted it,
      // which is what a client-side re-render produces
      strayTemplate: document.querySelector("template[shadowrootmode]") !== null,
      lightDomChild: document.querySelector("#light-dom") !== null,
    };
  }, tag);

describe.each([
  ["/rsc-sync", "sync-component", "RSC Sync"],
  ["/rsc-async", "simple-component", "RSC Async"],
  ["/rsc-async-streamed", "simple-component", "RSC Streamed"],
  ["/sync-streamed", "sync-component", "Sync Streamed"],
  ["/client-component", "sync-component", "Client Island"],
])("%s", (route, tag, heading) => {
  test("keeps the server-rendered shadow root and hydrates without complaint", async () => {
    const [page, diagnostics] = await open(route);

    const result = await inspect(page, tag);

    expect(result.hasShadowRoot).toBe(true);
    expect(result.heading).toBe(heading);
    expect(result.strayTemplate).toBe(false);

    expect(diagnostics.pageErrors).toEqual([]);
    expect(diagnostics.consoleErrors).toEqual([]);

    await page.close();
  });
});



test("a streamed boundary with no custom element in it hydrates cleanly", async () => {
  // the control: isolates a harness or Next problem from anything the
  // wrappers emit, since every streamed route above asserts the same silence
  const [page, diagnostics] = await open("/plain-streamed", "#streamed");

  const text = await page.evaluate(
    () => document.querySelector("#streamed")?.textContent,
  );
  expect(text).toBe("plain streamed content");
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.consoleErrors).toEqual([]);

  await page.close();
});

test("the async element's prepared server data reaches the browser", async () => {
  const [page] = await open("/rsc-async");

  const result = await inspect(page, "simple-component");
  expect(result.prepared).toBe("Prepared: adjacent server module");

  await page.close();
});

test("a rich prop reaches a server component's element through hydration", async () => {
  const [page] = await open("/rsc-sync");

  const result = await inspect(page, "sync-component");
  expect(result.note).toBe("rich prop survived");
  expect(result.lightDomChild).toBe(true);

  await page.close();
});

test("the hydrated element stays reactive to attribute updates", async () => {
  const [page] = await open("/rsc-sync");

  await page.evaluate(() => {
    document.querySelector("sync-component")?.setAttribute("count", "9");
  });
  await page.waitForTimeout(100);

  const result = await inspect(page, "sync-component");
  expect(result.count).toBe("Count: number-9");

  await page.close();
});

test("an App Router client transition mounts the element without a hydration error", async () => {
  const [page, diagnostics] = await open("/", "#to-rsc-async");

  // A value stored on window distinguishes a Next client transition from a
  // document navigation, which would create a new global object.
  await page.evaluate(() => {
    (window as typeof window & { __navigationSentinel?: boolean })
      .__navigationSentinel = true;
  });
  await page.click("#to-rsc-async");
  await page.waitForURL(`${baseUrl}/rsc-async`);
  await page.waitForSelector("simple-component", { state: "attached" });
  await page.waitForTimeout(300);

  expect(
    await page.evaluate(
      () =>
        (window as typeof window & { __navigationSentinel?: boolean })
          .__navigationSentinel,
    ),
  ).toBe(true);

  const result = await inspect(page, "simple-component");
  expect(result.hasShadowRoot).toBe(true);
  expect(result.heading).toBe("RSC Async");
  expect(result.strayTemplate).toBe(false);

  // Client transitions do not parse the server's declarative shadow markup.
  // The element mounts from its ordinary props, so preparation performed only
  // by SsrPrepare remains a document-render feature; apps that need the value
  // here must pass it from their Server Component as a serializable prop.
  expect(result.prepared).toBe("Prepared: none");
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.consoleErrors).toEqual([]);

  await page.close();
});

test("a streamed element hydrates the server DOM instead of re-rendering it", async () => {
  // `prepared` is set by the component's adjacent SsrPrepare hook and reaches
  // the browser only through the serialized-props payload inside the shadow
  // template. A client-side re-render has no way to know it, so seeing it here
  // is what separates real hydration from markup that merely looks right.
  const [page] = await open("/rsc-async-streamed");

  const result = await inspect(page, "simple-component");
  expect(result.prepared).toBe("Prepared: adjacent server module");
  expect(result.strayTemplate).toBe(false);

  await page.close();
});
