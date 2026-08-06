import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  analyzeComponentFiles,
  buildManifest,
  classNameFromTag,
  findComponentSources,
} from "./manifest.js";
import { renderDeclarations } from "./elementTypes.js";

let workspace: string;

beforeEach(async () => {
  workspace = await fs.mkdtemp(path.join(os.tmpdir(), "sveb-element-types-"));
  await fs.mkdir(path.join(workspace, "src"), { recursive: true });
});

afterEach(async () => {
  await fs.rm(workspace, { recursive: true, force: true });
});

const writeComponent = async (name: string, source: string) => {
  await fs.writeFile(path.join(workspace, "src", name), source, "utf8");
};

const analyzeWorkspace = async () => {
  const sources = await findComponentSources(workspace, [
    { entry: "src/index.ts" },
  ]);
  return analyzeComponentFiles(workspace, sources);
};

const BUTTON = `<svelte:options customElement={{ tag: 'my-button' }} />
<script lang="ts">
  interface ChangeDetail { value: string }
  interface Props {
    /** The visible label. */
    label: string;
    count?: number;
    onPick?: (value: string) => void;
  }
  let { label, count = 2, onPick }: Props = $props();
  const emit = () =>
    $host().dispatchEvent(new CustomEvent<ChangeDetail>("change", { detail: { value: label } }));
</script>
<button onclick={emit}>{label}</button>
<slot name="icon" />
<style>button { color: var(--my-color, red); }</style>`;

describe("classNameFromTag", () => {
  it("pascal-cases a hyphenated tag", () => {
    expect(classNameFromTag("my-fancy-button")).toBe("MyFancyButton");
  });

  it("tolerates repeated separators", () => {
    expect(classNameFromTag("my--button")).toBe("MyButton");
  });
});

describe("findComponentSources", () => {
  it("finds components below every entry's directory", async () => {
    await writeComponent("A.svelte", `<svelte:options customElement="a-el" />`);
    await fs.mkdir(path.join(workspace, "src", "nested"), { recursive: true });
    await fs.writeFile(
      path.join(workspace, "src", "nested", "B.svelte"),
      `<svelte:options customElement="b-el" />`,
      "utf8",
    );
    const sources = await findComponentSources(workspace, [
      { entry: "src/index.ts" },
    ]);
    expect(sources.map((source) => path.basename(source)).sort()).toEqual([
      "A.svelte",
      "B.svelte",
    ]);
  });

  it("ignores an entry directory that does not exist", async () => {
    await expect(
      findComponentSources(workspace, [{ entry: "nope/index.ts" }]),
    ).resolves.toEqual([]);
  });
});

describe("analyzeComponentFiles", () => {
  it("keeps only components that declare a custom element", async () => {
    await writeComponent("Element.svelte", BUTTON);
    await writeComponent("Helper.svelte", `<p>internal helper</p>`);
    const components = await analyzeWorkspace();
    expect(components.map((component) => component.tagName)).toEqual([
      "my-button",
    ]);
  });

  it("records a posix package-relative path", async () => {
    await writeComponent("Element.svelte", BUTTON);
    const [component] = await analyzeWorkspace();
    expect(component?.path).toBe("src/Element.svelte");
  });
});

describe("buildManifest", () => {
  it("describes the element's full surface", async () => {
    await writeComponent("Element.svelte", BUTTON);
    const manifest = buildManifest(await analyzeWorkspace());
    const declaration = manifest.modules[0]?.declarations[0];

    expect(manifest.schemaVersion).toBe("2.1.0");
    expect(declaration?.tagName).toBe("my-button");
    expect(declaration?.customElement).toBe(true);
    expect(declaration?.events).toEqual([
      { name: "change", type: { text: "CustomEvent<ChangeDetail>" } },
    ]);
    expect(declaration?.slots).toEqual([{ name: "icon" }]);
    expect(declaration?.cssProperties).toEqual([
      { name: "--my-color", default: "red" },
    ]);
  });

  it("exports a custom-element-definition tying the tag to the class", async () => {
    await writeComponent("Element.svelte", BUTTON);
    const manifest = buildManifest(await analyzeWorkspace());
    expect(manifest.modules[0]?.exports).toEqual([
      {
        kind: "custom-element-definition",
        name: "my-button",
        declaration: { name: "MyButton", module: "src/Element.svelte" },
      },
    ]);
  });

  it("omits the attribute half of property-only props", async () => {
    await writeComponent("Element.svelte", BUTTON);
    const manifest = buildManifest(await analyzeWorkspace());
    const declaration = manifest.modules[0]?.declarations[0];
    expect(
      declaration?.attributes?.map((attribute) => attribute.name),
    ).not.toContain("on-pick");
    const member = declaration?.members.find(
      (entry) => entry.name === "onPick",
    );
    expect(member).toBeDefined();
    expect(member).not.toHaveProperty("attribute");
  });

  it("types untyped props from the attribute converter", async () => {
    await writeComponent(
      "Element.svelte",
      `<svelte:options customElement={{ tag: 'plain-el', props: { count: { type: 'Number' } } }} />
<script>
  let { count = 0 } = $props();
</script>`,
    );
    const manifest = buildManifest(await analyzeWorkspace());
    expect(manifest.modules[0]?.declarations[0]?.members[0]).toMatchObject({
      name: "count",
      type: { text: "number" },
    });
  });
});

describe("renderDeclarations", () => {
  const render = async () =>
    renderDeclarations(await analyzeWorkspace(), workspace, workspace);

  it("maps the tag to the element interface", async () => {
    await writeComponent("Element.svelte", BUTTON);
    const output = await render();
    expect(output).toContain('"my-button": MyButtonElement;');
    expect(output).toContain("interface HTMLElementTagNameMap");
  });

  it("augments svelte, vue and react template surfaces", async () => {
    await writeComponent("Element.svelte", BUTTON);
    const output = await render();
    expect(output).toContain('declare module "svelte/elements"');
    expect(output).toContain('declare module "vue"');
    expect(output).toContain("namespace React");
  });

  it("inlines a referenced local type under a component-qualified name", async () => {
    await writeComponent("Element.svelte", BUTTON);
    const output = await render();
    expect(output).toContain("interface MyButton$ChangeDetail {");
    expect(output).toContain("CustomEvent<MyButton$ChangeDetail>");
  });

  it("leaves unreferenced local types out", async () => {
    await writeComponent("Element.svelte", BUTTON);
    const output = await render();
    // the `Props` interface names the props but is never itself part of a
    // generated signature
    expect(output).not.toContain("MyButton$Props");
  });

  it("keeps property-only props off the template surface", async () => {
    await writeComponent("Element.svelte", BUTTON);
    const output = await render();
    const [, templateHalf] = output.split('declare module "svelte/elements"');
    expect(output).toContain("onPick?: (value: string) => void;");
    expect(templateHalf).not.toContain("onPick");
  });

  it("exposes dispatched events as handler props and an event map", async () => {
    await writeComponent("Element.svelte", BUTTON);
    const output = await render();
    expect(output).toContain("interface MyButtonEventMap {");
    expect(output).toContain(
      '"onchange"?: (event: CustomEvent<MyButton$ChangeDetail>) => void;',
    );
  });

  it("lets a markup string satisfy a non-string attribute", async () => {
    await writeComponent("Element.svelte", BUTTON);
    const output = await render();
    expect(output).toContain('"count"?: number | string;');
    // a string-typed attribute needs no widening
    expect(output).toContain('"label"?: string;');
  });

  it("omits a shadowed built-in DOM property from the base interface", async () => {
    await writeComponent(
      "Element.svelte",
      `<svelte:options customElement={{ tag: 'titled-el' }} />
<script lang="ts">
  let { title }: { title: string } = $props();
</script>`,
    );
    expect(await render()).toContain(
      'export interface TitledElElement extends Omit<HTMLElement, "title">',
    );
  });

  it("re-emits an imported type with a rewritten specifier", async () => {
    await fs.writeFile(
      path.join(workspace, "src", "types.ts"),
      `export interface Size { width: number }`,
      "utf8",
    );
    await writeComponent(
      "Element.svelte",
      `<svelte:options customElement={{ tag: 'sized-el' }} />
<script lang="ts">
  import type { Size } from "./types.js";
  let { size }: { size?: Size } = $props();
</script>`,
    );
    expect(await render()).toContain(
      'import type { Size } from "./src/types.js";',
    );
  });

  it("carries prop descriptions into the generated declarations", async () => {
    await writeComponent("Element.svelte", BUTTON);
    expect(await render()).toContain("/** The visible label. */");
  });

  it("renders several components into one file", async () => {
    await writeComponent("A.svelte", `<svelte:options customElement="a-el" />`);
    await writeComponent("B.svelte", `<svelte:options customElement="b-el" />`);
    const output = await render();
    expect(output).toContain('"a-el": AElElement;');
    expect(output).toContain('"b-el": BElElement;');
  });
});
