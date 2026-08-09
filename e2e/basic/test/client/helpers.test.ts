import { expect, test } from "vitest";
import { formatLabel } from "@svebcomponents/e2e.basic/helpers";

test("ordinary modules are built without the custom-element pipeline", () => {
  expect(formatLabel("working")).toBe("Label: working");
});
