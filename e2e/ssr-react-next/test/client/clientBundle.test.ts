import { chromium, type Browser } from "playwright";
import { inject, test, expect, beforeAll, afterAll } from "vitest";

const baseUrl = inject("baseUrl");

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser.close();
});

/**
 * Fragments that only exist in the server-rendering stack.
 *
 * `@svebcomponents/ssr` reaches the element renderer through `@lit-labs/ssr`,
 * which parses markup with parse5 — none of which can do anything in a
 * browser. They are matched by internal string constants rather than by
 * package name, because package names do not survive bundling and minification
 * while these do.
 */
const serverOnlyMarkers = [
  // parse5 tokenizer error codes
  "misplaced-doctype",
  "MULTIPLE_SOLIDUS_IN_TAG",
  // @lit-labs/ssr's marker for a value it is rendering into an attribute
  "lit-part",
];

/**
 * The wrapper imports the element renderer at module scope because it has to
 * server-render, so nothing in the module graph marks that import as
 * droppable. What lets a bundler drop it anyway is `@svebcomponents/ssr`
 * declaring which of its modules have side effects: every other module is
 * pure, so once `BROWSER` folds to a constant the whole renderer becomes
 * unreachable and goes.
 *
 * That is easy to undo without noticing. Adding a module-scope side effect to
 * the package, or widening the `sideEffects` list to cover it, silently
 * restores the full graph with no symptom other than a much larger bundle. So
 * this asserts on what the browser actually downloads rather than on the build
 * output, which also keeps it honest about stale chunks left in `.next`.
 */
test("the client bundle does not carry the server-rendering stack", async () => {
  const page = await browser.newPage();
  const scripts: string[] = [];

  page.on("response", (response) => {
    const url = response.url();
    if (url.endsWith(".js") && url.startsWith(baseUrl)) scripts.push(url);
  });

  // a route whose element goes through the sync wrapper, so the JSX runtime
  // and CustomElement are both in the client graph
  await page.goto(`${baseUrl}/client-component`, { waitUntil: "networkidle" });
  await page.close();

  expect(scripts.length).toBeGreaterThan(0);

  const offenders: string[] = [];
  for (const url of scripts) {
    const source = await (await fetch(url)).text();
    for (const marker of serverOnlyMarkers) {
      if (source.includes(marker)) {
        offenders.push(`${url.replace(baseUrl, "")} contains "${marker}"`);
      }
    }
  }

  expect(offenders).toEqual([]);
});
