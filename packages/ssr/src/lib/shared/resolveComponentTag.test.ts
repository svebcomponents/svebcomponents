import { expect, test, describe } from "vitest";
import { extractComponentTag } from "./resolveComponentTag.js";

describe("extractComponentTag", () => {
  test("extracts a string-shorthand tag", () => {
    const source = `<svelte:options customElement="my-tag" />\n<script></script>`;
    expect(extractComponentTag(source)).toBe("my-tag");
  });

  test("extracts an object-form tag", () => {
    const source = `<svelte:options customElement={{ tag: "my-tag", shadow: "none" }} />\n<script></script>`;
    expect(extractComponentTag(source)).toBe("my-tag");
  });

  test("returns undefined when customElement has no tag", () => {
    const source = `<svelte:options customElement={{}} />\n<script></script>`;
    expect(extractComponentTag(source)).toBeUndefined();
  });

  test("returns undefined when there is no customElement option at all", () => {
    const source = `<script>let { title } = $props();</script>`;
    expect(extractComponentTag(source)).toBeUndefined();
  });

  test("returns undefined for a spec-reserved name that isn't a valid custom element", () => {
    const source = `<svelte:options customElement="font-face" />\n<script></script>`;
    expect(extractComponentTag(source)).toBeUndefined();
  });

  test("returns undefined when the source doesn't parse", () => {
    expect(
      extractComponentTag("<svelte:options customElement=/>"),
    ).toBeUndefined();
  });
});
