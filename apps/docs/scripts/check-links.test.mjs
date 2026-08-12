import assert from "node:assert/strict";
import test from "node:test";

import { analyzeMarkdown, resolveInternalTarget } from "./check-links.mjs";

test("uses Astro heading IDs and strips imported titles", async () => {
  const source = `# Removed title

## \`await_invalid\`

## AsyncRendererError: \`<my-element>\` renders asynchronously…

## API

## API

## API-1

  ## Migration

[relative](../../publishing/#check-the-package) [reference][authoring]

[authoring]: /authoring/#declare-the-tag
`;
  const { headings, links } = await analyzeMarkdown(source);

  assert.deepEqual(
    [...headings],
    [
      "await_invalid",
      "asyncrenderererror-my-element-renders-asynchronously",
      "api",
      "api-1",
      "api-1-1",
      "migration",
    ],
  );
  assert.deepEqual(
    [...links],
    ["../../publishing/#check-the-package", "/authoring/#declare-the-tag"],
  );
});

test("resolves links in their rendered route context", () => {
  assert.equal(
    resolveInternalTarget(
      "../../publishing/#check-the-package",
      "/guides/build/",
    )?.href,
    "https://svebcomponents.dev/publishing/#check-the-package",
  );
  assert.equal(
    resolveInternalTarget("https://svebcomponents.dev/authoring/", undefined)
      ?.href,
    "https://svebcomponents.dev/authoring/",
  );
  assert.equal(
    resolveInternalTarget("https://svebcomponents.dev", undefined)?.href,
    "https://svebcomponents.dev/",
  );
  assert.equal(
    resolveInternalTarget("./CONTRIBUTING.md", undefined),
    undefined,
  );
  assert.equal(
    resolveInternalTarget("https://svebcomponents.dev.example/", "/"),
    undefined,
  );
  assert.equal(resolveInternalTarget("https://svelte.dev/", "/"), undefined);
});
