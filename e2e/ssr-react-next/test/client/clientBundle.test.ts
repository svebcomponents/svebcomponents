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
 * The wrapper has to import the element renderer to server-render at all, and
 * no bundler can drop that import: `@svebcomponents/ssr` installs its DOM shim
 * as an import side effect, so the module is reachable even though the browser
 * branch never calls into it. The package's `browser` export condition is what
 * keeps it out, by pointing browser builds at a separate entry.
 *
 * That condition is easy to break by accident — adding an export, reordering
 * conditions, or importing the universal entry from a browser-only module all
 * silently undo it, with no symptom other than a much larger bundle. So this
 * asserts on what the browser actually downloads rather than on the build
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
