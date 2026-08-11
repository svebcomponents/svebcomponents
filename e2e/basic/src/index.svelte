<svelte:options customElement={{
  tag: 'simple-component',
  props: {
    count: {
      type: 'Number',
    },
    enabled: {
      type: 'Boolean',
    }
  }
}} />

<script lang="ts">
  // `@svebcomponents/utils` is a declared `dependency` of this package, which
  // is what tsdown externalizes by default. The browser output has no module
  // resolver, so importing it here is what proves the build inlines it anyway —
  // see test/bundle.test.ts.
  import { kebabize } from "@svebcomponents/utils";

  let { title, count = 0, enabled = true } = $props();

  const slug = $derived(kebabize(title ?? ""));
</script>

<div>
  <h1>{title}</h1>
  <p id="count">Count: {typeof count}-{count}</p>
  <p id="enabled">Enabled: {typeof enabled}-{enabled}</p>
  <p id="slug">{slug}</p>
</div>
