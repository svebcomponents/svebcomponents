import type { RenderInfo } from "@lit-labs/ssr";

import type { ElementRendererCtor } from "./types.js";

/**
 * Builds a valid Lit `RenderInfo` for rendering one custom element.
 *
 * `ElementRenderer.renderShadow()` receives this, and a renderer whose shadow
 * content is itself a template — `LitElementRenderer`, which calls
 * `renderValue(value, renderInfo)` — genuinely reads it. Passing a stub works
 * only for renderers that ignore it, which is why this used to be the reason
 * "arbitrary Lit renderers are not supported".
 *
 * `elementRenderers` matters beyond the element being rendered: nested custom
 * elements inside that element's shadow content are resolved through this same
 * list, so a Lit element containing another custom element renders correctly
 * only if the list is complete.
 */
export const createRenderInfo = (
  elementRenderers: ElementRendererCtor[],
): RenderInfo => ({
  elementRenderers: elementRenderers as RenderInfo["elementRenderers"],
  // The element being rendered is pushed by the caller when it needs to appear
  // as its own children's host; for a single element render the stacks simply
  // start empty.
  customElementInstanceStack: [],
  customElementHostStack: [],
  eventTargetStack: [],
  slotStack: [],
  deferHydration: false,
});
