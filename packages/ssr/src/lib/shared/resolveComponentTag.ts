import { parse } from "svelte/compiler";
import { isValidCustomElementTagName } from "./customElementName.js";

/**
 * Best-effort: reads a component's declared custom element tag from its
 * `.svelte` source, via `svelte/compiler`'s `parse()` — which normalizes
 * `<svelte:options customElement="tag-name" />` (the string-shorthand form)
 * and `<svelte:options customElement={{ tag: "tag-name" }} />` (the object
 * form) to the same `{ tag }` shape, so both are handled identically here.
 *
 * Returns `undefined` when the component doesn't declare a tag at all (e.g.
 * a shared base component not meant to be its own custom element) or the
 * source doesn't parse — callers should fail open to manual registration
 * (`ElementRendererRegistry.set()`) in that case, not error the build.
 */
export const extractComponentTag = (
  svelteSource: string,
): string | undefined => {
  let tag: string | undefined;
  try {
    tag = parse(svelteSource, { modern: true }).options?.customElement?.tag;
  } catch {
    return undefined;
  }
  return tag && isValidCustomElementTagName(tag) ? tag : undefined;
};
