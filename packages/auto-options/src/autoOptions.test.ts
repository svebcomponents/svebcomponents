import { assert, expect, test } from "vitest";
import autoOptions from "./autoOptions";
import { getTestCases } from "./testUtils";

const svelteId = "test.svelte";

test("auto-options transform is a noop for non-svelte modules", async () => {
  const result = await autoOptions().transform("", "test.ts");
  expect(result).toBe(null);
});

for (const { name, input, output } of await getTestCases()) {
  test(`auto-options plugin correctly transforms ${name}`, async () => {
    const result = await autoOptions().transform(input, svelteId);
    assert(result);
    expect(result.code).toBe(output);
  });
}
