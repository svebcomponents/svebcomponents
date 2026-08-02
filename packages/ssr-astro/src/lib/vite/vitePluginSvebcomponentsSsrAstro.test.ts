import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test, describe, afterAll } from "vitest";
import type { Plugin } from "vite";

import vitePluginSvebcomponentsSsrAstro from "./vitePluginSvebcomponentsSsrAstro.js";
import { WRAPPER_COMPONENT_NAME } from "../shared/wrapperName.js";

/**
 * The plugin rewrites in `load`, so it reads from disk rather than receiving
 * source — these tests write real files.
 */
const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "sveb-astro-"));
afterAll(() => fs.rm(tmpDir, { recursive: true, force: true }));

let fileCounter = 0;
const load = async (
  source: string,
  plugin: Plugin = vitePluginSvebcomponentsSsrAstro(),
  suffix = ".astro",
): Promise<string | null> => {
  const filename = path.join(tmpDir, `Component${++fileCounter}${suffix}`);
  await fs.writeFile(filename, source);

  const handler = plugin.load;
  if (typeof handler !== "function") throw new Error("expected a load hook");
  const result = await handler.call({} as never, filename);
  if (result === null || result === undefined) return null;
  return typeof result === "string" ? result : (result.code ?? null);
};

describe("vitePluginSvebcomponentsSsrAstro", () => {
  test("rewrites a custom element to the wrapper component", async () => {
    const out = await load(`<div><my-el count="5"></my-el></div>`);

    expect(out).toContain(`<${WRAPPER_COMPONENT_NAME} _tagName="my-el"`);
    expect(out).toContain(`</${WRAPPER_COMPONENT_NAME}>`);
    expect(out).not.toContain("<my-el");
  });

  test("rewrites a self-closing custom element", async () => {
    const out = await load(`<div><my-el count="5" /></div>`);

    expect(out).toContain(`<${WRAPPER_COMPONENT_NAME} _tagName="my-el"`);
    expect(out).not.toContain(`</${WRAPPER_COMPONENT_NAME}>`);
  });

  test("imports the wrapper into existing frontmatter", async () => {
    const out = await load(
      `---\nconst label = "hi";\n---\n<my-el title={label} />`,
    );

    expect(out).toContain(`import ${WRAPPER_COMPONENT_NAME} from`);
    expect(out).toContain(`const label = "hi";`);
    // the import must be inside the frontmatter fence, not in the template
    const fenceEnd = out?.lastIndexOf("---") ?? -1;
    expect(out?.indexOf(`import ${WRAPPER_COMPONENT_NAME}`)).toBeLessThan(
      fenceEnd,
    );
  });

  test("creates frontmatter when the component has none", async () => {
    const out = await load(`<my-el />`);

    expect(out?.startsWith("---\n")).toBe(true);
    expect(out).toContain(`import ${WRAPPER_COMPONENT_NAME} from`);
  });

  test("preserves attributes and expressions", async () => {
    const out = await load(
      `---\nconst t = 1;\n---\n<my-el title={t} count="5"><p>hi</p></my-el>`,
    );

    expect(out).toContain("title={t}");
    expect(out).toContain(`count="5"`);
    expect(out).toContain("<p>hi</p>");
  });

  test("rewrites nested custom elements", async () => {
    const out = await load(`<outer-el><inner-el /></outer-el>`);

    expect(out).toContain(`_tagName="outer-el"`);
    expect(out).toContain(`_tagName="inner-el"`);
  });

  test("rewrites sibling custom elements sharing a tag name", async () => {
    const out = await load(`<div><my-el>a</my-el><my-el>b</my-el></div>`);

    expect(out).not.toContain("</my-el>");
    expect(out).toContain(">a</");
    expect(out).toContain(">b</");
  });

  test("returns the source untouched when there are no custom elements", async () => {
    const source = `<div><span>hi</span></div>`;
    const out = await load(source);

    expect(out).toBe(source);
  });

  test("leaves astro components alone", async () => {
    // a capitalized tag is a component, not a custom element — astro's parser
    // classifies it as such, so no dash heuristic can confuse the two
    const source = `---\nimport Other from "./Other.astro";\n---\n<Other />`;
    const out = await load(source);

    expect(out).toBe(source);
  });

  test("honors an explicit tag allowlist", async () => {
    const out = await load(
      `<div><known-el /><other-el /></div>`,
      vitePluginSvebcomponentsSsrAstro({ tags: ["known-el"] }),
    );

    expect(out).toContain(`_tagName="known-el"`);
    expect(out).toContain("<other-el");
    expect(out).not.toContain(`_tagName="other-el"`);
  });

  test("ignores non-astro files", async () => {
    const out = await load(`<my-el />`, undefined, ".svelte");

    expect(out).toBeNull();
  });

  test("ignores astro sub-requests, which astro serves from its own cache", async () => {
    const plugin = vitePluginSvebcomponentsSsrAstro();
    const handler = plugin.load;
    if (typeof handler !== "function") throw new Error("expected a load hook");

    const result = await handler.call(
      {} as never,
      "/src/Component.astro?astro&type=script&index=0",
    );

    expect(result).toBeNull();
  });
});
