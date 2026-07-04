import { expect, test, describe } from "vitest";
import vitePluginSvebcomponentsSsr from "./vitePluginSvebcomponentsSsr";
import type { Plugin } from "vite";

type TransformFn = (
  code: string,
  id: string,
) => Promise<{ code: string } | null> | ({ code: string } | null);

/**
 * The plugin's `transform` hook is defined as a plain async function (not an
 * object hook), so we can invoke it directly. It does not rely on `this`.
 */
const getTransform = (plugin: Plugin): TransformFn =>
  plugin.transform as unknown as TransformFn;

const transform = async (code: string, id = "Test.svelte") => {
  const plugin = vitePluginSvebcomponentsSsr();
  const result = await getTransform(plugin)(code, id);
  return result?.code ?? null;
};

describe("vitePluginSvebcomponentsSsr", () => {
  test("returns plugin with correct name", () => {
    const plugin = vitePluginSvebcomponentsSsr();
    expect(plugin.name).toBe("vite-plugin-svelte-webcomponent-wrapper");
  });

  test("ignores non-svelte files", async () => {
    const plugin = vitePluginSvebcomponentsSsr();
    const result = await getTransform(plugin)(
      "<my-widget></my-widget>",
      "Test.ts",
    );
    expect(result).toBeNull();
  });

  test("transforms a normal custom element and keeps _tagName", async () => {
    const output = await transform(`<my-widget count={5}>hi</my-widget>`);

    expect(output).not.toBeNull();
    // opening tag renamed
    expect(output).toContain("<CustomElementWrapper");
    // _tagName prop preserved
    expect(output).toContain(`_tagName="my-widget"`);
    // closing tag rewritten
    expect(output).toContain("</CustomElementWrapper>");
    // original prop preserved
    expect(output).toContain("count={5}");
    // wrapper import added
    expect(output).toContain(
      "import CustomElementWrapper from '@svebcomponents/ssr/wrapper-component'",
    );
    // no dangling original tag names
    expect(output).not.toContain("<my-widget");
    expect(output).not.toContain("</my-widget>");
  });

  test("transforms a self-closing custom element and keeps _tagName", async () => {
    const output = await transform(`<my-widget count={5} />`);

    expect(output).not.toBeNull();
    expect(output).toContain("<CustomElementWrapper");
    // the critical assertion: _tagName must not be lost
    expect(output).toContain(`_tagName="my-widget"`);
    expect(output).toContain("count={5}");
    // self-closing stays self-closing, no bogus closing tag introduced
    expect(output).toContain("/>");
    expect(output).not.toContain("</CustomElementWrapper>");
    // no corruption of surrounding characters (would show up as a stray tag)
    expect(output).not.toContain("<my-widget");
  });

  test("self-closing sibling does not corrupt an earlier same-tag element", async () => {
    const output = await transform(`<my-el></my-el><my-el />`);

    expect(output).not.toBeNull();
    // first element: full open + close rewrite
    // second element: self-closing, _tagName kept
    // both opening tags renamed
    const openWrappers = output!.match(/<CustomElementWrapper/g) ?? [];
    expect(openWrappers).toHaveLength(2);
    // exactly one closing tag (from the first, non-self-closing element)
    const closeWrappers = output!.match(/<\/CustomElementWrapper>/g) ?? [];
    expect(closeWrappers).toHaveLength(1);
    // both elements carry the _tagName prop
    const tagNameProps = output!.match(/_tagName="my-el"/g) ?? [];
    expect(tagNameProps).toHaveLength(2);
    // the first element's closing tag must not have been clobbered into garbage
    expect(output).not.toContain("</my-el>");
    expect(output).not.toContain("<my-el");
  });

  test("nested same-tag elements map their closing tags correctly", async () => {
    const output = await transform(`<my-box><my-box>inner</my-box></my-box>`);

    expect(output).not.toBeNull();
    const openWrappers = output!.match(/<CustomElementWrapper/g) ?? [];
    expect(openWrappers).toHaveLength(2);
    const closeWrappers = output!.match(/<\/CustomElementWrapper>/g) ?? [];
    expect(closeWrappers).toHaveLength(2);
    const tagNameProps = output!.match(/_tagName="my-box"/g) ?? [];
    expect(tagNameProps).toHaveLength(2);
    // no original tag names left behind
    expect(output).not.toContain("<my-box");
    expect(output).not.toContain("</my-box>");
    expect(output).toContain("inner");
  });

  test("leaves non-custom (plain) elements untouched", async () => {
    const output = await transform(`<div class="a"><span>hi</span></div>`);

    // nothing to transform => plugin returns null (no changes)
    expect(output).toBeNull();
  });
});
