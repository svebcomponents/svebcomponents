import { expect, test, vi } from "vitest";
import autoOptions from "./autoOptions";

const svelteId = "t.svelte";

// Regression test for B3: `<svelte:options customElement="tag-name"/>` (the quoted string
// variant) used to crash the plugin with `TypeError: Cannot read properties of undefined
// (reading 'type')`, because the code assumed `customElement`'s attribute value was always an
// `ExpressionTag` with an `expression` property. It's actually an array of `Text` nodes for the
// string variant.
//
// Since the string variant is not supported, and a `customElement` attribute is already present,
// the plugin must not inject a second `customElement={{...}}` attribute either (that would be a
// Svelte compile error) - it should leave the component untouched (return `null`).
test("auto-options does not crash and returns null for customElement string variant", async () => {
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

  const input = `<svelte:options customElement="my-tag"/>
<script lang="ts">
  interface Props {
    numberProp: number;
  }
  let props: Props = $props();
</script>
<h1>{props}</h1>
`;

  const result = await autoOptions().transform(input, svelteId);

  expect(result).toBe(null);
  expect(warnSpy).toHaveBeenCalledWith(
    expect.stringContaining(
      'Svelte Options with the format `<svelte:options customElement="tagName"/>` are currently not supported.',
    ),
  );

  warnSpy.mockRestore();
});
