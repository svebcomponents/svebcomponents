import { describe, expect, test } from "vitest";

import { analyzeComponent } from "./analyze.js";
import { parseJsDoc } from "./metadata.js";

const analyze = (source: string) => {
  const result = analyzeComponent(source, "Test.svelte");
  if (!result) throw new Error("expected the component to be analyzed");
  return result;
};

describe("tag name", () => {
  test("is read from the object form", () => {
    expect(
      analyze(`<svelte:options customElement={{ tag: 'my-el' }} />`).tagName,
    ).toBe("my-el");
  });

  test("is read from the string shorthand", () => {
    expect(analyze(`<svelte:options customElement="my-el" />`).tagName).toBe(
      "my-el",
    );
  });

  test("is read alongside other custom element options", () => {
    expect(
      analyze(
        `<svelte:options customElement={{ shadow: 'none', tag: 'my-el', props: { a: { type: 'Number' } } }} />`,
      ).tagName,
    ).toBe("my-el");
  });

  test("is null for a component that declares no custom element", () => {
    expect(analyze(`<p>hi</p>`).tagName).toBeNull();
  });

  test("is null when the object form omits a tag", () => {
    // svelte rejects a non-literal `tag` outright ("Tag name must be lowercase
    // and hyphenated"), so an unresolvable tag is impossible — absent is the
    // only way there is no tag to record
    expect(
      analyze(`<svelte:options customElement={{ shadow: 'none' }} />`).tagName,
    ).toBeNull();
  });
});

describe("component description", () => {
  test("is read from the @component comment", () => {
    const { metadata } = analyze(
      `<!-- @component A friendly button. -->\n<button>go</button>`,
    );
    expect(metadata.description).toBe("A friendly button.");
  });

  test("is absent when no @component comment exists", () => {
    const { metadata } = analyze(`<!-- just a note -->\n<button>go</button>`);
    expect(metadata.description).toBeUndefined();
  });
});

describe("props", () => {
  const source = `<svelte:options customElement={{ tag: 'my-el' }} />
<script lang="ts">
  interface Props {
    /** The visible label. */
    label: string;
    /** How many times to repeat. */
    count?: number;
    onSelect?: (value: string) => void;
  }
  let { label, count = 3, onSelect }: Props = $props();
</script>
<button>{label}</button>`;

  test("carry their JSDoc description", () => {
    const { metadata } = analyze(source);
    const label = metadata.props.find((prop) => prop.name === "label");
    expect(label?.description).toBe("The visible label.");
  });

  test("carry the declared TypeScript type verbatim", () => {
    const { metadata } = analyze(source);
    expect(metadata.props.find((prop) => prop.name === "count")?.typeText).toBe(
      "number",
    );
    expect(
      metadata.props.find((prop) => prop.name === "onSelect")?.typeText,
    ).toBe("(value: string) => void");
  });

  test("carry their default value expression", () => {
    const { metadata } = analyze(source);
    expect(metadata.props.find((prop) => prop.name === "count")?.default).toBe(
      "3",
    );
  });

  test("mark function props as property-only with no attribute", () => {
    const { metadata } = analyze(source);
    const onSelect = metadata.props.find((prop) => prop.name === "onSelect");
    expect(onSelect?.propertyOnly).toBe(true);
    expect(onSelect?.attribute).toBeUndefined();
  });

  test("kebab-case the attribute name of serializable props", () => {
    const { metadata } = analyze(`<script lang="ts">
  let { myLabel }: { myLabel: string } = $props();
</script>`);
    expect(
      metadata.props.find((prop) => prop.name === "myLabel")?.attribute,
    ).toBe("my-label");
  });

  test("record optionality from the type annotation", () => {
    const { metadata } = analyze(source);
    expect(metadata.props.find((prop) => prop.name === "label")?.optional).toBe(
      false,
    );
    expect(metadata.props.find((prop) => prop.name === "count")?.optional).toBe(
      true,
    );
  });
});

describe("slots", () => {
  test("collects the default and named slots", () => {
    const { metadata } = analyze(`<div><slot /><slot name="footer" /></div>`);
    expect(metadata.slots.map((slot) => slot.name).sort()).toEqual([
      "",
      "footer",
    ]);
  });

  test("deduplicates repeated slot names", () => {
    const { metadata } = analyze(
      `<div><slot name="a" /><slot name="a" /></div>`,
    );
    expect(metadata.slots).toHaveLength(1);
  });

  test("skips dynamically named slots", () => {
    const { metadata } = analyze(
      `<script>const n = 'x';</script><slot name={n} />`,
    );
    expect(metadata.slots).toHaveLength(0);
  });

  test("takes descriptions from @slot tags", () => {
    const { metadata } = analyze(
      `<!-- @component\n@slot footer - The bottom area.\n-->\n<slot name="footer" />`,
    );
    expect(metadata.slots).toEqual([
      { name: "footer", description: "The bottom area." },
    ]);
  });
});

describe("events", () => {
  test("collects an event dispatched on $host()", () => {
    const { metadata } = analyze(`<script lang="ts">
  const emit = () => $host().dispatchEvent(new CustomEvent("change"));
</script>`);
    expect(metadata.events).toEqual([{ name: "change" }]);
  });

  test("captures the explicit detail type verbatim", () => {
    const { metadata } = analyze(`<script lang="ts">
  interface Detail { id: string }
  const emit = () =>
    $host().dispatchEvent(new CustomEvent<Detail>("change", { detail: { id: "a" } }));
</script>`);
    expect(metadata.events).toEqual([
      { name: "change", detailTypeText: "Detail" },
    ]);
  });

  test("captures an inline detail type", () => {
    const { metadata } = analyze(`<script lang="ts">
  const emit = () =>
    $host().dispatchEvent(new CustomEvent<{ id: string }>("change"));
</script>`);
    expect(metadata.events[0]?.detailTypeText).toBe("{ id: string }");
  });

  test("omits the detail type when it is only inferred from the value", () => {
    const { metadata } = analyze(`<script lang="ts">
  const emit = () =>
    $host().dispatchEvent(new CustomEvent("change", { detail: { id: "a" } }));
</script>`);
    expect(metadata.events[0]?.detailTypeText).toBeUndefined();
  });

  test("follows optional chaining and template expressions", () => {
    const { metadata } = analyze(
      `<button onclick={() => $host()?.dispatchEvent(new CustomEvent("go"))}>go</button>`,
    );
    expect(metadata.events).toEqual([{ name: "go" }]);
  });

  test("follows a $host() alias", () => {
    const { metadata } = analyze(`<script lang="ts">
  const host = $host();
  const emit = () => host.dispatchEvent(new CustomEvent("aliased"));
</script>`);
    expect(metadata.events).toEqual([{ name: "aliased" }]);
  });

  test("ignores dispatches on unrelated elements", () => {
    const { metadata } = analyze(`<script lang="ts">
  const emit = () => document.body.dispatchEvent(new CustomEvent("nope"));
</script>`);
    expect(metadata.events).toHaveLength(0);
  });

  test("ignores non-literal event names", () => {
    const { metadata } = analyze(`<script lang="ts">
  const name = "dynamic";
  const emit = () => $host().dispatchEvent(new CustomEvent(name));
</script>`);
    expect(metadata.events).toHaveLength(0);
  });

  test("takes descriptions from @event tags", () => {
    const { metadata } = analyze(
      `<!-- @component\n@event change - Fired on change.\n-->\n<script lang="ts">
  const emit = () => $host().dispatchEvent(new CustomEvent("change"));
</script>`,
    );
    expect(metadata.events).toEqual([
      { name: "change", description: "Fired on change." },
    ]);
  });
});

describe("css custom properties", () => {
  test("collects properties the component reads but does not define", () => {
    const { metadata } = analyze(
      `<div>hi</div><style>div { color: var(--my-color); }</style>`,
    );
    expect(metadata.cssProperties).toEqual([{ name: "--my-color" }]);
  });

  test("records the fallback as the default", () => {
    const { metadata } = analyze(
      `<div>hi</div><style>div { color: var(--my-color, red); }</style>`,
    );
    expect(metadata.cssProperties).toEqual([
      { name: "--my-color", default: "red" },
    ]);
  });

  test("omits properties the component defines itself", () => {
    const { metadata } = analyze(
      `<div>hi</div><style>div { --internal: 2px; padding: var(--internal); }</style>`,
    );
    expect(metadata.cssProperties).toHaveLength(0);
  });

  test("takes descriptions from @cssprop tags", () => {
    const { metadata } = analyze(
      `<!-- @component\n@cssprop --my-color - The text colour.\n-->\n<div>hi</div><style>div { color: var(--my-color); }</style>`,
    );
    expect(metadata.cssProperties).toEqual([
      { name: "--my-color", description: "The text colour." },
    ]);
  });

  test("accepts an undocumented property declared only via @cssproperty", () => {
    const { metadata } = analyze(
      `<!-- @component\n@cssproperty --themed - Set by a theme.\n-->\n<div>hi</div>`,
    );
    expect(metadata.cssProperties).toEqual([
      { name: "--themed", description: "Set by a theme." },
    ]);
  });
});

describe("parseJsDoc", () => {
  test("separates the description from tags", () => {
    expect(parseJsDoc("* A thing.\n * @slot footer - Bottom.\n ")).toEqual({
      description: "A thing.",
      tags: [{ tag: "slot", value: "footer - Bottom." }],
    });
  });

  test("continues a tag value across lines", () => {
    expect(parseJsDoc("* @event go - Fired\n * when clicked.\n ").tags).toEqual(
      [{ tag: "event", value: "go - Fired\nwhen clicked." }],
    );
  });
});

describe("opt-out", () => {
  test("returns null for components carrying the ignore marker", () => {
    expect(
      analyzeComponent(
        `<!-- svebcomponents:auto-options-ignore -->\n<p>hi</p>`,
        "Ignored.svelte",
      ),
    ).toBeNull();
  });
});
