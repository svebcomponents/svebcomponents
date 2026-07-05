import { expect, test, describe } from "vitest";
import {
  mayBeCustomElementTagName,
  isValidCustomElementTagName,
} from "./customElementName";

describe("mayBeCustomElementTagName", () => {
  test("is true for any tag name containing a dash", () => {
    expect(mayBeCustomElementTagName("my-element")).toBe(true);
    expect(mayBeCustomElementTagName("font-face")).toBe(true);
  });

  test("is false for tag names without a dash", () => {
    expect(mayBeCustomElementTagName("div")).toBe(false);
    expect(mayBeCustomElementTagName("svg")).toBe(false);
  });
});

describe("isValidCustomElementTagName", () => {
  test("accepts valid custom element tag names", () => {
    expect(isValidCustomElementTagName("my-element")).toBe(true);
    expect(isValidCustomElementTagName("x-foo-bar")).toBe(true);
  });

  test("rejects names that don't match the PotentialCustomElementName grammar", () => {
    expect(isValidCustomElementTagName("div")).toBe(false);
    expect(isValidCustomElementTagName("My-Element")).toBe(false);
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
  ])("rejects the spec-reserved SVG/MathML name %s", (reservedName) => {
    expect(isValidCustomElementTagName(reservedName)).toBe(false);
  });
});
