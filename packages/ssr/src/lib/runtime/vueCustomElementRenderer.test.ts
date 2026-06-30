import { expect, test, describe, vi } from "vitest";
import type { RenderInfo } from "@lit-labs/ssr";

import {
  VueCustomElementRenderer,
  type VueSsrComponent,
  type VueCustomElementClass,
} from "./vueCustomElementRenderer";

// ---- Test helpers --------------------------------------------------------

function makeCtor(def: VueSsrComponent = {}): VueCustomElementClass {
  return class VueCE {
    static _def = def;
  } as unknown as VueCustomElementClass;
}

type SsrRenderFn = NonNullable<VueSsrComponent["ssrRender"]>;
type SetupFn = NonNullable<VueSsrComponent["setup"]>;

function makeRenderer(
  ssrRenderFn: SsrRenderFn | null,
  def: VueSsrComponent = {},
): VueCustomElementRenderer {
  const component: VueSsrComponent = {
    ...(ssrRenderFn ? { ssrRender: ssrRenderFn } : {}),
    ...def,
  };
  return new VueCustomElementRenderer(component, makeCtor(def), "test-element");
}

function collectShadow(renderer: VueCustomElementRenderer): string {
  return Array.from(renderer.renderShadow({} as RenderInfo)).join("");
}

function collectAttrs(renderer: VueCustomElementRenderer): string {
  return Array.from(renderer.renderAttributes()).join("");
}

// ---- Attribute handling --------------------------------------------------

describe("setAttribute", () => {
  test("stores attribute for renderAttributes", () => {
    const renderer = makeRenderer(vi.fn(), {});
    renderer.setAttribute("title", "hello");
    expect(collectAttrs(renderer)).toContain(' title="hello"');
  });

  test("lowercases the attribute name", () => {
    const renderer = makeRenderer(vi.fn(), {});
    renderer.setAttribute("DATA-Test", "val");
    expect(collectAttrs(renderer)).toContain(" data-test=");
  });

  test("coerces Number prop from attribute string", () => {
    const push = vi.fn();
    const ssrRender: SsrRenderFn = (ctx: Record<string, unknown>) => {
      push(typeof (ctx as Record<string, unknown>)["count"]);
    };
    const renderer = makeRenderer(ssrRender, { props: { count: Number } });
    renderer.setAttribute("count", "42");
    collectShadow(renderer);
    expect(push).toHaveBeenCalledWith("number");
  });

  test("coerces Boolean prop — empty string becomes true", () => {
    const push = vi.fn();
    const ssrRender: SsrRenderFn = (ctx: Record<string, unknown>) => {
      push(String((ctx as Record<string, unknown>)["enabled"]));
    };
    const renderer = makeRenderer(ssrRender, { props: { enabled: Boolean } });
    renderer.setAttribute("enabled", "");
    collectShadow(renderer);
    expect(push).toHaveBeenCalledWith("true");
  });

  test("coerces Boolean prop — 'false' string becomes false", () => {
    const push = vi.fn();
    const ssrRender: SsrRenderFn = (ctx: Record<string, unknown>) => {
      push(String((ctx as Record<string, unknown>)["enabled"]));
    };
    const renderer = makeRenderer(ssrRender, { props: { enabled: Boolean } });
    renderer.setAttribute("enabled", "false");
    collectShadow(renderer);
    expect(push).toHaveBeenCalledWith("false");
  });

  test("converts kebab-case attribute to camelCase prop in ctx", () => {
    const push = vi.fn();
    const ssrRender: SsrRenderFn = (ctx: Record<string, unknown>) => {
      push(String((ctx as Record<string, unknown>)["myProp"]));
    };
    const renderer = makeRenderer(ssrRender, { props: { myProp: String } });
    renderer.setAttribute("my-prop", "world");
    collectShadow(renderer);
    expect(push).toHaveBeenCalledWith("world");
  });

  test("stores non-string value directly in props (bypasses ssrAttributes)", () => {
    const push = vi.fn();
    const ssrRender: SsrRenderFn = (ctx: Record<string, unknown>) => {
      push(JSON.stringify((ctx as Record<string, unknown>)["data"]));
    };
    const renderer = makeRenderer(ssrRender, {});
    const obj = { x: 1 };
    renderer.setAttribute("data", obj as unknown as string);
    // non-string goes straight to props, not ssrAttributes
    expect(collectAttrs(renderer)).toBe("");
    collectShadow(renderer);
    expect(push).toHaveBeenCalledWith('{"x":1}');
  });

  test("handles array-form props definition (no type coercion)", () => {
    const push = vi.fn();
    const ssrRender: SsrRenderFn = (ctx: Record<string, unknown>) => {
      push(String((ctx as Record<string, unknown>)["label"]));
    };
    const renderer = makeRenderer(ssrRender, { props: ["label", "count"] });
    renderer.setAttribute("label", "test-label");
    collectShadow(renderer);
    expect(push).toHaveBeenCalledWith("test-label");
  });
});

// ---- setProperty --------------------------------------------------------

describe("setProperty", () => {
  test("passes value directly into SSR ctx", () => {
    const push = vi.fn();
    const ssrRender: SsrRenderFn = (ctx: Record<string, unknown>) => {
      push(JSON.stringify((ctx as Record<string, unknown>)["items"]));
    };
    const renderer = makeRenderer(ssrRender, {});
    renderer.setProperty("items", [1, 2, 3]);
    collectShadow(renderer);
    expect(push).toHaveBeenCalledWith("[1,2,3]");
  });
});

// ---- renderAttributes ---------------------------------------------------

describe("renderAttributes", () => {
  test("escapes hostile attribute values", () => {
    const renderer = makeRenderer(vi.fn(), {});
    renderer.setAttribute("data-x", `"><img src=x onerror=alert(1)>`);
    const out = collectAttrs(renderer);
    expect(out).not.toContain("<img");
    expect(out).toContain("&lt;img src=x onerror=alert(1)>");
  });

  test("throws on invalid attribute names", () => {
    const renderer = makeRenderer(vi.fn(), {});
    renderer.setAttribute(`title" onclick="x`, "v");
    expect(() => collectAttrs(renderer)).toThrow("Invalid SSR attribute name");
  });

  test("emits boolean attribute (empty string value) correctly", () => {
    const renderer = makeRenderer(vi.fn(), {});
    renderer.setAttribute("disabled", "");
    expect(collectAttrs(renderer)).toContain(" disabled");
  });
});

// ---- renderShadow -------------------------------------------------------

describe("renderShadow", () => {
  test("calls ssrRender with merged ctx and yields chunks", () => {
    const ssrRender: SsrRenderFn = (ctx: unknown, push) => {
      const c = ctx as Record<string, unknown>;
      push(`<div>${c["title"]}-${c["count"]}</div>`);
    };
    const renderer = makeRenderer(ssrRender, {});
    renderer.setAttribute("title", "SSR");
    renderer.setProperty("count", 7);
    expect(collectShadow(renderer)).toBe("<div>SSR-7</div>");
  });

  test("injects styles before content", () => {
    const ssrRender: SsrRenderFn = (_, push) => push("<p>body</p>");
    const renderer = makeRenderer(ssrRender, {
      styles: ["h1{color:red}", "p{margin:0}"],
    });
    const shadow = collectShadow(renderer);
    expect(shadow.indexOf("<style>")).toBeLessThan(shadow.indexOf("<p>body</p>"));
    expect(shadow).toContain("h1{color:red}\np{margin:0}");
  });

  test("skips style tag when styles array is empty", () => {
    const ssrRender: SsrRenderFn = (_, push) => push("<p/>");
    const renderer = makeRenderer(ssrRender, { styles: [] });
    expect(collectShadow(renderer)).not.toContain("<style>");
  });

  test("throws when ssrRender is absent", () => {
    const renderer = makeRenderer(null, {});
    expect(() => collectShadow(renderer)).toThrow("missing ssrRender");
  });

  // ---- setup() integration ----------------------------------------------

  test("calls setup() with plain props copy and merges result into ctx", () => {
    const setup: SetupFn = (props) => ({
      doubled: (props["count"] as number) * 2,
    });
    const ssrRender: SsrRenderFn = (ctx: unknown, push) => {
      push(String((ctx as Record<string, unknown>)["doubled"]));
    };
    const renderer = new VueCustomElementRenderer(
      { ssrRender, setup },
      makeCtor({ setup }),
      "test-element",
    );
    renderer.setProperty("count", 5);
    expect(collectShadow(renderer)).toBe("10");
  });

  test("setup() return values shadow props with the same name", () => {
    const setup: SetupFn = () => ({ title: "from-setup" });
    const ssrRender: SsrRenderFn = (ctx: unknown, push) => {
      push(String((ctx as Record<string, unknown>)["title"]));
    };
    const renderer = new VueCustomElementRenderer(
      { ssrRender, setup },
      makeCtor({ setup }),
      "test-element",
    );
    renderer.setAttribute("title", "from-prop");
    expect(collectShadow(renderer)).toBe("from-setup");
  });

  test("unwraps Vue ref objects (__v_isRef) in ctx", () => {
    const fakeRef = { __v_isRef: true, value: "unwrapped-value" };
    const setup: SetupFn = () => ({ msg: fakeRef as unknown as string });
    const ssrRender: SsrRenderFn = (ctx: unknown, push) => {
      push(String((ctx as Record<string, unknown>)["msg"]));
    };
    const renderer = new VueCustomElementRenderer(
      { ssrRender, setup },
      makeCtor({ setup }),
      "test-element",
    );
    expect(collectShadow(renderer)).toBe("unwrapped-value");
  });

  test("does not unwrap plain objects that happen to have .value", () => {
    const notARef = { value: "should-not-unwrap" };
    const setup: SetupFn = () => ({ obj: notARef });
    const ssrRender: SsrRenderFn = (ctx: unknown, push) => {
      push(JSON.stringify((ctx as Record<string, unknown>)["obj"]));
    };
    const renderer = new VueCustomElementRenderer(
      { ssrRender, setup },
      makeCtor({ setup }),
      "test-element",
    );
    expect(collectShadow(renderer)).toBe('{"value":"should-not-unwrap"}');
  });

  test("throws when setup() returns a Promise (async setup not supported)", () => {
    const setup = () => Promise.resolve({ foo: "bar" }) as unknown as void;
    const ssrRender = vi.fn();
    const renderer = new VueCustomElementRenderer(
      { ssrRender, setup },
      makeCtor({ setup }),
      "test-element",
    );
    expect(() => collectShadow(renderer)).toThrow(
      "Async setup() is not supported",
    );
  });
});
