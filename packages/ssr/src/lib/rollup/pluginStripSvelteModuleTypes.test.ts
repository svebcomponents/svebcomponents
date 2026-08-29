import type { TransformResult } from "rolldown";
import svelte from "rollup-plugin-svelte";
import { describe, expect, it } from "vitest";

import { pluginStripSvelteModuleTypes } from "./pluginStripSvelteModuleTypes.js";

const transform = async (
  code: string,
  id = "coverage-ctx.svelte.ts",
): Promise<TransformResult> => {
  const plugin = pluginStripSvelteModuleTypes();
  const hook = plugin.transform;
  const handler = typeof hook === "function" ? hook : hook?.handler;
  if (!handler) throw new Error("expected a transform hook");
  return handler.call(
    { warn: () => undefined } as never,
    code,
    id,
    undefined as never,
  ) as Promise<TransformResult>;
};

const codeOf = (result: unknown): string => {
  if (
    result &&
    typeof result === "object" &&
    "code" in result &&
    typeof result.code === "string"
  ) {
    return result.code;
  }
  throw new Error("expected a transform result with a code string");
};

describe("pluginStripSvelteModuleTypes", () => {
  it("strips the TypeScript syntax reported in issue #176", async () => {
    const code = codeOf(
      await transform(`
import { value, type Coverage } from "./types.js";
import { SvelteMap } from "svelte/reactivity";

export class CoverageCtx {
  coverage = $state<Coverage>();
  indices = $derived(new SvelteMap(this.coverage?.indices));
  value = value;
}
`),
    );

    expect(code).not.toContain("type Coverage");
    expect(code).not.toContain("$state<Coverage>");
    expect(code).toContain("$state()");
    expect(code).toContain("$derived(");
    expect(code).toContain('import { value } from "./types.js"');
  });

  it("supports infix Svelte module filenames", async () => {
    const code = codeOf(
      await transform(
        "export const count = $state<number>(0);",
        "counter.svelte.test.ts",
      ),
    );

    expect(code).toContain("$state(0)");
    expect(code).not.toContain("<number>");
  });

  it("ignores ordinary TypeScript and JavaScript Svelte modules", async () => {
    expect(
      await transform("const value: number = 1;", "ordinary.ts"),
    ).toBeNull();
    expect(
      await transform("export const value = $state(1);", "state.svelte.js"),
    ).toBeNull();
  });

  it("produces JavaScript that the Svelte module compiler accepts", async () => {
    const stripped = codeOf(
      await transform(`
type Coverage = { indices?: Iterable<[string, number]> };
export class CoverageCtx {
  coverage = $state<Coverage>();
  first = $derived(this.coverage?.indices?.[Symbol.iterator]().next().value);
}
`),
    );
    const sveltePlugin = svelte({ emitCss: false });
    const hook = sveltePlugin.transform;
    if (typeof hook !== "function")
      throw new Error("expected a transform hook");

    const compiled = await hook.call(
      { warn: () => undefined } as never,
      stripped,
      "coverage-ctx.svelte.ts",
      undefined as never,
    );

    expect(codeOf(compiled)).not.toContain("$state");
  });

  it("emits a source map for chaining into the Svelte transform", async () => {
    const result = await transform("export const count = $state<number>(0);");

    expect(result).toMatchObject({ map: expect.any(Object) });
  });
});
