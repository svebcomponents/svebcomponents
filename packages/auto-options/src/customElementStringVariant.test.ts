import { compile } from "svelte/compiler";
import { describe, expect, test } from "vitest";
import autoOptions from "./autoOptions";

const svelteId = "t.svelte";

// Historical note: `<svelte:options customElement="tag-name"/>` (the quoted
// string variant) used to crash the plugin with `TypeError: Cannot read
// properties of undefined (reading 'type')`, because the code assumed
// `customElement`'s attribute value was always an `ExpressionTag` with an
// `expression` property. It's actually an array of `Text` nodes for the
// string variant. That variant is now fully supported (see
// `extractSvelteOptionsProps.ts`/`injectInferredProps.ts`).
//
// The bare boolean shorthand (`<svelte:options customElement/>`) and a
// dynamically-interpolated string tag (`customElement="{x}"`) remain
// unsupported in `extractSvelteOptionsProps.ts`'s defensive fallback, but
// aren't exercisable through this plugin's real pipeline: Svelte's own
// `svelte/compiler` `parse()` (called before our code ever runs) already
// rejects both with a `CompileError`, confirmed directly against this
// package's installed Svelte version.
describe("customElement string-shorthand form", () => {
  test("expands a string tag into the object form with inferred props", async () => {
    const input = `<svelte:options customElement="my-tag"/>
<script lang="ts">
  let { count }: { count: number } = $props();
</script>
<h1>{count}</h1>
`;

    const result = await autoOptions().transform(input, svelteId);

    expect(result).not.toBeNull();
    expect(result?.code).toContain('tag: "my-tag"');
    expect(result?.code).toContain(
      'count: {attribute: "count", reflect: true, type: "Number"}',
    );
    // the original string-form attribute must not remain
    expect(result?.code).not.toContain('customElement="my-tag"');

    // the rewritten svelte:options must still compile
    expect(() =>
      compile(result!.code, { customElement: true, generate: "client" }),
    ).not.toThrow();
  });
});
