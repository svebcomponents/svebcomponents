import { expect, test, describe } from "vitest";
import { mustBeSetAsProperty, partitionProps } from "./customElementProps";

describe("mustBeSetAsProperty", () => {
  test.each(["showRoot", "threadData", "fetchedAt", "maxDepth", "staleTime"])(
    "is true for the camelCase prop name %s, which has no attribute form",
    (name) => {
      expect(mustBeSetAsProperty(name)).toBe(true);
    },
  );

  test.each(["class", "style", "id", "slot", "part", "title", "readonly"])(
    "is false for the all-lowercase attribute %s",
    (name) => {
      expect(mustBeSetAsProperty(name)).toBe(false);
    },
  );

  test.each(["show-root", "thread-data", "data-test-id", "aria-colindex"])(
    "is false for the kebab-case attribute %s, which survives lowercasing",
    (name) => {
      expect(mustBeSetAsProperty(name)).toBe(false);
    },
  );

  test("leaves event handlers to svelte, whatever their case", () => {
    expect(mustBeSetAsProperty("onclick")).toBe(false);
    // svelte would treat this as a listener for the "Click" event; wrong
    // either way, but not this wrapper's call to make
    expect(mustBeSetAsProperty("onClick")).toBe(false);
  });

  test("does not divert names that only look prototype-ish", () => {
    // these have no uppercase letter, so they keep travelling as attributes
    // exactly as they do today
    expect(mustBeSetAsProperty("__proto__")).toBe(false);
    expect(mustBeSetAsProperty("constructor")).toBe(false);
  });
});

describe("partitionProps", () => {
  test("splits a mixed prop bag into attributes and properties", () => {
    expect(
      partitionProps({
        thread: "at://example",
        threadData: { root: "post" },
        "show-root": true,
        showRoot: true,
        class: "panel",
        onclick: () => {},
      }),
    ).toEqual({
      attributes: {
        thread: "at://example",
        "show-root": true,
        class: "panel",
        onclick: expect.any(Function),
      },
      properties: {
        threadData: { root: "post" },
        showRoot: true,
      },
    });
  });

  test("keeps rich values intact rather than stringifying them", () => {
    const threadData = { root: { uri: "at://example" } };
    const { properties } = partitionProps({ threadData });
    // the spread would have produced the attribute `threaddata="[object
    // Object]"`, losing the value entirely
    expect(properties["threadData"]).toBe(threadData);
  });

  test("preserves authoring order within each half", () => {
    const { attributes, properties } = partitionProps({
      thread: "a",
      threadData: {},
      service: "b",
      fetchedAt: 1,
    });
    expect(Object.keys(attributes)).toEqual(["thread", "service"]);
    expect(Object.keys(properties)).toEqual(["threadData", "fetchedAt"]);
  });

  test("returns empty halves for an empty prop bag", () => {
    expect(partitionProps({})).toEqual({ attributes: {}, properties: {} });
  });
});
