import { expect, test, describe } from "vitest";
import { isValidCustomElementTagName } from "./html";

describe("isValidCustomElementTagName", () => {
  test("accepts valid custom element tag names", () => {
    expect(isValidCustomElementTagName("my-element")).toBe(true);
    expect(isValidCustomElementTagName("x-foo-bar")).toBe(true);
    expect(isValidCustomElementTagName("a-1")).toBe(true);
  });

  test("rejects tag names without a dash", () => {
    expect(isValidCustomElementTagName("div")).toBe(false);
    expect(isValidCustomElementTagName("myelement")).toBe(false);
  });

  test("rejects tag names starting with an uppercase letter or non-letter", () => {
    expect(isValidCustomElementTagName("My-Element")).toBe(false);
    expect(isValidCustomElementTagName("1-element")).toBe(false);
    expect(isValidCustomElementTagName("-element")).toBe(false);
  });

  // @see https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name
  test.each([
    "annotation-xml",
    "color-profile",
    "font-face",
    "font-face-src",
    "font-face-uri",
    "font-face-format",
    "font-face-name",
    "missing-glyph",
  ])(
    "rejects the spec-reserved SVG/MathML name %s despite matching the dash grammar",
    (reservedName) => {
      expect(isValidCustomElementTagName(reservedName)).toBe(false);
    },
  );
});
