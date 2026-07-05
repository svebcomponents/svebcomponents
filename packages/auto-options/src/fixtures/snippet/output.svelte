<svelte:options customElement={{
props: {
title: {attribute: "title", reflect: true, type: "String"},
}
}} />
<script lang="ts">
  import type { Snippet } from "svelte";
  interface Props {
    title: string;
    children?: Snippet;
  }
  let props: Props = $props();
</script>
<h1>{props.title}</h1>
{@render props.children?.()}
