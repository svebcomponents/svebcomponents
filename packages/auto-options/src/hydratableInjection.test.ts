import { assert, expect, test } from "vitest";
import autoOptions from "./autoOptions";

const svelteId = "test.svelte";

const component = `<script lang="ts">
  let { title }: { title: string } = $props();
</script>

<h1>{title}</h1>
`;

const transform = (code: string) =>
  autoOptions({ hydratable: true }).transform(code, svelteId);

test("injects the hydratable extend and both imports", async () => {
  const result = await transform(component);
  assert(result);

  expect(result.code).toContain(
    'import { hydratable as __svebcomponentsHydratable } from "@svebcomponents/ssr/hydration";',
  );
  expect(result.code).toContain(
    'import __svebcomponentsHydrationHost from "@svebcomponents/ssr/hydration-host";',
  );
  expect(result.code).toContain(
    "extend: (ceClass) => __svebcomponentsHydratable(ceClass, __svebcomponentsHydrationHost)",
  );
  // the imports must land inside the instance script
  expect(result.code.indexOf("import { hydratable")).toBeGreaterThan(
    result.code.indexOf("<script"),
  );
  // props inference still works alongside the extend injection
  expect(result.code).toContain('title: {attribute: "title"');
});

test("injects extend into existing customElement options", async () => {
  const withOptions = `<svelte:options customElement={{ props: { title: { attribute: "title", reflect: false, type: "String" } } }} />
${component}`;
  const result = await transform(withOptions);
  assert(result);

  expect(result.code).toContain("extend: (ceClass) =>");
  // no second customElement attribute may be created
  expect(result.code.match(/customElement=\{\{/g)).toHaveLength(1);
});

test("respects a user-provided extend", async () => {
  const withExtend = `<svelte:options customElement={{ extend: (Class) => Class }} />
${component}`;
  const result = await transform(withExtend);
  assert(result);

  expect(result.code).not.toContain("__svebcomponentsHydratable");
  expect(result.code).not.toContain("@svebcomponents/ssr/hydration");
  // props are still inferred and injected
  expect(result.code).toContain('title: {attribute: "title"');
});

test("injects extend even when the component has no props", async () => {
  const propless = `<script lang="ts">
  const doubled = 2 * 2;
</script>

<p>{doubled}</p>
`;
  const result = await transform(propless);
  assert(result);

  expect(result.code).toContain(
    "extend: (ceClass) => __svebcomponentsHydratable(ceClass, __svebcomponentsHydrationHost)",
  );
  expect(result.code).not.toContain("props:");
});

test("skips modules carrying the ignore pragma", async () => {
  const ignored = `<!-- svebcomponents:auto-options-ignore -->
${component}`;
  const result = await transform(ignored);
  expect(result).toBe(null);
});

test("does not inject anything when hydratable is off and there are no props", async () => {
  const propless = `<script lang="ts">
  const doubled = 2 * 2;
</script>

<p>{doubled}</p>
`;
  const result = await autoOptions().transform(propless, svelteId);
  expect(result).toBe(null);
});
