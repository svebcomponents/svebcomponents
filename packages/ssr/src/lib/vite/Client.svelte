<script lang="ts">
  import type { Snippet } from "svelte";

  interface WebComponentWrapperProps {
    children: Snippet;
    _tagName: string;
    [key: string]: unknown;
  }

  let {
    children,
    _tagName: tag,
    ...props
  }: WebComponentWrapperProps = $props();
</script>

<p>client</p>
<svelte:element this={tag} {...props}>
  {@render children()}
</svelte:element>
