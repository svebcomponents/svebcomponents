<script lang="ts">
  import type { Snippet } from "svelte";

  interface WebComponentWrapperProps {
    children?: Snippet;
    _tagName: string;
    [key: string]: unknown;
  }

  let {
    children,
    _tagName: tag,
    ...props
  }: WebComponentWrapperProps = $props();
</script>

<!-- The element fragment below must stay structurally identical to
Server.svelte's and AsyncServer.svelte's — rendering the same svelte
constructs on both sides is what lets a hydrating Svelte host claim the
SSR'd custom element instead of re-creating it. The empty {@html ""} pairs
with the server's shadow-template block: the parser consumes the
<template shadowrootmode> into the shadow root before hydration, leaving
exactly an empty anchor pair for this block to claim. -->
<!-- eslint-disable svelte/no-at-html-tags -- the value is a constant empty string -->
<svelte:element this={tag} {...props}
  >{@html ""}{@render children?.()}</svelte:element
>
