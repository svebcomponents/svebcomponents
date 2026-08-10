<svelte:options customElement="sync-component" />

<script lang="ts">
  interface Props {
    title: string;
    count?: number;
    enabled?: boolean;
    // a rich prop with no attribute representation — exercises the
    // serialized-props channel for hydratable SSR
    meta?: { note: string } | undefined;
  }

  let { title, count = 0, enabled = true, meta = undefined }: Props = $props();
</script>

<div>
  <h1>{title}</h1>
  <p id="count">Count: {typeof count}-{count}</p>
  <p id="enabled">Enabled: {typeof enabled}-{enabled}</p>
  {#if meta}
    <p id="note">{meta.note}</p>
  {/if}
  <!-- exercises $host(): must reach the upgraded custom element on the
       client (hydrated AND fresh-mounted) and compile away during SSR -->
  <button
    id="emit"
    onclick={() =>
      $host()?.dispatchEvent(
        new CustomEvent("sync-emitted", { detail: "from-host" }),
      )}>emit</button
  >
</div>

<style>
  h1 {
    color: rgb(0, 128, 0);
  }
</style>
