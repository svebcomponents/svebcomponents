<script lang="ts">
  import { BROWSER } from "esm-env";
  import type { Snippet } from "svelte";

  import Client from "./Client.svelte";
  import Server from "./Server.svelte";

  // eslint-disable-next-line svelte/no-unused-props -- we spread the props, so they are not unused
  let props: { _tagName: string; children: Snippet } = $props();
</script>

{#if BROWSER}
  <Client {...props} />
{:else}
  <Server {...props} />
{/if}
