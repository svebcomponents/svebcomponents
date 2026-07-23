import { expect, test, describe } from "vitest";
import { parseAst } from "rolldown/parseAst";
import pluginGuardCustomElementDefine from "./pluginGuardCustomElementDefine";

/** A minimal stand-in for rolldown's `PluginContext`: only `parse` is used. */
const fakeContext = { parse: (code: string) => parseAst(code) };

const plugin = pluginGuardCustomElementDefine();
const renderChunkFn = plugin.renderChunk as (
  this: typeof fakeContext,
  code: string,
) => { code: string; map: unknown } | null;

const renderChunk = (code: string) => renderChunkFn.call(fakeContext, code);

describe("pluginGuardCustomElementDefine", () => {
  test("wraps a top-level customElements.define call in a guard", () => {
    const code = `class Foo extends HTMLElement {}\ncustomElements.define("my-tag", Foo);\nexport default Foo;`;
    const result = renderChunk(code);
    expect(result).not.toBeNull();
    expect(result?.code).toContain(
      'customElements.get("my-tag") || customElements.define("my-tag", __svebcomponentsCeArg0_0)',
    );
    expect(result?.code).toContain(
      "const __svebcomponentsCeArg0_0 = Foo;",
    );
  });

  test("preserves the exact tag-argument text verbatim, including template literals", () => {
    const code = "customElements.define(`my-tag`, Foo);";
    const result = renderChunk(code);
    expect(result?.code).toContain(
      "customElements.get(`my-tag`) || customElements.define(`my-tag`, __svebcomponentsCeArg0_0)",
    );
  });

  test("hoists the second argument's evaluation so it always runs, even when the define is skipped", () => {
    // shaped like Svelte's real output: the second argument is a call with a
    // side effect (setting Component.element) the module depends on
    const code = `customElements.define("my-tag", createCustomElement(Foo, {}));`;
    const result = renderChunk(code);
    expect(result?.code).toContain(
      "const __svebcomponentsCeArg0_0 = createCustomElement(Foo, {});",
    );
    expect(result?.code).toContain(
      'customElements.get("my-tag") || customElements.define("my-tag", __svebcomponentsCeArg0_0)',
    );
  });

  test("wraps every matching call when a chunk bundles multiple components, without name collisions", () => {
    const code = `customElements.define("tag-one", make(A));\ncustomElements.define("tag-two", make(B));`;
    const result = renderChunk(code);
    expect(result?.code).toContain("const __svebcomponentsCeArg0_0 = make(A);");
    expect(result?.code).toContain("const __svebcomponentsCeArg1_0 = make(B);");
    expect(result?.code).toContain(
      'customElements.get("tag-one") || customElements.define("tag-one", __svebcomponentsCeArg0_0)',
    );
    expect(result?.code).toContain(
      'customElements.get("tag-two") || customElements.define("tag-two", __svebcomponentsCeArg1_0)',
    );
  });

  test("no-ops when there is no customElements.define call", () => {
    const code = `class Foo extends HTMLElement {}\nexport default Foo;`;
    const result = renderChunk(code);
    expect(result).toBeNull();
  });

  test("no-ops on an unrelated customElements method call", () => {
    const code = `customElements.upgrade(document.body);`;
    const result = renderChunk(code);
    expect(result).toBeNull();
  });

  test("does not touch a nested (non-top-level) customElements.define call", () => {
    const code = `function register() { customElements.define("my-tag", class {}); }`;
    const result = renderChunk(code);
    expect(result).toBeNull();
  });

  test("end-to-end: the guarded module can be evaluated twice without throwing, and the side-effecting argument still runs both times", () => {
    // Shaped like Svelte's real compiled output (confirmed empirically
    // against this repo's own e2e/basic build, and against svelte's own
    // create_custom_element source, which mutates its first argument to set
    // `.element`): a class, then a top-level
    // `customElements.define(tag, createCustomElement(...))` call.
    const code = `
      const Foo = {};
      function createCustomElement(Component) {
        Component.element = class extends HTMLElement {};
        return Component.element;
      }
      customElements.define("e2e-guard-test", createCustomElement(Foo));
      export default Foo;
    `;
    const result = renderChunk(code);
    expect(result).not.toBeNull();

    const registry = new Map<string, unknown>();
    const fakeCustomElements = {
      define: (tag: string, ctor: unknown) => {
        if (registry.has(tag)) {
          throw new Error(
            `Failed to execute 'define' on 'CustomElementRegistry': the name "${tag}" has already been used with this registry`,
          );
        }
        registry.set(tag, ctor);
      },
      get: (tag: string) => registry.get(tag),
    };
    class FakeHTMLElement {}
    const moduleBody = result!.code.replace(/^\s*export default .+;\s*$/m, "");
    const evaluate = new Function(
      "customElements",
      "HTMLElement",
      `${moduleBody}\nreturn Foo;`,
    );

    // The unguarded original would throw the second time; the guarded
    // version must not, AND `Foo.element` must be set both times (the
    // side effect the guard must not accidentally skip).
    const firstFoo = evaluate(fakeCustomElements, FakeHTMLElement);
    expect(firstFoo.element).toBeDefined();
    const secondFoo = evaluate(fakeCustomElements, FakeHTMLElement);
    expect(secondFoo.element).toBeDefined();
    expect(registry.has("e2e-guard-test")).toBe(true);
  });
});
