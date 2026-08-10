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
import {
  renderComponentDefaultExport,
  renderCoreDeclarations,
  renderSvelteAugmentation,
  requiresSvelte,
} from "./elementTypes.js";

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
  const components = (await fs.readdir(path.join(workspace, "src"))).filter(
    (file) => file.endsWith(".svelte"),
  );
  const sources = await findComponentSources(workspace, [
    ...components.map((file) => ({ entry: `src/${file}` })),
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
  it("follows the entry's imports, including nested modules", async () => {
    await fs.mkdir(path.join(workspace, "src", "nested"), { recursive: true });
    await fs.writeFile(
      path.join(workspace, "src", "nested", "B.svelte"),
      `<svelte:options customElement="b-el" />`,
      "utf8",
    );
    await fs.writeFile(
      path.join(workspace, "src", "nested", "index.ts"),
      `import B from "./B.svelte";\nexport { B };`,
      "utf8",
    );
    await fs.writeFile(
      path.join(workspace, "src", "A.svelte"),
      `<svelte:options customElement="a-el" />\n<script>import "./nested/index.js";</script>`,
      "utf8",
    );
    const sources = await findComponentSources(workspace, [
      { entry: "src/A.svelte" },
    ]);
    expect(sources.map((source) => path.basename(source)).sort()).toEqual([
      "A.svelte",
      "B.svelte",
    ]);
  });

  it("leaves out a component the entry never imports", async () => {
    await writeComponent("A.svelte", `<svelte:options customElement="a-el" />`);
    await fs.writeFile(
      path.join(workspace, "src", "Orphan.svelte"),
      `<svelte:options customElement="orphan-el" />`,
      "utf8",
    );
    const sources = await findComponentSources(workspace, [
      { entry: "src/A.svelte" },
    ]);
    expect(sources.map((source) => path.basename(source))).toEqual([
      "A.svelte",
    ]);
  });

  it("ignores an entry directory that does not exist", async () => {
    await expect(
      findComponentSources(workspace, [{ entry: "nope/Element.svelte" }]),
    ).resolves.toEqual([]);
  });

  it("does not classify an ordinary module by walking its imports", async () => {
    await writeComponent("Element.svelte", BUTTON);
    await fs.writeFile(
      path.join(workspace, "src", "helpers.ts"),
      `import "./Element.svelte";`,
      "utf8",
    );
    await expect(
      findComponentSources(workspace, [{ entry: "src/helpers.ts" }]),
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
    renderCoreDeclarations(await analyzeWorkspace(), workspace, workspace);

  it("maps the tag to the element interface", async () => {
    await writeComponent("Element.svelte", BUTTON);
    const output = await render();
    expect(output).toContain('"my-button": MyButtonElement;');
    expect(output).toContain("interface HTMLElementTagNameMap");
  });

  it("renders the direct component module's default constructor", async () => {
    await writeComponent("Element.svelte", BUTTON);
    const [component] = await analyzeWorkspace();
    expect(renderComponentDefaultExport(component!)).toBe(
      "declare const MyButton: {\n  new (): MyButtonElement;\n};\n\nexport default MyButton;",
    );
  });

  it("keeps framework augmentations out of the module's own types", async () => {
    await writeComponent("Element.svelte", BUTTON);
    const output = await render();
    // these import from their framework, so they must stay opt-in — a
    // svelte-only consumer must never be made to resolve `vue`
    expect(output).not.toContain('declare module "svelte/elements"');
    expect(output).not.toContain('declare module "vue"');
    expect(output).not.toContain('from "react"');
  });

  it("leaves literal types whose value spells a local type name alone", async () => {
    // `qualifyLocalTypes` rewrites references to inlined local types, but a
    // string literal is a value, not a reference. Rewriting it would advertise
    // a type the component cannot actually be given: `mode="Detail"` — the
    // value it accepts — would stop type-checking.
    await writeComponent(
      "Element.svelte",
      `<svelte:options customElement={{ tag: 'my-widget' }} />
<script lang="ts">
  interface Detail { id: string }
  type Mode = "Detail" | "summary";
  interface Props {
    mode: Mode;
    onpick?: (detail: Detail) => void;
  }
  let { mode, onpick }: Props = $props();
</script>
<button>{mode}</button>`,
    );
    const output = await render();
    expect(output).toContain('type MyWidget$Mode = "Detail" | "summary";');
    expect(output).not.toContain('"MyWidget$Detail"');
    // the genuine type *reference* is still qualified
    expect(output).toContain("interface MyWidget$Detail");
    expect(output).toContain("(detail: MyWidget$Detail) => void");
  });

  it("does not re-qualify a name a previous rewrite just introduced", async () => {
    // `Wrapper` is rewritten to `MyWidget$Wrapper`, which puts the literal text
    // `MyWidget` — itself a local type name — into the output. Replacing names
    // one after another would then match it again and yield
    // `MyWidget$MyWidget$Wrapper`. Matching every name in a single alternation
    // is what makes each position rewritten exactly once.
    await writeComponent(
      "Element.svelte",
      `<svelte:options customElement={{ tag: 'my-widget' }} />
<script lang="ts">
  type Wrapper = { inner: MyWidget };
  interface MyWidget { id: string }
  interface Props { detail: Wrapper }
  let { detail }: Props = $props();
</script>
<span>{detail.inner.id}</span>`,
    );
    const output = await render();
    expect(output).toContain("type MyWidget$Wrapper");
    expect(output).not.toContain("MyWidget$MyWidget$Wrapper");
    expect(output).toContain("inner: MyWidget$MyWidget");
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

  it("exposes property-only props on the element interface", async () => {
    await writeComponent("Element.svelte", BUTTON);
    expect(await render()).toContain("onPick?: (value: string) => void;");
  });

  it("exports a typed event map for addEventListener", async () => {
    await writeComponent("Element.svelte", BUTTON);
    const output = await render();
    expect(output).toContain("export interface MyButtonEventMap {");
    expect(output).toContain(
      "addEventListener<K extends keyof MyButtonEventMap>",
    );
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

/**
 * Spinning up the TypeScript compiler is seconds-scale work even for one
 * file, and a shared CI runner is several times slower than a dev machine —
 * well past vitest's 5s default.
 */
const COMPILER_TIMEOUT_MS = 60_000;

describe("generated declarations compile", () => {
  /**
   * Type-checks the emitted file with the real compiler. The declarations are
   * only useful if they are valid TypeScript in a consumer's project, and the
   * inlining, qualification and `Omit` handling are all easy to get subtly
   * wrong in ways no string assertion would catch.
   */
  const expectCompiles = async (output: string) => {
    const ts = await import("typescript");
    const file = path.join(workspace, "custom-elements.d.ts");
    await fs.writeFile(file, output, "utf8");

    const program = ts.createProgram([file], {
      strict: true,
      noEmit: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      lib: ["lib.es2022.d.ts", "lib.dom.d.ts"],
      skipLibCheck: false,
      types: [],
    });
    // Diagnostics are requested for this one file rather than via
    // `getPreEmitDiagnostics`, which computes them for every file in the
    // program — including the whole DOM lib, since `skipLibCheck` has to stay
    // off for a `.d.ts` under test to be checked at all.
    const source = program.getSourceFile(file);
    const diagnostics = [
      ...program.getSyntacticDiagnostics(source),
      ...program.getSemanticDiagnostics(source),
    ].map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, " "),
    );
    expect(diagnostics).toEqual([]);
  };

  it(
    "compiles a component with events, local types and imports",
    async () => {
      await fs.writeFile(
        path.join(workspace, "src", "types.ts"),
        `export interface Size { width: number }`,
        "utf8",
      );
      await writeComponent(
        "Element.svelte",
        BUTTON.replace(
          `<script lang="ts">`,
          `<script lang="ts">\n  import type { Size } from "./types.js";`,
        ).replace("count?: number;", "count?: number;\n    size?: Size;"),
      );
      await expectCompiles(
        renderCoreDeclarations(await analyzeWorkspace(), workspace, workspace),
      );
    },
    COMPILER_TIMEOUT_MS,
  );

  it(
    "compiles a component whose prop shadows a built-in DOM property",
    async () => {
      await writeComponent(
        "Element.svelte",
        `<svelte:options customElement={{ tag: 'titled-el' }} />
<script lang="ts">
  let { title, hidden }: { title: number; hidden: string } = $props();
</script>`,
      );
      await expectCompiles(
        renderCoreDeclarations(await analyzeWorkspace(), workspace, workspace),
      );
    },
    COMPILER_TIMEOUT_MS,
  );

  it(
    "compiles several components in one file",
    async () => {
      await writeComponent("A.svelte", BUTTON);
      await writeComponent(
        "B.svelte",
        BUTTON.replace("my-button", "other-button"),
      );
      await expectCompiles(
        renderCoreDeclarations(await analyzeWorkspace(), workspace, workspace),
      );
    },
    COMPILER_TIMEOUT_MS,
  );

  it(
    "compiles a complete direct component module declaration",
    async () => {
      await writeComponent("Element.svelte", BUTTON);
      const components = await analyzeWorkspace();
      await expectCompiles(
        `${renderCoreDeclarations(components, workspace, workspace)}\n${renderComponentDefaultExport(components[0]!)}`,
      );
    },
    COMPILER_TIMEOUT_MS,
  );
});

describe("exported building blocks", () => {
  const render = async () =>
    renderCoreDeclarations(await analyzeWorkspace(), workspace, workspace);

  it("exports the attributes a template may set", async () => {
    await writeComponent("Element.svelte", BUTTON);
    const output = await render();
    expect(output).toContain("export interface MyButtonAttributes {");
    expect(output).toContain('"count"?: number | string;');
    // a string-typed attribute needs no widening
    expect(output).toContain('"label"?: string;');
  });

  it("exports handler props for dispatched events", async () => {
    await writeComponent("Element.svelte", BUTTON);
    const output = await render();
    expect(output).toContain("export interface MyButtonEventHandlers {");
    expect(output).toContain(
      '"onchange"?: (event: CustomEvent<MyButton$ChangeDetail>) => void;',
    );
  });

  it("keeps property-only props out of the attributes", async () => {
    await writeComponent("Element.svelte", BUTTON);
    const output = await render();
    const attributes = output.slice(
      output.indexOf("export interface MyButtonAttributes {"),
    );
    // `onPick={fn}` in a template is event-handler syntax, not a property
    // assignment, so it must not look settable from markup
    expect(attributes).not.toContain("onPick");
    expect(output).toContain("onPick?: (value: string) => void;");
  });

  it("omits the interfaces entirely when there is nothing to describe", async () => {
    await writeComponent(
      "Element.svelte",
      `<svelte:options customElement="bare-el" />`,
    );
    const output = await render();
    expect(output).not.toContain("Attributes {");
    expect(output).not.toContain("EventHandlers {");
  });
});

describe("documented augmentation recipes", () => {
  /**
   * The recipes in the docs are the product now that no framework
   * augmentation is generated, so they are type-checked here against the real
   * `svelte/elements` rather than left to rot in prose.
   */
  const checkWithSvelte = async (recipe: string) => {
    const ts = await import("typescript");
    // inside the package, so a bare `svelte/elements` resolves through this
    // package's own node_modules the way a consumer's would
    const scratch = await fs.mkdtemp(
      path.join(path.resolve(import.meta.dirname, ".."), ".recipe-check-"),
    );
    const core = path.join(scratch, "elements.d.ts");
    const usage = path.join(scratch, "augmentation.ts");
    await fs.writeFile(
      core,
      renderCoreDeclarations(await analyzeWorkspace(), workspace, workspace),
      "utf8",
    );
    await fs.writeFile(usage, recipe, "utf8");

    const program = ts.createProgram([core, usage], {
      strict: true,
      noEmit: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      lib: ["lib.es2022.d.ts", "lib.dom.d.ts"],
      skipLibCheck: true,
    });
    const source = program.getSourceFile(usage);
    const diagnostics = [
      ...program.getSyntacticDiagnostics(source),
      ...program.getSemanticDiagnostics(source),
    ].map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, " "),
    );
    await fs.rm(scratch, { recursive: true, force: true });
    return diagnostics;
  };

  it(
    "the svelte recipe type-checks against svelte/elements",
    async () => {
      await writeComponent("Element.svelte", BUTTON);
      const diagnostics = await checkWithSvelte(`
import type { HTMLAttributes } from "svelte/elements";
import type {
  MyButtonElement,
  MyButtonAttributes,
  MyButtonEventHandlers,
} from "./elements.js";

declare module "svelte/elements" {
  interface SvelteHTMLElements {
    "my-button": HTMLAttributes<MyButtonElement> &
      MyButtonAttributes &
      MyButtonEventHandlers;
  }
}

export {};
`);
      expect(diagnostics).toEqual([]);
    },
    COMPILER_TIMEOUT_MS,
  );
});

describe("requiresSvelte", () => {
  it("is true for a runtime dependency", () => {
    expect(requiresSvelte({ dependencies: { svelte: "^5" } })).toBe(true);
  });

  it("is true for a plain peer dependency", () => {
    expect(requiresSvelte({ peerDependencies: { svelte: "^5" } })).toBe(true);
  });

  it("is false for an optional peer dependency", () => {
    // an optional peer may simply be absent, which is precisely the consumer
    // the `svelte/elements` import would break
    expect(
      requiresSvelte({
        peerDependencies: { svelte: "^5" },
        peerDependenciesMeta: { svelte: { optional: true } },
      }),
    ).toBe(false);
  });

  it("is false when svelte is only a dev dependency", () => {
    expect(requiresSvelte({ devDependencies: { svelte: "^5" } })).toBe(false);
  });

  it("is false for a package.json it cannot read", () => {
    expect(requiresSvelte(undefined)).toBe(false);
  });
});

describe("renderSvelteAugmentation", () => {
  const render = async () =>
    renderSvelteAugmentation(await analyzeWorkspace(), workspace, workspace);

  it("composes HTMLAttributes so class and id keep working", async () => {
    await writeComponent("Element.svelte", BUTTON);
    const output = await render();
    expect(output).toContain(
      'import type { HTMLAttributes as __SvebHTMLAttributes } from "svelte/elements";',
    );
    expect(output).toContain(
      '"my-button": __SvebHTMLAttributes<MyButtonElement> & {',
    );
  });

  it("exposes attributes and event handlers", async () => {
    await writeComponent("Element.svelte", BUTTON);
    const output = await render();
    expect(output).toContain('"count"?: number | string;');
    expect(output).toContain(
      '"onchange"?: (event: CustomEvent<MyButton$ChangeDetail>) => void;',
    );
  });

  it("keeps property-only props off the template surface", async () => {
    await writeComponent("Element.svelte", BUTTON);
    expect(await render()).not.toContain("onPick");
  });

  it(
    "type-checks against the real svelte/elements",
    async () => {
      await writeComponent("Element.svelte", BUTTON);
      const components = await analyzeWorkspace();
      const ts = await import("typescript");
      const scratch = await fs.mkdtemp(
        path.join(path.resolve(import.meta.dirname, ".."), ".recipe-check-"),
      );
      const file = path.join(scratch, "elements.ts");
      await fs.writeFile(
        file,
        `${renderCoreDeclarations(components, scratch, workspace)}\n${renderSvelteAugmentation(components, scratch, workspace)}`,
        "utf8",
      );
      const program = ts.createProgram([file], {
        strict: true,
        noEmit: true,
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        lib: ["lib.es2022.d.ts", "lib.dom.d.ts"],
        skipLibCheck: true,
      });
      const source = program.getSourceFile(file);
      const diagnostics = [
        ...program.getSyntacticDiagnostics(source),
        ...program.getSemanticDiagnostics(source),
      ].map((diagnostic) =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, " "),
      );
      await fs.rm(scratch, { recursive: true, force: true });
      expect(diagnostics).toEqual([]);
    },
    COMPILER_TIMEOUT_MS,
  );
});
