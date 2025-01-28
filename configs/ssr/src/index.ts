import { render } from "svelte/server";
import type { Component } from "svelte";

export const renderSvelteWebComponent = (
  svelteComponent: Component,
  _props: Record<string, any>,
) => {
  // TODO: transform attributes to props if necessary
  render(svelteComponent, {});
};
