<script lang="ts">
  interface Props {
    title: string;
    count?: number;
    enabled?: boolean;
    prepared?: { source: string };
  }

  let { title, count = 0, enabled = true, prepared }: Props = $props();

  const asyncLabel = await Promise.resolve("Async: resolved");
</script>

<div>
  <h1>{title}</h1>
  <p id="count">Count: {typeof count}-{count}</p>
  <p id="enabled">Enabled: {typeof enabled}-{enabled}</p>
  <p id="async-label">{asyncLabel}</p>
  <p id="prepared">Prepared: {prepared?.source ?? "none"}</p>
</div>
