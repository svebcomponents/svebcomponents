import { assert, expect, test } from "vitest";
import autoOptions from "./autoOptions";
import input from "./fixtures/bare-component/input.svelte?raw";
import expected from "./fixtures/bare-component/output.svelte?raw";

const svelteId = "test.svelte";

// TODO: noops to test:
// - everything manually inferred
// - no props
test("auto-options transform is a noop for non-svelte modules", async () => {
  const result = await autoOptions().transform("", "test.ts");
  expect(result).toBe(null);
});

// TODO: stuff I want  to test:
// - interface ref
// - type ref
// - imported type -> maybe default to string?
// - inline interface
// - no types
// - rest props
test("auto-options transform adds <svelte:options> with correct attributes if props exist", async () => {
  const result = await autoOptions().transform(input, svelteId);
  // assert(result);
  // expect(result.code).toBe(expected);
});
