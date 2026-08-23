<script lang="ts">
  import type { Snippet } from "svelte";

  import { partitionProps } from "../shared/customElementProps.js";

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

  // camelCase props cannot ride the spread below: svelte lowercases every
  // spread attribute name on an HTML-namespace element, and a lowercased
  // `showRoot` matches neither the observed attribute `show-root` nor the
  // element's `showRoot` setter. See ../shared/customElementProps.ts.
  const partitioned = $derived(partitionProps(props));

  /**
   * Assigns the props that have no attribute representation directly onto the
   * element, the way svelte's own `set_custom_element_data` does for a
   * compile-time-known custom element.
   *
   * Safe before the element upgrades: an own property set on a not-yet-
   * upgraded element is picked up on upgrade — by `hydratable`'s pre-upgrade
   * property porting, by svelte's own `SvelteElement.connectedCallback`, and
   * by every other custom-element base class that saves instance properties
   * (lit's `ReactiveElement` among them). Once upgraded, the assignment goes
   * through the element's prop setter as usual.
   */
  const assignProperties = (node: Element) => {
    for (const [name, value] of Object.entries(partitioned.properties)) {
      (node as unknown as Record<string, unknown>)[name] = value;
    }
  };
</script>

<!-- The element fragment below must stay structurally identical to
Server.svelte's and AsyncServer.svelte's — rendering the same svelte
constructs on both sides is what lets a hydrating Svelte host claim the
SSR'd custom element instead of re-creating it. The empty {@html ""} pairs
with the server's shadow-template block: the parser consumes the
<template shadowrootmode> into the shadow root before hydration, leaving
exactly an empty anchor pair for this block to claim. The attachment below
renders no DOM of its own, so it does not disturb that claim. -->
<!-- eslint-disable svelte/no-at-html-tags -- the value is a constant empty string -->
<svelte:element
  this={tag}
  {...partitioned.attributes}
  {@attach assignProperties}>{@html ""}{@render children?.()}</svelte:element
>
