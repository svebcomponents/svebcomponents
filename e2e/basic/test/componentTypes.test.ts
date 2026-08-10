import { expect, test } from "vitest";
import type Component from "@svebcomponents/e2e.basic";
import type { SimpleComponentElement } from "@svebcomponents/e2e.basic";

type DefaultInstance = InstanceType<typeof Component>;
const defaultExportMatchesElement: DefaultInstance extends SimpleComponentElement
  ? true
  : false = true;

test("the direct component declaration types its default constructor", () => {
  expect(defaultExportMatchesElement).toBe(true);
});
