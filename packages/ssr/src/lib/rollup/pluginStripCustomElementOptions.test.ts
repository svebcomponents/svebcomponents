import type { TransformResult } from "rolldown";
import { describe, expect, it } from "vitest";

import { pluginStripCustomElementOptions } from "./pluginStripCustomElementOptions.js";

const transform = (code: string, id = "Component.svelte"): TransformResult => {
  const plugin = pluginStripCustomElementOptions();
  const hook = plugin.transform;
  if (typeof hook !== "function") throw new Error("expected a transform hook");
  // the hook's `this` context and `meta` arg are unused by this plugin; the
  // plugin transforms synchronously, so the result is never a promise
  return hook.call(
    undefined as never,
    code,
    id,
    undefined as never,
  ) as TransformResult;
};

/** the code string of a non-null transform result */
const codeOf = (result: TransformResult): string => {
  if (result && typeof result === "object" && "code" in result) {
    return result.code;
  }
  throw new Error("expected a transform result with a code string");
};

describe("pluginStripCustomElementOptions", () => {
  it("removes a customElement-only svelte:options tag entirely", () => {
    const code = codeOf(
      transform(
        `<svelte:options customElement={{ props: { x: { type: "Object" } } }} />\n<p>hi</p>`,
      ),
    );
    expect(code).not.toContain("svelte:options");
    expect(code).not.toContain("customElement");
    expect(code).toContain("<p>hi</p>");
  });

  it("keeps other options while removing only customElement", () => {
    const code = codeOf(
      transform(
        `<svelte:options namespace="svg" customElement="my-el" />\n<p>hi</p>`,
      ),
    );
    expect(code).toContain("svelte:options");
    expect(code).toContain('namespace="svg"');
    expect(code).not.toContain("customElement");
  });

  it("is a no-op for svelte:options without customElement", () => {
    expect(
      transform(`<svelte:options namespace="svg" />\n<p>hi</p>`),
    ).toBeNull();
  });

  it("is a no-op when there is no svelte:options", () => {
    expect(transform(`<p>hi</p>`)).toBeNull();
  });

  it("ignores non-svelte files", () => {
    expect(transform(`export const x = 1;`, "foo.ts")).toBeNull();
  });

  it("replaces $host() calls in the instance script with undefined", () => {
    const code = codeOf(
      transform(
        `<script>\n  const emit = () => $host().dispatchEvent(new CustomEvent("x"));\n</script>\n<p>hi</p>`,
      ),
    );
    expect(code).not.toContain("$host");
    expect(code).toContain(`undefined.dispatchEvent(new CustomEvent("x"))`);
  });

  it("replaces $host() calls inside template expressions", () => {
    const code = codeOf(
      transform(
        `<button onclick={() => $host()?.dispatchEvent(new CustomEvent("x"))}>go</button>`,
      ),
    );
    expect(code).not.toContain("$host");
    expect(code).toContain("undefined?.dispatchEvent");
  });

  it("handles $host() and the customElement option in one pass", () => {
    const code = codeOf(
      transform(
        `<svelte:options customElement="my-el" />\n<script>\n  const el = $host();\n</script>\n<p>hi</p>`,
      ),
    );
    expect(code).not.toContain("customElement");
    expect(code).not.toContain("$host");
    expect(code).toContain("const el = undefined;");
  });

  it("lets a $host()-using component compile for the server", async () => {
    const { compile } = await import("svelte/compiler");

    // without <svelte:options customElement> (the auto-options case), a
    // server compile rejects $host outright…
    const bare = `<script>\n  const emit = () => $host()?.dispatchEvent(new CustomEvent("x"));\n</script>\n<button onclick={emit} class="x">go</button>\n<style>.x{color:red}</style>`;
    expect(() =>
      compile(bare, { generate: "server", css: "injected" }),
    ).toThrow(/host/);
    // …and after stripping it compiles, with its CSS
    const bareStripped = compile(codeOf(transform(bare)), {
      generate: "server",
      css: "injected",
    });
    expect(bareStripped.js.code.includes("css.add")).toBe(true);

    // with <svelte:options customElement>, the untransformed server compile
    // accepts $host but silently drops the CSS (the FOUC this plugin fixes)…
    const withOptions = `<svelte:options customElement="my-el" />\n${bare}`;
    const unstripped = compile(withOptions, {
      generate: "server",
      css: "injected",
    });
    expect(unstripped.js.code.includes("css.add")).toBe(false);
    // …and after stripping both constructs, it compiles WITH the CSS
    const stripped = compile(codeOf(transform(withOptions)), {
      generate: "server",
      css: "injected",
    });
    expect(stripped.js.code.includes("css.add")).toBe(true);
  });

  it("lets the stripped component emit its CSS in a server compile", async () => {
    const { compile } = await import("svelte/compiler");
    const source = `<svelte:options customElement={{ props: {} }} />\n<b class="x">hi</b>\n<style>.x{color:red}</style>`;

    // with the customElement option, the server compile drops the CSS
    const before = compile(source, { generate: "server", css: "injected" });
    expect(before.js.code.includes("css.add")).toBe(false);

    // after stripping it, the CSS is emitted
    const after = compile(codeOf(transform(source)), {
      generate: "server",
      css: "injected",
    });
    expect(after.js.code.includes("css.add")).toBe(true);
    expect(after.js.code.includes("color:red")).toBe(true);
  });
});
