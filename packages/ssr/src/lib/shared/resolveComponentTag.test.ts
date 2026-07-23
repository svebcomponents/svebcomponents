import { expect, test, describe } from "vitest";
import {
  findSvelteImportPath,
  extractComponentTag,
} from "./resolveComponentTag.js";

describe("findSvelteImportPath", () => {
  test("finds a double-quoted relative .svelte import", () => {
    const source = `
      import Component from "./Component.svelte";
      export default Component;
    `;
    expect(findSvelteImportPath(source)).toBe("./Component.svelte");
  });

  test("finds a single-quoted relative .svelte import", () => {
    const source = `import Component from './Component.svelte';`;
    expect(findSvelteImportPath(source)).toBe("./Component.svelte");
  });

  test("finds a nested relative .svelte import", () => {
    const source = `import Component from "../components/Component.svelte";`;
    expect(findSvelteImportPath(source)).toBe(
      "../components/Component.svelte",
    );
  });

  test("returns undefined when there is no .svelte import", () => {
    const source = `import { defineElement } from "@svebcomponents/utils";`;
    expect(findSvelteImportPath(source)).toBeUndefined();
  });

  test("ignores a non-relative .svelte import", () => {
    const source = `import Component from "some-package/Component.svelte";`;
    expect(findSvelteImportPath(source)).toBeUndefined();
  });
});

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
    expect(extractComponentTag("<svelte:options customElement=/>")).toBeUndefined();
  });
});
