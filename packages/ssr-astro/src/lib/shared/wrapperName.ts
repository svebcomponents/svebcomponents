/**
 * The component name custom element tags are rewritten to, and the prop the
 * original tag name is passed through.
 *
 * Kept in its own module so the Astro integration can reference them without
 * pulling in the Vite plugin's build-time dependencies.
 */
export const WRAPPER_COMPONENT_NAME = "SvebcomponentsCustomElement";

export const TAG_NAME_PROP = "_tagName";
