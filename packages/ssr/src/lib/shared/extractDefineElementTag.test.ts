import { expect, test, describe } from "vitest";
import { extractDefineElementTag } from "./extractDefineElementTag.js";

describe("extractDefineElementTag", () => {
  test("extracts a double-quoted tag name", () => {
    const source = `
      import { defineElement } from "@svebcomponents/utils";
      import Component from "./Component.svelte";
      export default Component;
      defineElement("my-widget", Component);
    `;
    expect(extractDefineElementTag(source)).toBe("my-widget");
  });

  test("extracts a single-quoted tag name", () => {
    const source = `defineElement('my-widget', Component);`;
    expect(extractDefineElementTag(source)).toBe("my-widget");
  });

  test("returns undefined when there is no defineElement call", () => {
    const source = `export default Component;`;
    expect(extractDefineElementTag(source)).toBeUndefined();
  });

  test("returns undefined for a dynamically computed tag", () => {
    const source = `defineElement(tagName, Component);`;
    expect(extractDefineElementTag(source)).toBeUndefined();
  });

  test("returns undefined for a spec-reserved name that isn't a valid custom element", () => {
    const source = `defineElement("font-face", Component);`;
    expect(extractDefineElementTag(source)).toBeUndefined();
  });
});
